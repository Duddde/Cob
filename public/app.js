/* SnowBall — logique de l'interface.
   Le moteur de calcul est partagé avec le serveur et les tests : /lib/projection.js */

import {
  projectWithDividends,
  projectPortfolio,
  projectPortfolioPercentiles,
  totalInvested,
  toRealTerms,
} from '/lib/projection.js';

// ---------------------------------------------------------------- état

const state = {
  capital: 10000,
  monthly: 0,
  years: 20,
  scenario: 'historical',
  currency: 'eur',
  real: false,
  log: true, // avec des CAGR crypto à 2 chiffres, l'échelle linéaire écrase tout le reste
  divMode: 'acc', // 'acc' = ETF capitalisants (dividendes réinvestis), 'dist' = distribuants
  selected: ['btc', 'sp500', 'msciworld'],
  weights: { btc: 1 / 3, sp500: 1 / 3, msciworld: 1 / 3 }, // parts du capital, somme = 1
};

let CATALOG = [];
let INFLATION = 0.025;
let PRICES = {}; // { assetId: { price, currency, live } }

const $ = (id) => document.getElementById(id);
const BASE_YEAR = new Date().getFullYear();
const MILESTONES = [5, 10, 15, 20];
const MC_PATHS = 1200; // assez pour une bande stable, assez peu pour rester fluide au curseur

// ---------------------------------------------------------------- formats

const sym = () => (state.currency === 'usd' ? '$' : '€');
const nfInt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

function fmtMoney(v) {
  return `${nfInt.format(v)} ${sym()}`;
}

