/* SnowBall — logique de l'interface.
   Le moteur de calcul est partagé avec le serveur et les tests : /lib/projection.js */

import {
  projectDeterministic,
  projectPercentiles,
  projectWithDividends,
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
  focus: 'btc', // actif dont on affiche la bande d'incertitude et les tuiles
};

let CATALOG = [];
let INFLATION = 0.025;
let PRICES = {}; // { assetId: { price, currency, live } }

const $ = (id) => document.getElementById(id);
const BASE_YEAR = new Date().getFullYear();
const MILESTONES = [5, 10, 15, 20];

// ---------------------------------------------------------------- formats

const sym = () => (state.currency === 'usd' ? '$' : '€');
const nfInt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

function fmtMoney(v) {
  return `${nfInt.format(v)} ${sym()}`;
}

function fmtCompact(v) {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${nf1.format(v / 1e9)} Md${sym()}`;
  if (abs >= 1e6) return `${nf1.format(v / 1e6)} M${sym()}`;
  if (abs >= 1e4) return `${nfInt.format(v / 1e3)} k${sym()}`;
  if (abs >= 1e3) return `${nf1.format(v / 1e3)} k${sym()}`;
  return fmtMoney(v);
}

function fmtPct(r) {
  return `${nf1.format(r * 100)} %`;
}

const seriesColor = (slot) => `var(--series-${slot})`;

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

/**
 * Projection d'un actif dans le mode courant. En mode distribuant, `values`
 * est le patrimoine total (part investie + dividendes encaissés, qui ne
 * composent plus) ; sinon tout est réinvesti et compose.
 */
function projectAsset(asset, years) {
  const { capital, monthly } = state;
  const dist = isDistributing(asset);
  const r = projectWithDividends({
    capital,
    monthly,
    cagr: scenarioCagr(asset),
    dividendYield: asset.dividendYield || 0,
    years,
    reinvest: !dist,
  });
  return {
    dist,
    values: deflate(r.total),
    invested: deflate(r.invested),
    dividends: deflate(r.dividends),
  };
}

/** Séries projetées pour l'affichage : [{asset, values, dist}], + versements cumulés. */
function computeSeries() {
  const { capital, monthly, years } = state;
  const series = state.selected
    .map((id) => CATALOG.find((a) => a.id === id))
    .filter(Boolean)
    .map((asset) => ({ asset, ...projectAsset(asset, years) }));
  const invested = deflate(totalInvested({ capital, monthly, years }));
  return { series, invested };
}

/** Bande p10–p90 (Monte Carlo) pour l'actif en vedette. */
function computeBand() {
  const asset = CATALOG.find((a) => a.id === state.focus);
  if (!asset) return null;
  const { capital, monthly, years } = state;
  const pct = projectPercentiles({
    capital,
    monthly,
    cagr: scenarioCagr(asset),
    vol: asset.vol,
    years,
    dividendYield: asset.dividendYield || 0,
    reinvest: !isDistributing(asset),
    percentiles: [10, 90],
  });
  return { asset, p10: deflate(pct.p10), p90: deflate(pct.p90) };
}

// ---------------------------------------------------------------- sélecteur d'actifs

function renderPicker() {
  const box = $('asset-picker');
  box.replaceChildren();
  for (const asset of CATALOG) {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.type = 'button';
    btn.style.setProperty('--c', seriesColor(asset.color));
    btn.setAttribute('aria-pressed', String(state.selected.includes(asset.id)));
    const dot = document.createElement('span');
    dot.className = 'dot';
    btn.append(dot, document.createTextNode(asset.name));
    btn.addEventListener('click', () => {
      const i = state.selected.indexOf(asset.id);
      if (i >= 0) state.selected.splice(i, 1);
      else state.selected.push(asset.id);
      if (!state.selected.includes(state.focus)) state.focus = state.selected[0] ?? null;
      if (state.selected.includes(asset.id) && state.selected.length === 1) state.focus = asset.id;
      renderPicker();
      render();
    });
    box.append(btn);
  }
}

// ---------------------------------------------------------------- tuiles 5/10/15/20

function renderTiles() {
  const box = $('tiles');
  box.replaceChildren();
  const asset = CATALOG.find((a) => a.id === state.focus);
  if (!asset) return;
  const { capital, monthly } = state;
  const proj = projectAsset(asset, 20);
  const values = proj.values;
  const invested = deflate(totalInvested({ capital, monthly, years: 20 }));
  for (const y of MILESTONES) {
    const v = values[y];
    const inv = invested[y];
    const tile = document.createElement('div');
    tile.className = 'tile';
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = `${asset.name} — dans ${y} ans (${BASE_YEAR + y})`;
    const value = document.createElement('div');
    value.className = 'value';
    value.textContent = fmtCompact(v);
    const delta = document.createElement('div');
    const mult = inv > 0 ? v / inv : 0;
    delta.className = 'delta ' + (v >= inv ? 'up' : 'down');
    delta.textContent = `× ${nf1.format(mult)} vs ${fmtCompact(inv)} versés` +
      (proj.dist ? ` · dont ${fmtCompact(proj.dividends[y])} de dividendes` : '');
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

let chartGeom = null; // pour le crosshair : { xFor, series, invested, band }

function renderChart() {
  const svg = $('chart');
  svg.replaceChildren();
  const { series, invested } = computeSeries();
  const band = state.selected.includes(state.focus) ? computeBand() : null;
  const { w, h, top, right, bottom, left } = CHART;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const iw = w - left - right;
  const ih = h - top - bottom;
  const years = state.years;

  // Domaine Y
  let maxV = Math.max(...invested, 1);
  for (const s of series) maxV = Math.max(maxV, ...s.values);
  if (band) maxV = Math.max(maxV, ...band.p90);
  let minV = 0;
  let yFor;
  let ticks;
  if (state.log) {
    const positives = [
      ...invested,
      ...series.flatMap((s) => s.values),
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

  // Axe X : années civiles, ticks tous les 5 ans (ou 1 an si horizon court)
  const stepX = years > 10 ? 5 : 1;
  for (let y = 0; y <= years; y += stepX) {
    const x = xFor(y);
    const lbl = svgEl('text', {
      x, y: h - 10, 'text-anchor': 'middle', 'font-size': 11.5,
      fill: 'var(--text-muted)', style: 'font-variant-numeric: tabular-nums',
    });
    lbl.textContent = String(BASE_YEAR + y);
    svg.append(lbl);
  }
  // Ligne de base
  svg.append(
    svgEl('line', { x1: left, x2: left + iw, y1: top + ih, y2: top + ih, stroke: 'var(--axis)', 'stroke-width': 1 })
  );

  const pathFrom = (values) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(2)},${yFor(v).toFixed(2)}`).join('');

  // Bande d'incertitude (lavis à 10 % de la teinte de l'actif en vedette)
  if (band) {
    const up = band.p90.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(2)},${yFor(v).toFixed(2)}`).join('');
    const down = band.p10
      .map((v, i) => `L${xFor(band.p10.length - 1 - i).toFixed(2)},${yFor(band.p10[band.p10.length - 1 - i]).toFixed(2)}`)
      .join('');
    svg.append(
      svgEl('path', {
        d: `${up}${down}Z`,
        fill: seriesColor(band.asset.color),
        opacity: 0.1,
        stroke: 'none',
      })
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

  // Lignes de série : 2px, jointures rondes ; point final ≥8px cerclé surface
  for (const s of series) {
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

  // Étiquettes directes de fin (valeur seule, encre neutre) — sélectives :
  // ≤ 4 séries et pas de collision (sinon légende + tooltip s'en chargent).
  if (series.length <= 4) {
    const placed = [];
    const sorted = series
      .map((s) => ({ s, y: yFor(s.values[years]) }))
      .sort((a, b) => a.y - b.y);
    for (const { s, y } of sorted) {
      if (placed.some((py) => Math.abs(py - y) < 14)) continue;
      placed.push(y);
      const lbl = svgEl('text', {
        x: xFor(years) + 10, y: y + 4, 'font-size': 12, 'font-weight': 600,
        fill: 'var(--text-primary)', style: 'font-variant-numeric: tabular-nums',
      });
      lbl.textContent = fmtCompact(s.values[years]);
      svg.append(lbl);
    }
  }

  // Crosshair (créé une fois, piloté au pointer)
  const cross = svgEl('line', {
    y1: top, y2: top + ih, stroke: 'var(--axis)', 'stroke-width': 1, visibility: 'hidden',
  });
  svg.append(cross);

  const overlay = svgEl('rect', {
    x: left, y: top, width: iw, height: ih, fill: 'transparent',
  });
  svg.append(overlay);

  chartGeom = { xFor, yFor, series, invested, band, cross, overlay, iw, left, years };
  bindPointer(svg);

  // Sous-titre
  const parts = [
    `Capital initial ${fmtMoney(state.capital)}`,
    state.monthly > 0 ? `versement ${fmtMoney(state.monthly)}/mois` : null,
    `scénario « ${$('scenario').selectedOptions[0].textContent} »`,
    state.real ? `en ${sym()} constants (inflation 2,5 %/an déduite)` : null,
      series.some((sr) => sr.dist)
      ? 'ETF distribuants : la ligne cumule part investie et dividendes encaissés'
      : null,
  ].filter(Boolean);
  $('chart-sub').textContent =
    parts.join(' · ') +
    (band
      ? `. La bande colorée couvre 80 % des trajectoires simulées pour ${band.asset.name} (percentiles 10–90).`
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

function ttRow(color, value, name, dashed = false) {
  const row = document.createElement('div');
  row.className = 'tt-row';
  const key = document.createElement('span');
  key.className = 'tt-key' + (dashed ? ' ref' : '');
  if (!dashed) key.style.setProperty('--c', color);
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
  const rows = chartGeom.series
    .map((s) => ({ color: seriesColor(s.asset.color), v: s.values[year], name: s.asset.name }))
    .sort((a, b) => b.v - a.v);
  for (const r of rows) tooltip.append(ttRow(r.color, fmtCompact(r.v), r.name));
  tooltip.append(ttRow(null, fmtCompact(chartGeom.invested[year]), 'Versements cumulés', true));
  if (chartGeom.band) {
    const b = chartGeom.band;
    const note = document.createElement('div');
    note.className = 'tt-title';
    note.style.marginTop = '6px';
    note.textContent = `${b.asset.ticker} p10–p90 : ${fmtCompact(b.p10[year])} — ${fmtCompact(b.p90[year])}`;
    tooltip.append(note);
  }
}

// ---------------------------------------------------------------- légende

function renderLegend() {
  const box = $('legend');
  box.replaceChildren();
  const { series } = computeSeries();
  for (const s of series) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'item';
    item.dataset.focus = String(s.asset.id === state.focus);
    item.title = 'Cliquer pour mettre cet actif en vedette (bande d’incertitude + tuiles)';
    const key = document.createElement('span');
    key.className = 'key';
    key.style.setProperty('--c', seriesColor(s.asset.color));
    item.append(key, document.createTextNode(s.asset.name));
    item.addEventListener('click', () => {
      state.focus = s.asset.id;
      render();
    });
    box.append(item);
  }
  const ref = document.createElement('span');
  ref.className = 'item';
  const key = document.createElement('span');
  key.className = 'key ref';
  ref.append(key, document.createTextNode('Versements cumulés'));
  box.append(ref);
}

// ---------------------------------------------------------------- tableau

function renderTable() {
  const table = $('results-table');
  table.replaceChildren();
  const { series, invested } = computeSeries();
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  const th0 = document.createElement('th');
  th0.textContent = 'Année';
  hr.append(th0);
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
  for (const id of state.selected) {
    const asset = CATALOG.find((a) => a.id === id);
    if (!asset) continue;
    const p = PRICES[id];
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
    if (p) {
      rows.push(['Prix actuel', fmtMoney(p.price)]);
      if (state.capital > 0 && p.price > 0) {
        const units = state.capital / p.price;
        rows.push(['Unités pour ' + fmtCompact(state.capital), fmtUnits(units)]);
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

// ---------------------------------------------------------------- unités : formatage fin

// (les cryptos s'achètent en fractions ; on montre 4 décimales significatives)
function fmtUnits(units) {
  if (units >= 1000) return nfInt.format(units);
  if (units >= 1) return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(units);
  return new Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 4 }).format(units);
}

// ------------------------------------------ effet des intérêts composés

/**
 * Compare, pour un actif à dividendes, la version capitalisante (dividendes
 * réinvestis → ils composent) et la version distribuante (dividendes
 * encaissés → ils ne composent plus). L'écart chiffré EST l'effet des
 * intérêts composés. Affiché pour l'actif en vedette s'il verse un
 * dividende, sinon pour le premier actif sélectionné qui en verse un.
 */
function renderCompound() {
  const card = $('compound');
  const candidates = [state.focus, ...state.selected]
    .map((id) => CATALOG.find((a) => a.id === id))
    .filter((a) => a && (a.dividendYield || 0) > 0);
  const asset = candidates[0];
  if (!asset) {
    card.hidden = true;
    return;
  }
  card.hidden = false;

  const { capital, monthly, years } = state;
  const base = { capital, monthly, cagr: scenarioCagr(asset), dividendYield: asset.dividendYield, years };
  const acc = deflate(projectWithDividends({ ...base, reinvest: true }).total);
  const distR = projectWithDividends({ ...base, reinvest: false });
  const dist = deflate(distR.total);
  const distInvested = deflate(distR.invested);
  const distCash = deflate(distR.dividends);

  const gain = acc[years] - dist[years];
  const pct = dist[years] > 0 ? gain / dist[years] : 0;
  $('compound-text').textContent =
    `${asset.name}, ${fmtCompact(capital)} investis` +
    (monthly > 0 ? ` + ${fmtMoney(monthly)}/mois` : '') +
    ` sur ${years} ans à ${fmtPct(scenarioCagr(asset))}/an (dont ≈ ${fmtPct(asset.dividendYield)} de dividendes) : ` +
    `la version capitalisante atteint ${fmtCompact(acc[years])}, la distribuante ${fmtCompact(dist[years])} ` +
    `(${fmtCompact(distInvested[years])} investis + ${fmtCompact(distCash[years])} de dividendes encaissés qui ne composent plus). ` +
    `Réinvestir les dividendes rapporte ${gain >= 0 ? '+' : ''}${fmtCompact(gain)} (${gain >= 0 ? '+' : ''}${fmtPct(pct)}) : ` +
    `c'est l'effet boule de neige des intérêts composés — avant même le frottement fiscal qui pénalise en plus les dividendes versés.`;

  // Mini-comparaison en barres : capitalisant (1 segment) vs distribuant
  // (2 segments : part investie + dividendes, séparés par un espace surface).
  const bars = $('compound-bars');
  bars.replaceChildren();
  const max = Math.max(acc[years], dist[years], 1);
  const color = seriesColor(asset.color);
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
      el.style.background = color;
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
  mkBar('Capitalisant', [{ name: 'Capital (dividendes réinvestis)', v: acc[years] }], acc[years]);
  mkBar(
    'Distribuant',
    [
      { name: 'Part investie', v: distInvested[years] },
      { name: 'Dividendes encaissés', v: distCash[years], faded: true },
    ],
    dist[years]
  );
  const note = document.createElement('div');
  note.className = 'cbar-note';
  note.textContent = 'Segment estompé : dividendes encaissés en cash (ils ne composent plus). Survolez les segments pour le détail.';
  bars.append(note);
}

// ---------------------------------------------------------------- rendu global

function render() {
  renderTiles();
  renderCompound();
  renderChart();
  renderLegend();
  renderTable();
  renderAssetCards();
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
