/**
 * Catalogue des actifs pré-configurés.
 *
 * Les hypothèses de rendement sont dérivées des performances historiques
 * documentées et sourcées dans docs/RESEARCH.md (données arrêtées à
 * juillet 2026). Ce sont des CAGR (rendements géométriques annualisés)
 * NOMINAUX, dividendes réinvestis quand applicable.
 *
 * Trois scénarios par actif :
 *  - conservative : estimation prospective basse (rendement réel long terme
 *    + inflation pour les actions ; fourchettes basses des études
 *    prospectives sérieuses pour les cryptos, cf. E*TRADE / VanEck).
 *  - moderate     : ancrage sur l'historique le plus long disponible
 *    (S&P 500 depuis 1957, or depuis 1971, Nasdaq depuis 1999…) ou sur le
 *    cas de base prospectif pour les cryptos.
 *  - historical   : CAGR observé sur les 10 dernières années (2016-2026).
 *    Pour les cryptos, extrapoler ce chiffre suppose que la décennie
 *    d'adoption précoce se répète — voir docs/RESEARCH.md.
 *
 * `color` est un slot FIXE de la palette (l'identité de couleur suit
 * l'actif, jamais son rang dans la sélection). `spotPrice` est un
 * instantané de secours (juillet 2026) utilisé quand les API de prix
 * (CoinGecko / Yahoo Finance) sont inaccessibles.
 */

export const INFLATION = 0.025; // convention : ~2,5 %/an (US ~3 %, zone euro ~2 %)

export const ASSETS = [
  {
    id: 'sp500',
    name: 'S&P 500 (ETF)',
    ticker: 'SPY',
    kind: 'etf',
    color: 1,
    scenarios: { conservative: 0.065, moderate: 0.104, historical: 0.137 },
    vol: 0.16,
    spotPrice: { usd: 640, eur: 587 },
    priceSource: { type: 'yahoo', symbol: 'SPY' },
    note: '10,4 %/an nominal depuis 1957 (dividendes réinvestis) ; 13,7 %/an sur les 10 dernières années.',
  },
  {
    id: 'btc',
    name: 'Bitcoin',
    ticker: 'BTC',
    kind: 'crypto',
    color: 2,
    scenarios: { conservative: 0.05, moderate: 0.15, historical: 0.59 },
    vol: 0.6,
    spotPrice: { usd: 65859, eur: 60420 },
    priceSource: { type: 'coingecko', symbol: 'bitcoin' },
    note: 'CAGR ≈ 59 %/an sur 10 ans… mais ≈ 15 %/an seulement sur 5 ans : les rendements décroissent fortement à mesure que l’actif mûrit.',
  },
  {
    id: 'msciworld',
    name: 'MSCI World (ETF)',
    ticker: 'IWDA',
    kind: 'etf',
    color: 3,
    scenarios: { conservative: 0.055, moderate: 0.089, historical: 0.149 },
    vol: 0.15,
    spotPrice: { usd: 125, eur: 115 },
    priceSource: { type: 'yahoo', symbol: 'IWDA.AS' },
    note: '8,9 %/an (USD, 1986-2025) ; 14,9 %/an sur les 10 dernières années (factsheet MSCI, juin 2026).',
  },
  {
    id: 'gold',
    name: 'Or',
    ticker: 'GLD',
    kind: 'commodity',
    color: 4,
    scenarios: { conservative: 0.03, moderate: 0.079, historical: 0.119 },
    vol: 0.15,
    spotPrice: { usd: 378, eur: 347 },
    priceSource: { type: 'yahoo', symbol: 'GLD' },
    note: '≈ 8 %/an depuis 1971 (fin de Bretton Woods) ; ≈ 12 %/an sur 10 ans, once à ~4 100 $ en juillet 2026.',
  },
  {
    id: 'eth',
    name: 'Ethereum',
    ticker: 'ETH',
    kind: 'crypto',
    color: 5,
    scenarios: { conservative: 0.02, moderate: 0.10, historical: 0.65 },
    vol: 0.75,
    spotPrice: { usd: 1870, eur: 1716 },
    priceSource: { type: 'coingecko', symbol: 'ethereum' },
    note: '≈ 65 %/an sur 10 ans, mais ≈ 0 %/an sur les 5 dernières années (~2 000 $ en 2021 → ~1 870 $ en 2026).',
  },
  {
    id: 'nvda',
    name: 'Nvidia',
    ticker: 'NVDA',
    kind: 'stock',
    color: 6,
    scenarios: { conservative: 0.08, moderate: 0.20, historical: 0.67 },
    vol: 0.5,
    spotPrice: { usd: 170, eur: 156 },
    priceSource: { type: 'yahoo', symbol: 'NVDA' },
    note: '≈ 67 %/an sur 10 ans (+17 783 % au total) — une trajectoire exceptionnelle, non extrapolable telle quelle.',
  },
  {
    id: 'nasdaq',
    name: 'Nasdaq-100 (ETF)',
    ticker: 'QQQ',
    kind: 'etf',
    color: 7,
    scenarios: { conservative: 0.065, moderate: 0.105, historical: 0.221 },
    vol: 0.19,
    spotPrice: { usd: 580, eur: 532 },
    priceSource: { type: 'yahoo', symbol: 'QQQ' },
    note: '22,1 %/an sur 10 ans… mais 10,5 %/an seulement depuis 1999, éclatement de la bulle dot-com inclus.',
  },
  {
    id: 'bonds',
    name: 'Obligations US (AGG)',
    ticker: 'AGG',
    kind: 'bond',
    color: 8,
    scenarios: { conservative: 0.015, moderate: 0.02, historical: 0.02 },
    vol: 0.05,
    spotPrice: { usd: 100, eur: 92 },
    priceSource: { type: 'yahoo', symbol: 'AGG' },
    note: 'Référence prudente : ≈ 2 %/an sur les 10 dernières années (dont -13 % en 2022).',
  },
];

export function getAsset(id) {
  return ASSETS.find((a) => a.id === id);
}