function fmtCompact(v) {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${nf1.format(v / 1e9)} Md${sym()}`;
  if (abs >= 1e6) return `${nf1.format(v / 1e6)} M${sym()}`;
  if (abs >= 1e4) return `${nfInt.format(v / 1e3)} k${sym()}`;
  if (abs >= 1e3) return `${nf1.format(v / 1e3)} k${sym()}`;
  return fmtMoney(v);
}

function fmtPct(r) {
  return `${nf1.format(r * 100)} %`;
}

// (les cryptos s'achètent en fractions ; on montre 4 décimales significatives)
function fmtUnits(units) {
  if (units >= 1000) return nfInt.format(units);
  if (units >= 1) return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(units);
  return new Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 4 }).format(units);
}

const seriesColor = (slot) => `var(--series-${slot})`;
const PORTFOLIO_COLOR = 'var(--text-primary)'; // le portefeuille est la série vedette : encre

// ---------------------------------------------------------------- répartition

function selectedAssets() {
  return state.selected.map((id) => CATALOG.find((a) => a.id === id)).filter(Boolean);
}

/** Poids normalisés (somme = 1) des actifs sélectionnés. */
function getWeights() {
  const ids = state.selected;
  if (!ids.length) return {};
  let sum = 0;
  const w = {};
  for (const id of ids) {
    w[id] = Math.max(0, state.weights[id] ?? 1 / ids.length);
    sum += w[id];
  }
  if (sum <= 0) for (const id of ids) w[id] = 1 / ids.length;
  else for (const id of ids) w[id] /= sum;
  return w;
}

/** Fixe le poids d'un actif et redistribue le reste au prorata des autres. */
function setWeight(id, w) {
  w = Math.min(1, Math.max(0, w));
  const cur = getWeights();
  const others = state.selected.filter((x) => x !== id);
  cur[id] = others.length ? w : 1;
  const restOld = others.reduce((s, x) => s + cur[x], 0);
  for (const x of others) {
    cur[x] = restOld > 0 ? (cur[x] / restOld) * (1 - cur[id]) : (1 - cur[id]) / others.length;
  }
  Object.assign(state.weights, cur);
}

function equalizeWeights() {
  const n = state.selected.length;
  for (const id of state.selected) state.weights[id] = n ? 1 / n : 0;
}

// ---------------------------------------------------------------- calculs

function scenarioCagr(asset) {
  return asset.scenarios[state.scenario];
}

function deflate(values) {
  return state.real ? toRealTerms(values, INFLATION) : values;
}

/** L'actif verse-t-il ses dividendes en cash dans le mode courant ? */
function isDistributing(asset) {
  return state.divMode === 'dist' && (asset.dividendYield || 0) > 0;
}

/** Les poches du portefeuille : une allocation par actif sélectionné. */
function allocations(overrides = {}) {
  const w = getWeights();
  return selectedAssets().map((asset) => ({
    asset,
    weight: w[asset.id],
    capital: state.capital * w[asset.id],
    monthly: state.monthly * w[asset.id],
    cagr: scenarioCagr(asset),
    vol: asset.vol,
    dividendYield: asset.dividendYield || 0,
    reinvest: !isDistributing(asset),
    ...overrides,
  }));
}

/**
 * Tout ce qu'affiche l'écran : portefeuille (somme des poches), poches par
 * actif, versements cumulés — déflatés si « pouvoir d'achat constant ».
 */
function computeAll(years = state.years) {
  const allocs = allocations();
  const port = projectPortfolio({ allocations: allocs, years });
  const series = allocs.map((a, i) => ({
    asset: a.asset,
    weight: a.weight,
    dist: !a.reinvest,
    values: deflate(port.perAsset[i].total),
    dividends: deflate(port.perAsset[i].dividends),
  }));
  return {
    portfolio: { values: deflate(port.total), dividends: deflate(port.dividends) },
    series,
    invested: deflate(totalInvested({ capital: state.capital, monthly: state.monthly, years })),
  };
}

/** Bande p10–p90 (Monte Carlo) du portefeuille. */
function computeBand() {
  if (!state.selected.length) return null;
  const pct = projectPortfolioPercentiles({
    allocations: allocations(),
    years: state.years,
    percentiles: [10, 90],
    paths: MC_PATHS,
  });
  return { p10: deflate(pct.p10), p90: deflate(pct.p90) };
}

// ---------------------------------------------------------------- sélecteur d'actifs

function renderPicker() {
  const box = $('asset-picker');
  box.replaceChildren();
  for (const asset of CATALOG) {
    const on = state.selected.includes(asset.id);
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.type = 'button';
    btn.style.setProperty('--c', seriesColor(asset.color));
    btn.setAttribute('aria-pressed', String(on));
    const dot = document.createElement('span');
    dot.className = 'dot';
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = on ? '−' : '+';
    btn.append(dot, document.createTextNode(asset.name), mark);
    btn.addEventListener('click', () => {
      const i = state.selected.indexOf(asset.id);
      if (i >= 0) {
        state.selected.splice(i, 1);
      } else {
        state.selected.push(asset.id);
        // le nouvel arrivant prend une part égale, les autres se resserrent
        setWeight(asset.id, 1 / state.selected.length);
      }
      renderPicker();
      render();
    });
    box.append(btn);
  }
}

// ---------------------------------------------------------------- répartition (UI)

// Références vers les éléments du panneau, pour les mettre à jour EN PLACE
// pendant un glissement : reconstruire le DOM détruirait le curseur en cours
// de drag et interromprait le geste.
let allocEls = {}; // { assetId: { slider, pct, amount, seg } }

/** Rafraîchit curseurs, %, montants et barre sans reconstruire le DOM. */
function updateAllocUI(draggingId = null) {
  const w = getWeights();
  for (const [id, els] of Object.entries(allocEls)) {
    if (w[id] === undefined) continue;
    // on ne touche pas au curseur que l'utilisateur tient, sinon le pouce saute
    if (id !== draggingId) els.slider.value = String(Math.round(w[id] * 100));
    els.pct.textContent = `${Math.round(w[id] * 100)} %`;
    els.amount.textContent = fmtCompact(state.capital * w[id]);
    els.seg.style.width = `${w[id] * 100}%`;
    els.seg.title = `${els.name} : ${fmtPct(w[id])}`;
  }
}

function renderAlloc() {
  const card = $('alloc');
  const assets = selectedAssets();
  allocEls = {};
  if (!assets.length) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  const w = getWeights();
  $('alloc-sub').textContent =
    `${fmtMoney(state.capital)} répartis sur ${assets.length} actif${assets.length > 1 ? 's' : ''}` +
    (state.monthly > 0 ? ` (et ${fmtMoney(state.monthly)}/mois suivant la même répartition)` : '') +
    '. Glissez les curseurs pour ajuster.';

  // Barre empilée de la répartition
  const bar = $('alloc-bar');
  bar.replaceChildren();
  const segs = {};
  for (const asset of assets) {
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.style.width = `${w[asset.id] * 100}%`;
    seg.style.background = seriesColor(asset.color);
    seg.title = `${asset.name} : ${fmtPct(w[asset.id])}`;
    bar.append(seg);
    segs[asset.id] = seg;
  }

  // Une ligne par actif : pastille + nom | curseur | % | montant
  const rows = $('alloc-rows');
  rows.replaceChildren();
  for (const asset of assets) {
    const row = document.createElement('div');
    row.className = 'alloc-row';
    row.style.setProperty('--c', seriesColor(asset.color));

    const name = document.createElement('label');
    name.className = 'a-name';
    name.htmlFor = `w-${asset.id}`;
    const dot = document.createElement('span');
    dot.className = 'dot';
    name.append(dot, document.createTextNode(asset.name));

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `w-${asset.id}`;
    slider.min = '0';
    slider.max = '100';
    slider.step = '1';
    slider.value = String(Math.round(w[asset.id] * 100));
    slider.addEventListener('input', () => {
      setWeight(asset.id, Number(slider.value) / 100);
      updateAllocUI(asset.id); // en place : le drag continue
      scheduleResults(); // graphique & co, coalescés sur une frame
    });

    const pct = document.createElement('span');
    pct.className = 'a-pct';
    pct.textContent = `${Math.round(w[asset.id] * 100)} %`;

    const amount = document.createElement('span');
    amount.className = 'a-amount';
    amount.textContent = fmtCompact(state.capital * w[asset.id]);

    row.append(name, slider, pct, amount);
    rows.append(row);
    allocEls[asset.id] = { slider, pct, amount, seg: segs[asset.id], name: asset.name };
  }
}

// ---------------------------------------------------------------- tuiles 5/10/15/20

function renderTiles() {
  const box = $('tiles');
  box.replaceChildren();
  if (!state.selected.length) return;
  const { portfolio } = computeAll(20);
  const invested = deflate(totalInvested({ capital: state.capital, monthly: state.monthly, years: 20 }));
  for (const y of MILESTONES) {
    const v = portfolio.values[y];
    const inv = invested[y];
    const tile = document.createElement('div');
    tile.className = 'tile';
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = `Portefeuille — dans ${y} ans (${BASE_YEAR + y})`;
    const value = document.createElement('div');
    value.className = 'value';
    value.textContent = fmtCompact(v);
    const delta = document.createElement('div');
    const mult = inv > 0 ? v / inv : 0;
    delta.className = 'delta ' + (v >= inv ? 'up' : 'down');
    delta.textContent =
      `× ${nf1.format(mult)} vs ${fmtCompact(inv)} versés` +
      (portfolio.dividends[y] > 0 ? ` · dont ${fmtCompact(portfolio.dividends[y])} de dividendes` : '');
    tile.append(label, value, delta);
    box.append(tile);
  }
}

// ---------------------------------------------------------------- graphique SVG

const CHART = { w: 960, h: 430, top: 18, right: 74, bottom: 34, left: 66 };

function niceTicks(max, count = 5) {
  if (max <= 0) return [0, 1];
  const step = Math.pow(10, Math.floor(Math.log10(max / count)));
  const err = max / count / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const s = step * mult;
  const ticks = [];
  for (let v = 0; v <= max + s * 0.001; v += s) ticks.push(v);
  return ticks;
}

function logTicks(min, max) {
  const ticks = [];
  const e0 = Math.ceil(Math.log10(min) - 1e-9);
  const e1 = Math.floor(Math.log10(max) + 1e-9);
  for (let e = e0; e <= e1; e++) ticks.push(Math.pow(10, e));
  return ticks;
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

let chartGeom = null; // pour le crosshair

function renderChart() {
  const svg = $('chart');
  svg.replaceChildren();
  const { portfolio, series, invested } = computeAll();
  const band = computeBand();
  const { w, h, top, right, bottom, left } = CHART;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const iw = w - left - right;
  const ih = h - top - bottom;
  const years = state.years;
  // avec une seule poche, la ligne du portefeuille EST la poche : pas de doublon
  const assetLines = series.length > 1 ? series : [];

  // Domaine Y
  let maxV = Math.max(...invested, ...portfolio.values, 1);
  for (const s of assetLines) maxV = Math.max(maxV, ...s.values);
  if (band) maxV = Math.max(maxV, ...band.p90);
  let minV = 0;
  let yFor;
  let ticks;
  if (state.log) {
    const positives = [
      ...invested,
      ...portfolio.values,
      ...assetLines.flatMap((s) => s.values),
      ...(band ? band.p10 : []),
    ].filter((v) => v > 0);
    minV = Math.max(1, Math.min(...positives, maxV));
    const lmin = Math.log10(minV);
    const lmax = Math.log10(maxV);
    const span = Math.max(lmax - lmin, 0.1);
    yFor = (v) => top + ih - ((Math.log10(Math.max(v, minV)) - lmin) / span) * ih;
    ticks = logTicks(minV, maxV);
  } else {
    yFor = (v) => top + ih - (v / (maxV * 1.04)) * ih;
    ticks = niceTicks(maxV);
  }
  const xFor = (y) => left + (y / years) * iw;

  // Grille horizontale (hairline, pleine, discrète) + labels d'axe Y
  for (const t of ticks) {
    const y = yFor(t);
    if (y < top - 1 || y > top + ih + 1) continue;
    svg.append(
      svgEl('line', { x1: left, x2: left + iw, y1: y, y2: y, stroke: 'var(--grid)', 'stroke-width': 1 })
    );
    const lbl = svgEl('text', {
      x: left - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 11.5,
      fill: 'var(--text-muted)', style: 'font-variant-numeric: tabular-nums',
    });
    lbl.textContent = fmtCompact(t);
    svg.append(lbl);
  }

  // Axe X : années civiles
  const stepX = years > 10 ? 5 : 1;
  for (let y = 0; y <= years; y += stepX) {
    const lbl = svgEl('text', {
      x: xFor(y), y: h - 10, 'text-anchor': 'middle', 'font-size': 11.5,
      fill: 'var(--text-muted)', style: 'font-variant-numeric: tabular-nums',
    });
    lbl.textContent = String(BASE_YEAR + y);
    svg.append(lbl);
  }
  svg.append(
    svgEl('line', { x1: left, x2: left + iw, y1: top + ih, y2: top + ih, stroke: 'var(--axis)', 'stroke-width': 1 })
  );

  const pathFrom = (values) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(2)},${yFor(v).toFixed(2)}`).join('');

  // Bande d'incertitude du PORTEFEUILLE (lavis d'encre neutre)
  if (band) {
    const up = band.p90.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(2)},${yFor(v).toFixed(2)}`).join('');
    const down = band.p10
      .map((v, i) => `L${xFor(band.p10.length - 1 - i).toFixed(2)},${yFor(band.p10[band.p10.length - 1 - i]).toFixed(2)}`)
      .join('');
    svg.append(
      svgEl('path', { d: `${up}${down}Z`, fill: PORTFOLIO_COLOR, opacity: 0.07, stroke: 'none' })
    );
  }

  // Versements cumulés : référence grise en tireté
  svg.append(
    svgEl('path', {
      d: pathFrom(invested),
      fill: 'none', stroke: 'var(--text-muted)', 'stroke-width': 1.5,
      'stroke-dasharray': '5 4', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    })
  );

  // Poches par actif : 2px, couleur fixe de l'actif
  for (const s of assetLines) {
    svg.append(
      svgEl('path', {
        d: pathFrom(s.values),
        fill: 'none', stroke: seriesColor(s.asset.color), 'stroke-width': 2,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      })
    );
    svg.append(
      svgEl('circle', {
        cx: xFor(years), cy: yFor(s.values[years]), r: 4.5,
        fill: seriesColor(s.asset.color), stroke: 'var(--surface-1)', 'stroke-width': 2,
      })
    );
  }

  // Le portefeuille par-dessus tout : encre, 3px, point final plus gros
  svg.append(
    svgEl('path', {
      d: pathFrom(portfolio.values),
      fill: 'none', stroke: PORTFOLIO_COLOR, 'stroke-width': 3,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    })
  );
  svg.append(
    svgEl('circle', {
      cx: xFor(years), cy: yFor(portfolio.values[years]), r: 5.5,
      fill: PORTFOLIO_COLOR, stroke: 'var(--surface-1)', 'stroke-width': 2,
    })
  );

  // Étiquettes de fin : le portefeuille toujours, les poches si la place le permet
  const placed = [];
  const endLabel = (v, bold) => {
    const y = yFor(v);
    if (placed.some((py) => Math.abs(py - y) < 14)) return;
    placed.push(y);
    const lbl = svgEl('text', {
      x: xFor(years) + 10, y: y + 4, 'font-size': bold ? 12.5 : 12,
      'font-weight': bold ? 700 : 600,
      fill: 'var(--text-primary)', style: 'font-variant-numeric: tabular-nums',
    });
    lbl.textContent = fmtCompact(v);
    svg.append(lbl);
  };
  endLabel(portfolio.values[years], true);
  if (assetLines.length <= 4) {
    for (const s of [...assetLines].sort((a, b) => b.values[years] - a.values[years])) {
      endLabel(s.values[years], false);
    }
  }

  // Crosshair
  const cross = svgEl('line', {
    y1: top, y2: top + ih, stroke: 'var(--axis)', 'stroke-width': 1, visibility: 'hidden',
  });
  svg.append(cross);
  svg.append(svgEl('rect', { x: left, y: top, width: iw, height: ih, fill: 'transparent' }));

  chartGeom = { xFor, yFor, portfolio, series: assetLines, invested, band, cross, iw, left, years };
  bindPointer(svg);

  // Sous-titre
  const parts = [
    `Capital initial ${fmtMoney(state.capital)}`,
    state.monthly > 0 ? `versement ${fmtMoney(state.monthly)}/mois` : null,
    `scénario « ${$('scenario').selectedOptions[0].textContent} »`,
    state.real ? `en ${sym()} constants (inflation 2,5 %/an déduite)` : null,
    series.some((sr) => sr.dist)
      ? 'ETF distribuants : les lignes cumulent part investie et dividendes encaissés'
      : null,
  ].filter(Boolean);
  $('chart-sub').textContent =
    parts.join(' · ') +
    (band
      ? '. La zone grisée montre où atterrissent 80 % des futurs simulés pour votre portefeuille (du 10ᵉ au 90ᵉ percentile).'
      : '.');
}

function bindPointer(svg) {
  const tooltip = $('tooltip');
  const box = $('chart-box');

  const onMove = (ev) => {
    if (!chartGeom) return;
    const rect = svg.getBoundingClientRect();
    const scale = CHART.w / rect.width;
    const px = (ev.clientX - rect.left) * scale;
    const yearIdx = Math.round(((px - chartGeom.left) / chartGeom.iw) * chartGeom.years);
    const y = Math.max(0, Math.min(chartGeom.years, yearIdx));
    const x = chartGeom.xFor(y);
    chartGeom.cross.setAttribute('x1', x);
    chartGeom.cross.setAttribute('x2', x);
    chartGeom.cross.setAttribute('visibility', 'visible');
    renderTooltip(y);
    tooltip.style.display = 'block';
    const boxRect = box.getBoundingClientRect();
    const ttW = tooltip.offsetWidth;
    let leftPx = ((ev.clientX - boxRect.left) + 16);
    if (leftPx + ttW > boxRect.width - 8) leftPx = (ev.clientX - boxRect.left) - ttW - 16;
    tooltip.style.left = `${Math.max(4, leftPx)}px`;
    tooltip.style.top = `${Math.min(ev.clientY - boxRect.top + 14, boxRect.height - tooltip.offsetHeight - 6)}px`;
  };
  const onLeave = () => {
    tooltip.style.display = 'none';
    chartGeom?.cross.setAttribute('visibility', 'hidden');
  };
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerleave', onLeave);
}

function ttRow(color, value, name, opts = {}) {
  const row = document.createElement('div');
  row.className = 'tt-row' + (opts.bold ? ' lead' : '');
  const key = document.createElement('span');
  key.className = 'tt-key' + (opts.dashed ? ' ref' : '');
  if (!opts.dashed && color) key.style.setProperty('--c', color);
  const val = document.createElement('span');
  val.className = 'tt-val';
  val.textContent = value;
  const label = document.createElement('span');
  label.className = 'tt-name';
  label.textContent = name;
  row.append(key, val, label);
  return row;
}

function renderTooltip(year) {
  const tooltip = $('tooltip');
  tooltip.replaceChildren();
  const title = document.createElement('div');
  title.className = 'tt-title';
  title.textContent =
    year === 0 ? `${BASE_YEAR} (aujourd'hui)` : `${BASE_YEAR + year} (dans ${year} an${year > 1 ? 's' : ''})`;
  tooltip.append(title);
  tooltip.append(
    ttRow(PORTFOLIO_COLOR, fmtCompact(chartGeom.portfolio.values[year]), 'Portefeuille', { bold: true })
  );
  const rows = chartGeom.series
    .map((s) => ({ color: seriesColor(s.asset.color), v: s.values[year], name: s.asset.name }))
    .sort((a, b) => b.v - a.v);
  for (const r of rows) tooltip.append(ttRow(r.color, fmtCompact(r.v), r.name));
  tooltip.append(ttRow(null, fmtCompact(chartGeom.invested[year]), 'Versements cumulés', { dashed: true }));
  if (chartGeom.band) {
    const note = document.createElement('div');
    note.className = 'tt-title';
    note.style.marginTop = '6px';
    note.textContent = `80 % des futurs simulés : ${fmtCompact(chartGeom.band.p10[year])} — ${fmtCompact(chartGeom.band.p90[year])}`;
    tooltip.append(note);
  }
}

