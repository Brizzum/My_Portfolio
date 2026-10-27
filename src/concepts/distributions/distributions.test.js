import { describe, expect, test } from 'vitest';
import { DISTRIBUTIONS, defaultParams } from './distributions.js';

const PARAM_SETS = {
  normal: [{ mu: 0, sigma: 1 }, { mu: -3, sigma: 2.5 }],
  lognormal: [{ mu: 0, sigma: 0.5 }, { mu: 1.2, sigma: 1.1 }],
  exponential: [{ lambda: 1 }, { lambda: 0.3 }],
  weibull: [{ k: 2, lambda: 8 }, { k: 0.8, lambda: 3 }],
};

// Numerical integral of g over [a, b] (composite Simpson).
function integrate(g, a, b, n = 20000) {
  const h = (b - a) / n;
  let s = g(a) + g(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * g(a + i * h);
  return (s * h) / 3;
}

describe.each(Object.keys(DISTRIBUTIONS))('%s', key => {
  const d = DISTRIBUTIONS[key];
  test.each(PARAM_SETS[key])('consistency for %o', p => {
    // Median and quantiles invert the CDF
    expect(d.cdf(d.median.value(p), p)).toBeCloseTo(0.5, 6);
    for (const q of [0.01, 0.25, 0.75, 0.99]) expect(d.cdf(d.quantile(q, p), p)).toBeCloseTo(q, 6);
    // PDF integrates to the CDF, and the mean equals ∫ x f(x) dx
    const lo = d.quantile(1e-9, p), hi = d.quantile(1 - 1e-9, p);
    const xm = d.median.value(p);
    expect(integrate(x => d.pdf(x, p), lo, xm)).toBeCloseTo(0.5 - d.cdf(lo, p), 2);
    expect(integrate(x => x * d.pdf(x, p), lo, hi)).toBeCloseTo(d.mean.value(p), 2);
    // The mode is the PDF maximum
    const m = d.mode.value(p), eps = 1e-3;
    if (m > lo) expect(d.pdf(m, p)).toBeGreaterThanOrEqual(Math.max(d.pdf(m - eps, p), d.pdf(m + eps, p)));
    else expect(d.pdf(m + eps, p)).toBeGreaterThanOrEqual(d.pdf(m + 2 * eps, p));
  });
  test('defaults cover every parameter', () => {
    expect(Object.keys(defaultParams(d))).toEqual(d.params.map(q => q.key));
  });
});
