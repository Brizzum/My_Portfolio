// Closed-form PDF, CDF, quantile function and summary statistics
// for a few common continuous distributions.

// Error function — Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7).
function erf(x) {
  const s = Math.sign(x), a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

const SQRT2 = Math.SQRT2, SQRT2PI = Math.sqrt(2 * Math.PI);
const stdNormalCdf = z => 0.5 * (1 + erf(z / SQRT2));

// Inverse standard normal CDF — Acklam's rational approximation (relative error < 1.15e-9).
function stdNormalQuantile(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p > 1 - pl) return -stdNormalQuantile(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

// Gamma function — Lanczos approximation (g = 7), valid for x > 0.
function gamma(x) {
  const g = 7, coef = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  x -= 1;
  let s = coef[0];
  for (let i = 1; i < g + 2; i++) s += coef[i] / (x + i);
  const t = x + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * s;
}

// Each entry: parameters (with slider ranges), pdf/cdf/quantile, and statistics
// with the formula shown to the user.
export const DISTRIBUTIONS = {
  normal: {
    name: 'Normal',
    params: [
      { key: 'mu', label: 'μ (location)', min: -10, max: 10, step: 0.1, value: 0 },
      { key: 'sigma', label: 'σ (scale)', min: 0.1, max: 5, step: 0.1, value: 1 },
    ],
    pdf: (x, { mu, sigma }) => Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * SQRT2PI),
    cdf: (x, { mu, sigma }) => stdNormalCdf((x - mu) / sigma),
    quantile: (p, { mu, sigma }) => mu + sigma * stdNormalQuantile(p),
    pdfFormula: 'f(x) = exp(−(x−μ)² / 2σ²) / (σ√(2π))',
    cdfFormula: 'F(x) = ½ [1 + erf((x−μ) / (σ√2))]',
    mean:   { formula: 'μ', value: ({ mu }) => mu },
    median: { formula: 'μ', value: ({ mu }) => mu },
    mode:   { formula: 'μ', value: ({ mu }) => mu },
    quantileFormula: 'μ + σ Φ⁻¹(p)',
  },
  lognormal: {
    name: 'Log-normal',
    params: [
      { key: 'mu', label: 'μ (mean of ln X)', min: -1, max: 2, step: 0.05, value: 0 },
      { key: 'sigma', label: 'σ (std. dev. of ln X)', min: 0.1, max: 1.5, step: 0.05, value: 0.5 },
    ],
    pdf: (x, { mu, sigma }) => x <= 0 ? 0 : Math.exp(-0.5 * ((Math.log(x) - mu) / sigma) ** 2) / (x * sigma * SQRT2PI),
    cdf: (x, { mu, sigma }) => x <= 0 ? 0 : stdNormalCdf((Math.log(x) - mu) / sigma),
    quantile: (p, { mu, sigma }) => Math.exp(mu + sigma * stdNormalQuantile(p)),
    pdfFormula: 'f(x) = exp(−(ln x−μ)² / 2σ²) / (xσ√(2π)),  x > 0',
    cdfFormula: 'F(x) = ½ [1 + erf((ln x−μ) / (σ√2))]',
    mean:   { formula: 'exp(μ + σ²/2)', value: ({ mu, sigma }) => Math.exp(mu + sigma ** 2 / 2) },
    median: { formula: 'exp(μ)', value: ({ mu }) => Math.exp(mu) },
    mode:   { formula: 'exp(μ − σ²)', value: ({ mu, sigma }) => Math.exp(mu - sigma ** 2) },
    quantileFormula: 'exp(μ + σ Φ⁻¹(p))',
  },
  exponential: {
    name: 'Exponential',
    params: [
      { key: 'lambda', label: 'λ (rate)', min: 0.1, max: 5, step: 0.05, value: 1 },
    ],
    pdf: (x, { lambda }) => x < 0 ? 0 : lambda * Math.exp(-lambda * x),
    cdf: (x, { lambda }) => x < 0 ? 0 : 1 - Math.exp(-lambda * x),
    quantile: (p, { lambda }) => -Math.log(1 - p) / lambda,
    pdfFormula: 'f(x) = λ e^(−λx),  x ≥ 0',
    cdfFormula: 'F(x) = 1 − e^(−λx)',
    mean:   { formula: '1/λ', value: ({ lambda }) => 1 / lambda },
    median: { formula: 'ln 2 / λ', value: ({ lambda }) => Math.LN2 / lambda },
    mode:   { formula: '0', value: () => 0 },
    quantileFormula: '−ln(1−p) / λ',
  },
  weibull: {
    name: 'Weibull',
    params: [
      { key: 'k', label: 'k (shape)', min: 0.5, max: 5, step: 0.05, value: 2 },
      { key: 'lambda', label: 'λ (scale)', min: 0.5, max: 15, step: 0.1, value: 8 },
    ],
    pdf: (x, { k, lambda }) => x < 0 ? 0 : (k / lambda) * (x / lambda) ** (k - 1) * Math.exp(-((x / lambda) ** k)),
    cdf: (x, { k, lambda }) => x < 0 ? 0 : 1 - Math.exp(-((x / lambda) ** k)),
    quantile: (p, { k, lambda }) => lambda * (-Math.log(1 - p)) ** (1 / k),
    pdfFormula: 'f(x) = (k/λ)(x/λ)^(k−1) e^(−(x/λ)^k),  x ≥ 0',
    cdfFormula: 'F(x) = 1 − e^(−(x/λ)^k)',
    mean:   { formula: 'λ Γ(1 + 1/k)', value: ({ k, lambda }) => lambda * gamma(1 + 1 / k) },
    median: { formula: 'λ (ln 2)^(1/k)', value: ({ k, lambda }) => lambda * Math.LN2 ** (1 / k) },
    mode:   { formula: 'λ ((k−1)/k)^(1/k) for k > 1, else 0',
              value: ({ k, lambda }) => k > 1 ? lambda * ((k - 1) / k) ** (1 / k) : 0 },
    quantileFormula: 'λ (−ln(1−p))^(1/k)',
  },
};

export const defaultParams = dist =>
  Object.fromEntries(dist.params.map(p => [p.key, p.value]));