// ---------------------------------------------------------------- légende

function renderLegend() {
  const box = $('legend');
  box.replaceChildren();
  const { series } = computeAll();
  const mk = (color, text, opts = {}) => {
    const item = document.createElement('span');
    item.className = 'item' + (opts.bold ? ' lead' : '');
    const key = document.createElement('span');
    key.className = 'key' + (opts.dashed ? ' ref' : '') + (opts.bold ? ' thick' : '');
    if (color && !opts.dashed) key.style.setProperty('--c', color);
    item.append(key, document.createTextNode(text));
    box.append(item);
  };
  const w = getWeights();
  mk(PORTFOLIO_COLOR, 'Portefeuille', { bold: true });
  if (series.length > 1) {
    for (const s of series) {
      mk(seriesColor(s.asset.color), `${s.asset.name} (${Math.round(w[s.asset.id] * 100)} %)`);
    }
  }
  mk(null, 'Versements cumulés', { dashed: true });
}

// ---------------------------------------------------------------- tableau

function renderTable() {
  const table = $('results-table');
  table.replaceChildren();
  const { portfolio, series, invested } = computeAll();
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  const th0 = document.createElement('th');
  th0.textContent = 'Année';
  hr.append(th0);
  const thP = document.createElement('th');
  thP.className = 'lead';
  thP.textContent = 'Portefeuille';
  hr.append(thP);
  for (const s of series) {
    const th = document.createElement('th');
    const key = document.createElement('span');
    key.className = 'th-key';
    key.style.setProperty('--c', seriesColor(s.asset.color));
    th.append(key, document.createTextNode(s.asset.name));
    hr.append(th);
  }
  const thInv = document.createElement('th');
  thInv.textContent = 'Versements cumulés';
  hr.append(thInv);
  thead.append(hr);
  table.append(thead);

  const tbody = document.createElement('tbody');
  for (let y = 1; y <= state.years; y++) {
    const tr = document.createElement('tr');
    if (MILESTONES.includes(y)) tr.className = 'milestone';
    const td0 = document.createElement('td');
    td0.textContent = `${BASE_YEAR + y} (+${y})`;
    tr.append(td0);
    const tdP = document.createElement('td');
    tdP.className = 'lead';
    tdP.textContent = fmtMoney(portfolio.values[y]);
    tr.append(tdP);
    for (const s of series) {
      const td = document.createElement('td');
      td.textContent = fmtMoney(s.values[y]);
      tr.append(td);
    }
    const tdInv = document.createElement('td');
    tdInv.textContent = fmtMoney(invested[y]);
    tr.append(tdInv);
    tbody.append(tr);
  }
  table.append(tbody);
}

