import { useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DISTRIBUTIONS, defaultParams } from './distributions.js';
import './Distributions.css';

const W = 560, H = 320;
const MARGIN = { top: 48, right: 16, bottom: 36, left: 64 };
const N = 400;
const fmt = d3.format('.4~g');

// Marker identity colours (categorical slots 1–3, validated for the dark surface).
const MARKERS = [
  { key: 'mean', label: 'Mean', color: '#3987e5' },
  { key: 'median', label: 'Median', color: '#d95926' },
  { key: 'mode', label: 'Mode', color: '#199e70' },
];

// Axis limits that show the bulk of the distribution: x from the 0.1% to the
// 99.9% quantile (from 0 for positive support), y up to just above the density
// peak. The y-limit uses the 98th percentile of sampled densities, so singular
// densities (e.g. Weibull k < 1 at x = 0) do not flatten the rest of the curve.
function fitAxes(dist, params) {
  const xmin = dist.cdf(0, params) === 0 ? 0 : dist.quantile(0.001, params);
  const xmax = dist.quantile(0.999, params);
  const dens = d3.range(N + 1).map(i => dist.pdf(xmin + (xmax - xmin) * i / N, params));
  const ymax = 1.15 * d3.quantile(dens.filter(Number.isFinite), 0.98);
  return { xmin, xmax, ymax };
}

const toInputs = ax => Object.fromEntries(Object.entries(ax).map(([k, v]) => [k, String(+v.toPrecision(3))]));

