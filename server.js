/**
 * SnowBall — serveur Express.
 *
 *  - Sert l'interface web (public/).
 *  - GET /api/assets            → catalogue des actifs + hypothèses.
 *  - GET /api/prices?currency=  → prix spot en direct (CoinGecko pour les
 *    cryptos, Yahoo Finance pour ETF/actions), avec cache mémoire de 5 min
 *    et repli sur les instantanés du catalogue si les API sont injoignables.
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS, INFLATION } from './lib/assets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const CACHE_TTL_MS = 5 * 60 * 1000;
const priceCache = new Map(); // currency -> { at, prices }

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'snowball/0.1 (open source portfolio projector)' },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCryptoPrices(ids, currency) {
  const url =
    'https://api.coingecko.com/api/v3/simple/price?ids=' +
    encodeURIComponent(ids.join(',')) +
    '&vs_currencies=' +
    encodeURIComponent(currency);
  return fetchJson(url);
}

async function fetchYahooQuote(symbol) {
  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(symbol) +
    '?range=1d&interval=1d';
  const data = await fetchJson(url);
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== 'number') {
    throw new Error(`No price in Yahoo response for ${symbol}`);
  }
  return { price: meta.regularMarketPrice, currency: (meta.currency || 'USD').toUpperCase() };
}

async function fetchEurUsd() {
  const { price } = await fetchYahooQuote('EURUSD=X');
  return price; // 1 EUR = price USD
}

/**
 * Construit { assetId: { price, currency, live } } dans la devise demandée.
 * Chaque actif retombe individuellement sur son instantané si sa source échoue.
 */
async function getPrices(currency) {
  const cached = priceCache.get(currency);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.prices;

  const cryptos = ASSETS.filter((a) => a.priceSource.type === 'coingecko');
  const yahoos = ASSETS.filter((a) => a.priceSource.type === 'yahoo');

  const [cryptoRes, eurUsdRes, ...yahooRes] = await Promise.allSettled([
    fetchCryptoPrices(cryptos.map((a) => a.priceSource.symbol), currency),
    fetchEurUsd(),
    ...yahoos.map((a) => fetchYahooQuote(a.priceSource.symbol)),
  ]);

  const eurUsd = eurUsdRes.status === 'fulfilled' ? eurUsdRes.value : 1.09;
  const prices = {};

  for (const asset of cryptos) {
    const live =
      cryptoRes.status === 'fulfilled'
        ? cryptoRes.value?.[asset.priceSource.symbol]?.[currency]
        : undefined;
    prices[asset.id] =
      typeof live === 'number'
        ? { price: live, currency, live: true }
        : { price: asset.spotPrice[currency], currency, live: false };
  }

  yahoos.forEach((asset, i) => {
    const res = yahooRes[i];
    if (res.status === 'fulfilled') {
      let { price, currency: quoteCcy } = res.value;
      if (currency === 'eur' && quoteCcy === 'USD') price = price / eurUsd;
      else if (currency === 'usd' && quoteCcy === 'EUR') price = price * eurUsd;
      prices[asset.id] = { price, currency, live: true };
    } else {
      prices[asset.id] = { price: asset.spotPrice[currency], currency, live: false };
    }
  });

  priceCache.set(currency, { at: Date.now(), prices });
  return prices;
}

app.get('/api/assets', (_req, res) => {
  res.json({ inflation: INFLATION, assets: ASSETS });
});

app.get('/api/prices', async (req, res) => {
  const currency = req.query.currency === 'usd' ? 'usd' : 'eur';
  try {
    res.json({ currency, prices: await getPrices(currency) });
  } catch (err) {
    // Repli global : instantanés du catalogue.
    const prices = {};
    for (const a of ASSETS) {
      prices[a.id] = { price: a.spotPrice[currency], currency, live: false };
    }
    res.json({ currency, prices, error: String(err?.message || err) });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
// Le moteur de projection est un module ES pur : on le sert tel quel au
// navigateur pour que l'UI et les tests utilisent exactement le même code.
app.use('/lib', express.static(path.join(__dirname, 'lib')));

app.listen(PORT, () => {
  console.log(`❄️ SnowBall roule sur http://localhost:${PORT}`);
});