// ---------------------------------------------------------------- cartes actifs

function renderAssetCards() {
  const box = $('asset-cards');
  box.replaceChildren();
  const w = getWeights();
  for (const asset of selectedAssets()) {
    const p = PRICES[asset.id];
    const allocated = state.capital * (w[asset.id] || 0);
    const card = document.createElement('div');
    card.className = 'asset-card';

    const h = document.createElement('h3');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.setProperty('--c', seriesColor(asset.color));
    const title = asset.name.includes(asset.ticker) ? asset.name : `${asset.name} (${asset.ticker})`;
    h.append(dot, document.createTextNode(title));
    const badge = document.createElement('span');
    badge.className = 'badge' + (p?.live ? ' live' : '');
    badge.textContent = p?.live ? 'prix en direct' : 'prix indicatif';
    h.append(badge);
    card.append(h);

    const rows = [];
    rows.push(['Part du portefeuille', `${Math.round((w[asset.id] || 0) * 100)} % → ${fmtCompact(allocated)}`]);
    if (p) {
      rows.push(['Prix actuel', fmtMoney(p.price)]);
      if (allocated > 0 && p.price > 0) {
        rows.push(['Unités achetées', fmtUnits(allocated / p.price)]);
      }
    }
    if ((asset.dividendYield || 0) > 0) {
      rows.push([
        'Dividende',
        `≈ ${fmtPct(asset.dividendYield)}/an ${isDistributing(asset) ? '(encaissé)' : '(réinvesti)'}`,
      ]);
    }
    rows.push(['Rendement retenu', `${fmtPct(scenarioCagr(asset))}/an`]);
    rows.push(['Volatilité historique', `≈ ${fmtPct(asset.vol)}/an`]);
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'row';
      const l = document.createElement('span');
      l.textContent = label;
      const v = document.createElement('b');
      v.textContent = value;
      row.append(l, v);
      card.append(row);
    }
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = asset.note;
    card.append(note);
    box.append(card);
  }
}

