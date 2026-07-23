import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyRate,
  projectDeterministic,
  projectPercentiles,
  totalInvested,
  toRealTerms,
  mulberry32,
} from '../lib/projection.js';

test('monthlyRate compose exactement le taux annuel', () => {
  const rm = monthlyRate(0.1);
  assert.ok(Math.abs(Math.pow(1 + rm, 12) - 1.1) < 1e-12);
});

test('projection sans versement = intérêts composés classiques', () => {
  const values = projectDeterministic({ capital: 10000, cagr: 0.1, years: 10 });
  assert.equal(values.length, 11);
  assert.equal(values[0], 10000);
  // 10 000 × 1,1^10 = 25 937,42…
  assert.ok(Math.abs(values[10] - 10000 * Math.pow(1.1, 10)) < 1e-6);
});

test('projection à taux nul = simple cumul des versements', () => {
  const values = projectDeterministic({ capital: 1000, monthly: 100, cagr: 0, years: 2 });
  assert.ok(Math.abs(values[2] - (1000 + 100 * 24)) < 1e-9);
});

test('les versements mensuels suivent la formule de la valeur future d’une annuité', () => {
  const cagr = 0.06;
  const rm = monthlyRate(cagr);
  const n = 120;
  const values = projectDeterministic({ capital: 0, monthly: 200, cagr, years: 10 });
  // Annuité versée en début de mois : FV = C × ((1+r)^n − 1)/r × (1+r)
  const expected = (200 * (Math.pow(1 + rm, n) - 1) / rm) * (1 + rm);
  assert.ok(Math.abs(values[10] - expected) < 1e-6);
});

test('totalInvested cumule capital et versements', () => {
  assert.deepEqual(totalInvested({ capital: 1000, monthly: 100, years: 2 }), [1000, 2200, 3400]);
});

test('toRealTerms déflate au taux d’inflation', () => {
  const real = toRealTerms([100, 100, 100], 0.025);
  assert.equal(real[0], 100);
  assert.ok(Math.abs(real[2] - 100 / 1.025 ** 2) < 1e-9);
});

test('mulberry32 est déterministe', () => {
  const a = mulberry32(123);
  const b = mulberry32(123);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
});

test('Monte Carlo : percentiles ordonnés, reproductibles, médiane ≈ déterministe', () => {
  const params = { capital: 10000, cagr: 0.1, vol: 0.15, years: 20 };
  const r1 = projectPercentiles({ ...params, percentiles: [10, 50, 90], seed: 7 });
  const r2 = projectPercentiles({ ...params, percentiles: [10, 50, 90], seed: 7 });
  assert.deepEqual(r1, r2); // même graine → mêmes trajectoires

  const det = projectDeterministic(params);
  for (let y = 0; y <= 20; y++) {
    assert.ok(r1.p10[y] <= r1.p50[y]);
    assert.ok(r1.p50[y] <= r1.p90[y]);
  }
  // Rendements log-normaux avec dérive ln(1+cagr) : la médiane des trajectoires
  // doit retomber près de la projection déterministe (tolérance Monte Carlo 5 %).
  assert.ok(Math.abs(r1.p50[20] - det[20]) / det[20] < 0.05);
});

test('Monte Carlo : la volatilité élargit la bande', () => {
  const base = { capital: 10000, cagr: 0.1, years: 10, percentiles: [10, 90] };
  const narrow = projectPercentiles({ ...base, vol: 0.05 });
  const wide = projectPercentiles({ ...base, vol: 0.6 });
  const spread = (r) => r.p90[10] / r.p10[10];
  assert.ok(spread(wide) > spread(narrow));
});
