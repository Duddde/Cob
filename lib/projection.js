/**
 * Moteur de projection de capital.
 *
 * Deux modes :
 *  - projectDeterministic : capitalisation composée classique (CAGR constant),
 *    avec versements mensuels optionnels (DCA).
 *  - projectPercentiles : Monte Carlo en pas mensuels avec rendements
 *    log-normaux, pour produire une bande d'incertitude (p10 / p50 / p90).
 *
 * Convention : le "cagr" fourni est le rendement GÉOMÉTRIQUE annualisé
 * (celui qu'on observe sur les historiques de prix). En Monte Carlo, la
 * dérive log est donc directement ln(1 + cagr) — la médiane des trajectoires
 * retombe sur la projection déterministe, et la moyenne arithmétique est
 * plus haute (volatility drag, cf. docs/RESEARCH.md).
 */

/** Taux mensuel équivalent à un taux annuel composé. */
export function monthlyRate(annualRate) {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

/**
 * Projection déterministe année par année.
 * @param {object} p
 * @param {number} p.capital   Capital initial.
 * @param {number} [p.monthly] Versement mensuel (début de mois), défaut 0.
 * @param {number} p.cagr      Rendement annualisé (ex: 0.10 pour +10 %/an).
 * @param {number} p.years     Horizon en années.
 * @returns {number[]} Valeurs de fin d'année, index 0 = aujourd'hui.
 */
export function projectDeterministic({ capital, monthly = 0, cagr, years }) {
  const rm = monthlyRate(cagr);
  const values = [capital];
  let v = capital;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      v = (v + monthly) * (1 + rm);
    }
    values.push(v);
  }
  return values;
}

/** Montant total versé (capital + DCA) à chaque fin d'année. */
export function totalInvested({ capital, monthly = 0, years }) {
  const values = [capital];
  for (let y = 1; y <= years; y++) {
    values.push(capital + monthly * 12 * y);
  }
  return values;
}

/** PRNG déterministe (mulberry32) pour des simulations reproductibles. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tirage normal standard (Box-Muller) alimenté par un PRNG uniforme. */
function makeNormal(rand) {
  let spare = null;
  return function () {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
}

/**
 * Monte Carlo : percentiles de la valeur du portefeuille à chaque fin d'année.
 * Rendements mensuels log-normaux : ln(1+r_m) ~ N(mu_m, sigma_m²) avec
 * mu_m = ln(1+cagr)/12 et sigma_m = vol/sqrt(12).
 *
 * @param {object} p
 * @param {number}   p.capital
 * @param {number}   [p.monthly]
 * @param {number}   p.cagr        Rendement géométrique annualisé.
 * @param {number}   p.vol         Volatilité annualisée (ex: 0.15).
 * @param {number}   p.years
 * @param {number[]} [p.percentiles] Défaut [10, 50, 90].
 * @param {number}   [p.paths]     Nombre de trajectoires, défaut 2000.
 * @param {number}   [p.seed]      Graine PRNG, défaut 42.
 * @returns {{[pct: string]: number[]}} ex: { p10: [...], p50: [...], p90: [...] }
 */
export function projectPercentiles({
  capital,
  monthly = 0,
  cagr,
  vol,
  years,
  percentiles = [10, 50, 90],
  paths = 2000,
  seed = 42,
}) {
  const months = years * 12;
  const muM = Math.log(1 + cagr) / 12;
  const sigmaM = vol / Math.sqrt(12);
  const normal = makeNormal(mulberry32(seed));

  // yearly[y] = tableau des valeurs de chaque trajectoire à la fin de l'année y
  const yearly = Array.from({ length: years + 1 }, () => []);
  for (const arr of yearly) arr.length = paths;

  for (let p = 0; p < paths; p++) {
    let v = capital;
    yearly[0][p] = capital;
    for (let m = 1; m <= months; m++) {
      const r = Math.exp(muM + sigmaM * normal()) - 1;
      v = (v + monthly) * (1 + r);
      if (m % 12 === 0) yearly[m / 12][p] = v;
    }
  }

  const out = {};
  for (const pct of percentiles) out[`p${pct}`] = [];
  for (let y = 0; y <= years; y++) {
    const sorted = yearly[y].slice().sort((a, b) => a - b);
    for (const pct of percentiles) {
      const idx = Math.min(
        sorted.length - 1,
        Math.max(0, Math.round((pct / 100) * (sorted.length - 1)))
      );
      out[`p${pct}`].push(sorted[idx]);
    }
  }
  return out;
}

/** Déflate une série nominale en valeur réelle (pouvoir d'achat d'aujourd'hui). */
export function toRealTerms(values, inflation) {
  return values.map((v, y) => v / Math.pow(1 + inflation, y));
}