// ------------------------------------------ effet des intérêts composés

/**
 * Compare le portefeuille avec ses ETF à dividendes en version capitalisante
 * (dividendes réinvestis → ils composent) et en version distribuante
 * (dividendes encaissés → ils ne composent plus). L'écart chiffré EST
 * l'effet des intérêts composés. Visible dès qu'une poche verse un dividende.
 */
function renderCompound() {
  const card = $('compound');
  const payers = selectedAssets().filter((a) => (a.dividendYield || 0) > 0);
  if (!payers.length) {
    card.hidden = true;
    return;
  }
  card.hidden = false;

  // La comparaison porte sur la seule poche ETF à dividendes : noyée dans le
  // portefeuille entier, une poche crypto à fort CAGR rendrait l'écart illisible.
  const { years } = state;
  const payerAllocs = allocations().filter((a) => a.dividendYield > 0);
  const acc = projectPortfolio({
    allocations: payerAllocs.map((a) => ({ ...a, reinvest: true })),
    years,
  });
  const dist = projectPortfolio({
    allocations: payerAllocs.map((a) => ({ ...a, reinvest: false })),
    years,
  });
  const accTotal = deflate(acc.total);
  const distTotal = deflate(dist.total);
  const distCash = deflate(dist.dividends);

  const w = getWeights();
  const payersShare = payers.reduce((s, a) => s + (w[a.id] || 0), 0);
  const payersCapital = state.capital * payersShare;
  const gain = accTotal[years] - distTotal[years];
  const pct = distTotal[years] > 0 ? gain / distTotal[years] : 0;
  $('compound-text').textContent =
    `Votre poche ETF à dividendes (${payers.map((a) => a.ticker).join(', ')}) pèse ` +
    `${Math.round(payersShare * 100)} % du portefeuille, soit ${fmtCompact(payersCapital)}. ` +
    `Sur ${years} ans, en capitalisant (dividendes réinvestis) elle atteint ${fmtCompact(accTotal[years])} ; ` +
    `en distribuant, ${fmtCompact(distTotal[years])}, dont ${fmtCompact(distCash[years])} de dividendes encaissés qui ne composent plus. ` +
    `Réinvestir rapporte ${gain >= 0 ? '+' : ''}${fmtCompact(gain)} (${gain >= 0 ? '+' : ''}${fmtPct(pct)}) : ` +
    `c'est l'effet boule de neige des intérêts composés — avant même le frottement fiscal qui pénalise en plus les dividendes versés.`;

  const bars = $('compound-bars');
  bars.replaceChildren();
  const max = Math.max(accTotal[years], distTotal[years], 1);
  const mkBar = (name, segs, total) => {
    const row = document.createElement('div');
    row.className = 'cbar';
    const label = document.createElement('span');
    label.className = 'name';
    label.textContent = name;
    const track = document.createElement('div');
    track.className = 'track';
    for (const seg of segs) {
      const el = document.createElement('div');
      el.className = 'seg';
      el.style.width = `${(seg.v / max) * 100}%`;
      el.style.background = 'var(--series-1)';
      if (seg.faded) el.style.opacity = 0.35;
      el.title = `${seg.name} : ${fmtCompact(seg.v)}`;
      track.append(el);
    }
    const val = document.createElement('span');
    val.className = 'val';
    val.textContent = fmtCompact(total);
    row.append(label, track, val);
    bars.append(row);
  };
  mkBar('Capitalisant', [{ name: 'Portefeuille (dividendes réinvestis)', v: accTotal[years] }], accTotal[years]);
  mkBar(
    'Distribuant',
    [
      { name: 'Part investie', v: distTotal[years] - distCash[years] },
      { name: 'Dividendes encaissés', v: distCash[years], faded: true },
    ],
    distTotal[years]
  );
  const note = document.createElement('div');
  note.className = 'cbar-note';
  note.textContent = 'Segment estompé : dividendes encaissés en cash (ils ne composent plus). Survolez les segments pour le détail.';
  bars.append(note);
}