export default function Distributions() {
  const [distKey, setDistKey] = useState('normal');
  const [params, setParams] = useState(defaultParams(DISTRIBUTIONS.normal));
  const [pct, setPct] = useState(90);
  const [hoverX, setHoverX] = useState(null);
  const [fixed, setFixed] = useState(true);
  const [limits, setLimits] = useState(toInputs(fitAxes(DISTRIBUTIONS.normal, defaultParams(DISTRIBUTIONS.normal))));
  const dist = DISTRIBUTIONS[distKey];

  const selectDist = key => {
    const p = defaultParams(DISTRIBUTIONS[key]);
    setDistKey(key);
    setParams(p);
    setLimits(toInputs(fitAxes(DISTRIBUTIONS[key], p)));
  };
  const toggleFixed = on => {
    if (on) setLimits(toInputs(fitAxes(dist, params)));   // freeze the current fit
    setFixed(on);
  };

  const parsed = Object.fromEntries(Object.entries(limits).map(([k, v]) => [k, parseFloat(v)]));
  const limitsValid = Object.values(parsed).every(Number.isFinite) && parsed.xmin < parsed.xmax && parsed.ymax > 0;
  // While a limit is being edited into an invalid state, keep the last valid limits.
  const lastValid = useRef(parsed);
  if (limitsValid) lastValid.current = parsed;
  const axes = fixed ? lastValid.current : fitAxes(dist, params);

  const model = useMemo(() => {
    const lo = axes.xmin, hi = axes.xmax;
    const xs = d3.range(N + 1).map(i => lo + (hi - lo) * i / N);
    const stats = Object.fromEntries(MARKERS.map(m => [m.key, dist[m.key].value(params)]));
    return {
      lo, hi, xs, ymax: axes.ymax,
      pdf: xs.map(x => dist.pdf(x, params)),
      cdf: xs.map(x => dist.cdf(x, params)),
      stats,
      q1: dist.quantile(0.25, params),
      q3: dist.quantile(0.75, params),
      xp: dist.quantile(pct / 100, params),
    };
  }, [dist, params, pct, axes.xmin, axes.xmax, axes.ymax]);

  const rows = [
    ...MARKERS.map(m => ({ ...m, formula: dist[m.key].formula, value: model.stats[m.key] })),
    { key: 'q1', label: 'Q1 (25th percentile)', formula: dist.quantileFormula.replace(/\bp\b/g, '0.25'), value: model.q1 },
    { key: 'q3', label: 'Q3 (75th percentile)', formula: dist.quantileFormula.replace(/\bp\b/g, '0.75'), value: model.q3 },
    { key: 'xp', label: `${pct}th percentile`, formula: dist.quantileFormula.replace(/\bp\b/g, String(pct / 100)), value: model.xp },
  ];

  return (
    <div className="page dist">
      <h1>Probability Distributions: PDF &amp; CDF</h1>
      <p className="dist-lead">Choose a distribution and set its parameters. The vertical lines mark the
        mean, median and mode; the shaded area under the PDF equals the selected percentile, which is
        where the CDF reaches that probability. Hover a chart to read f(x) and F(x).</p>

      <div className="dist-controls">
        <div className="dist-tabs" role="tablist">
          {Object.entries(DISTRIBUTIONS).map(([key, d]) => (
            <button key={key} role="tab" aria-selected={key === distKey}
              className={key === distKey ? 'active' : ''} onClick={() => selectDist(key)}>{d.name}</button>
          ))}
        </div>
        {dist.params.map(p => (
          <label key={p.key} className="dist-slider">
            <span>{p.label} = <strong>{params[p.key]}</strong></span>
            <input type="range" min={p.min} max={p.max} step={p.step} value={params[p.key]}
              onChange={e => setParams({ ...params, [p.key]: parseFloat(e.target.value) })} />
          </label>
        ))}
        <label className="dist-slider">
          <span>Percentile p = <strong>{pct}%</strong></span>
          <input type="range" min="1" max="99" step="1" value={pct} onChange={e => setPct(+e.target.value)} />
        </label>
      </div>

      <div className="dist-axes">
        <label className="dist-check">
          <input type="checkbox" checked={fixed} onChange={e => toggleFixed(e.target.checked)} /> Fix axes
        </label>
        {[['xmin', 'x min'], ['xmax', 'x max'], ['ymax', 'PDF y max']].map(([k, label]) => (
          <label key={k}>{label}
            <input type="number" value={limits[k]} disabled={!fixed} aria-invalid={fixed && !limitsValid}
              onChange={e => setLimits({ ...limits, [k]: e.target.value })} />
          </label>
        ))}
        {fixed && !limitsValid && <span className="dist-err">Need x min &lt; x max and y max &gt; 0</span>}
      </div>

      <div className="dist-legend">
        {MARKERS.map(m => <span key={m.key}><span className="swatch" style={{ background: m.color }} />{m.label}</span>)}
        <span><span className="swatch swatch--pct" />{pct}th percentile</span>
      </div>

      <div className="dist-charts">
        <Chart title={`PDF  —  ${dist.pdfFormula}`} kind="pdf" model={model} pct={pct}
          hoverX={hoverX} setHoverX={setHoverX} dist={dist} params={params} />
        <Chart title={`CDF  —  ${dist.cdfFormula}`} kind="cdf" model={model} pct={pct}
          hoverX={hoverX} setHoverX={setHoverX} dist={dist} params={params} />
      </div>

      <table className="dist-table">
        <thead><tr><th>Statistic</th><th>Formula</th><th>Value</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key}>
              <td>{r.color && <span className="swatch" style={{ background: r.color }} />}{r.label}</td>
              <td className="formula">{r.formula}</td>
              <td className="num">{fmt(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Theory />
    </div>
  );
}

function Chart({ title, kind, model, pct, hoverX, setHoverX, dist, params }) {
  const { lo, hi, xs, stats, xp } = model;
  const ys = model[kind];
  const x = d3.scaleLinear().domain([lo, hi]).range([MARGIN.left, W - MARGIN.right]);
  const yMax = kind === 'cdf' ? 1 : model.ymax;
  const y = d3.scaleLinear().domain([0, yMax]).range([H - MARGIN.bottom, MARGIN.top]);
  const pts = xs.map((xv, i) => [xv, ys[i]]);
  const line = d3.line().defined(d => Number.isFinite(d[1])).x(d => x(d[0])).y(d => y(d[1]));
  const clipId = `clip-${kind}`;

  let shade = null;
  if (kind === 'pdf') {
    const under = [...pts.filter(d => d[0] <= xp), [xp, dist.pdf(xp, params)]].filter(d => Number.isFinite(d[1]));
    shade = d3.area().x(d => x(d[0])).y0(y(0)).y1(d => y(d[1]))(under);
  }

  const onMove = ev => {
    const [px] = d3.pointer(ev);
    const xv = x.invert(px);
    setHoverX(xv >= lo && xv <= hi ? xv : null);
  };
  const hoverY = hoverX === null ? null : (kind === 'pdf' ? dist.pdf(hoverX, params) : dist.cdf(hoverX, params));

  return (
    <figure className="dist-chart">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHoverX(null)}
        role="img" aria-label={`${kind.toUpperCase()} chart`}>
        <defs><clipPath id={clipId}><rect x={MARGIN.left} y={MARGIN.top - 8} width={W - MARGIN.left - MARGIN.right} height={H - MARGIN.top - MARGIN.bottom + 8} /></clipPath></defs>
        {/* grid + axes */}
        {y.ticks(5).map(t => (
          <g key={t}>
            <line className="grid" x1={MARGIN.left} x2={W - MARGIN.right} y1={y(t)} y2={y(t)} />
            <text className="tick" x={MARGIN.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">{fmt(t)}</text>
          </g>
        ))}
        {x.ticks(7).map(t => (
          <text key={t} className="tick" x={x(t)} y={H - MARGIN.bottom + 16} textAnchor="middle">{fmt(t)}</text>
        ))}
        <line className="axis" x1={MARGIN.left} x2={W - MARGIN.right} y1={y(0)} y2={y(0)} />
        <text className="axis-label" x={W - MARGIN.right} y={H - 4} textAnchor="end">x</text>
        <text className="axis-label" x={8} y={(H - MARGIN.bottom + MARGIN.top) / 2}>{kind === 'pdf' ? 'f(x)' : 'F(x)'}</text>

        <g clipPath={`url(#${clipId})`}>
          {shade && <path className="shade" d={shade} />}
          <path className="curve" d={line(pts)} />
          {/* percentile guide */}
          {kind === 'cdf' && (
            <polyline className="pct-guide" points={`${x(lo)},${y(pct / 100)} ${x(xp)},${y(pct / 100)} ${x(xp)},${y(0)}`} />
          )}
          {kind === 'pdf' && <line className="pct-guide" x1={x(xp)} x2={x(xp)} y1={y(0)} y2={MARGIN.top} />}
        </g>

        {/* mean / median / mode, labels stacked so coincident markers stay readable */}
        {MARKERS.filter(m => stats[m.key] >= lo && stats[m.key] <= hi).map(m => { const i = MARKERS.indexOf(m); return (
          <g key={m.key}>
            <line x1={x(stats[m.key])} x2={x(stats[m.key])} y1={y(0)} y2={MARGIN.top - 4 - 12 * (2 - i)}
              stroke={m.color} strokeWidth="2" />
            <text className="marker-label" x={x(stats[m.key]) + 4} y={MARGIN.top - 6 - 12 * (2 - i)}>
              {m.label} {fmt(stats[m.key])}
            </text>
          </g>
        ); })}

        {/* hover crosshair */}
        {hoverX !== null && Number.isFinite(hoverY) && (
          <g className="hover">
            <line x1={x(hoverX)} x2={x(hoverX)} y1={y(0)} y2={MARGIN.top} />
            {hoverY <= yMax && <circle cx={x(hoverX)} cy={y(hoverY)} r="4" />}
          </g>
        )}
        <rect x={MARGIN.left} y={MARGIN.top} width={W - MARGIN.left - MARGIN.right}
          height={H - MARGIN.top - MARGIN.bottom} fill="transparent" />
      </svg>
      <div className="readout">
        {hoverX !== null && Number.isFinite(hoverY)
          ? <>x = {fmt(hoverX)}, {kind === 'pdf' ? 'f' : 'F'}(x) = {fmt(hoverY)}</>
          : 'Hover the chart to read values'}
      </div>
    </figure>
  );
}

const REFERENCES = [
  { title: 'NIST/SEMATECH e-Handbook of Statistical Methods — Gallery of distributions',
    url: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda366.htm' },
  { title: 'Abramowitz & Stegun, Handbook of Mathematical Functions (erf approximation 7.1.26)',
    url: 'https://personal.math.ubc.ca/~cbm/aands/' },
  { title: 'SciPy — scipy.stats continuous distributions',
    url: 'https://docs.scipy.org/doc/scipy/reference/stats.html' },
];

function Theory() {
  return (
    <section className="theory">
      <h2>Theoretical framework</h2>
      <p>
        A continuous random variable X is described by its <strong>probability density function</strong> (PDF)
        f(x) ≥ 0, with ∫ f(x) dx = 1. Probabilities are areas under the density:
        P(a ≤ X ≤ b) = ∫<sub>a</sub><sup>b</sup> f(x) dx. The <strong>cumulative distribution function</strong> (CDF)
        F(x) = P(X ≤ x) = ∫<sub>−∞</sub><sup>x</sup> f(t) dt is non-decreasing from 0 to 1, and f = F′.
      </p>
      <ul>
        <li><strong>Mean</strong> (expected value): E[X] = ∫ x f(x) dx — the balance point of the density.</li>
        <li><strong>Median</strong>: the value m with F(m) = 0.5 — half the probability lies on each side.</li>
        <li><strong>Mode</strong>: the value where f(x) is maximal — the most likely region.</li>
        <li><strong>Quantile function</strong> Q(p) = F⁻¹(p): the value below which a fraction p of the
          probability lies. The p-th <strong>percentile</strong> is Q(p/100); the quartiles are Q(0.25),
          Q(0.5) = median and Q(0.75).</li>
      </ul>
      <p>
        For a symmetric unimodal distribution (Normal) mean, median and mode coincide. For a right-skewed
        distribution (Log-normal, Exponential, Weibull with small k) the long right tail pulls the mean
        above the median, which lies above the mode: mode &lt; median &lt; mean.
      </p>
      <h3>The distributions</h3>
      <ul>
        <li><strong>Normal</strong>: sums of many small independent effects (central limit theorem).</li>
        <li><strong>Log-normal</strong>: X is log-normal when ln X is normal; products of many positive factors.</li>
        <li><strong>Exponential</strong>: waiting times between events of a Poisson process; memoryless.</li>
        <li><strong>Weibull</strong>: lifetimes and wind speed distributions; k = 1 reduces to the
          exponential distribution, and k ≈ 2 (the Rayleigh case) is typical for wind speeds.</li>
      </ul>
      <p>
        Here Φ⁻¹ denotes the quantile function of the standard normal distribution and Γ the gamma
        function. The page evaluates erf, Φ⁻¹ and Γ with standard numerical approximations
        (Abramowitz–Stegun, Acklam, Lanczos).
      </p>
      <h2>References</h2>
      <ul className="refs">
        {REFERENCES.map(r => <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer">{r.title}</a></li>)}
      </ul>
    </section>
  );
}