// ---------------------------------------------------------------- rendu global

/** Tout ce qui dépend des résultats (mais pas le panneau de répartition). */
function renderResults() {
  renderTiles();
  renderCompound();
  renderChart();
  renderLegend();
  renderTable();
  renderAssetCards();
}

// Pendant un glissement de curseur, on coalesce les recalculs (Monte Carlo
// compris) sur une frame d'animation pour rester fluide.
let rafPending = false;
function scheduleResults() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    renderResults();
  });
}

function render() {
  renderAlloc();
  renderResults();
}

// ---------------------------------------------------------------- init

function bindControls() {
  $('capital').addEventListener('input', (e) => {
    state.capital = Math.max(0, Number(e.target.value) || 0);
    render();
  });
  $('monthly').addEventListener('input', (e) => {
    state.monthly = Math.max(0, Number(e.target.value) || 0);
    render();
  });
  $('years').addEventListener('change', (e) => {
    state.years = Number(e.target.value);
    render();
  });
  $('scenario').addEventListener('change', (e) => {
    state.scenario = e.target.value;
    render();
  });
  $('divmode').addEventListener('change', (e) => {
    state.divMode = e.target.value;
    render();
  });
  $('currency').addEventListener('change', async (e) => {
    state.currency = e.target.value;
    await loadPrices();
    render();
  });
  $('real').addEventListener('change', (e) => {
    state.real = e.target.checked;
    render();
  });
  $('log').addEventListener('change', (e) => {
    state.log = e.target.checked;
    render();
  });
  $('balance').addEventListener('click', () => {
    equalizeWeights();
    renderAlloc();
    render();
  });
}

async function loadPrices() {
  try {
    const res = await fetch(`/api/prices?currency=${state.currency}`);
    const data = await res.json();
    PRICES = data.prices || {};
  } catch {
    PRICES = {};
  }
}

async function init() {
  const res = await fetch('/api/assets');
  const data = await res.json();
  CATALOG = data.assets;
  INFLATION = data.inflation;
  bindControls();
  renderPicker();
  render();
  await loadPrices(); // les prix arrivent ensuite, on rafraîchit les cartes
  renderAssetCards();
}

init();
