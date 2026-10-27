import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { PROJECTIONS, makeCustomUTMDef, getGamma, sv, w360, disp, fmtMC, ARROW, REF_LEN } from './geo.js';
import { addMarkers, arrowOut, arrowFrom, drawRose, renderBaseMap, addUTMZoneOverlay, halo } from './draw.js';
import Theory from './Theory.jsx';
import './MeridianConvergence.css';

const TW = 210, TH = 140;

export default function MeridianConvergence() {
  const [pdef, setPdef] = useState(null);
  return (
    <div className="page mc">
      <h1>Meridian Convergence — Wind Direction Frame Explorer</h1>
      {pdef
        ? <Explorer pdef={pdef} onBack={() => setPdef(null)} />
        : <Landing onSelect={setPdef} />}
      <Theory />
    </div>
  );
}

// ─── Landing: projection cards ──────────────────────────────────────────────
function Landing({ onSelect }) {
  return (
    <>
      <p className="mc-lead">Select a projection. Click anywhere on the map to place a station and observe how
        the wind direction label rotates between true-north and grid-north frames.</p>
      <div className="mc-grid">
        {PROJECTIONS.map((p, i) => <ProjCard key={p.id} pdef={p} idx={i} onSelect={onSelect} />)}
        <CustomUTMCard onSelect={onSelect} />
      </div>
    </>
  );
}

function ProjCard({ pdef, idx, onSelect }) {
  const ref = useRef(null);
  useEffect(() => {
    const tsvg = d3.select(ref.current).attr('width',TW).attr('height',TH);
    tsvg.selectAll('*').remove();
    addMarkers(tsvg, `-t${idx}`);
    const tp = pdef.makeProj(TW, TH);
    const { path, gMap } = renderBaseMap(tsvg, tp, TW, TH, `-t${idx}`);
    if (pdef.utmZone) addUTMZoneOverlay(gMap, path, null, pdef.utmZone, false);
  }, [pdef, idx]);
  return (
    <button className="mc-card" onClick={() => onSelect(pdef)}>
      <div className="mc-thumb"><svg ref={ref} /></div>
      <div className="mc-card-text">
        <div className="mc-card-name">{pdef.name}</div>
        <div className="mc-card-detail">{pdef.detail}</div>
      </div>
    </button>
  );
}

function CustomUTMCard({ onSelect }) {
  const [zone, setZone] = useState('32');
  const [hemi, setHemi] = useState('N');
  const [err, setErr] = useState('');
  const go = () => {
    const z = parseInt(zone, 10);
    if (!Number.isInteger(z) || z < 1 || z > 60) { setErr('Zone must be 1–60'); return; }
    setErr('');
    onSelect(makeCustomUTMDef(z, hemi === 'S'));
  };
  return (
    <div className="mc-card mc-card--custom">
      <div className="mc-thumb mc-custom-form">
        <div className="mc-custom-title">On-the-fly projection</div>
        <div className="mc-custom-row">
          <label>Zone</label>
          <input type="number" min="1" max="60" step="1" value={zone}
            onChange={e => setZone(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
          <select value={hemi} onChange={e => setHemi(e.target.value)}>
            <option value="N">N</option>
            <option value="S">S</option>
          </select>
        </div>
        <button className="mc-btn" onClick={go}>Explore →</button>
        <div className="mc-err">{err}</div>
      </div>
      <div className="mc-card-text">
        <div className="mc-card-name">Custom UTM Zone</div>
        <div className="mc-card-detail">Type a zone (1–60) + hemisphere · session only</div>
      </div>
    </div>
  );
}

// ─── Explorer: interactive map ──────────────────────────────────────────────
function Explorer({ pdef, onBack }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [size, setSize] = useState(null);
  const [placed, setPlaced] = useState(null);   // { lon, lat }
  const [wdTrue, setWdTrue] = useState(270);

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ W: width, H: height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size || size.W < 10 || size.H < 10) return;
    const { W, H } = size;
    const proj = pdef.makeProj(W, H);

    const svg = d3.select(svgRef.current).attr('width',W).attr('height',H);
    svg.selectAll('*').remove();
    addMarkers(svg, '-e');
    const { path, gMap } = renderBaseMap(svg, proj, W, H, '-e');
    if (pdef.utmZone) addUTMZoneOverlay(gMap, path, proj, pdef.utmZone, true);

    const gArrows = svg.append('g').attr('clip-path','url(#cp-e)');
    const gGhost  = svg.append('g').attr('clip-path','url(#cp-e)').attr('opacity',.38);
    const gRose   = svg.append('g').attr('transform','translate(46,50)');
    drawRose(gRose, null, '-e');

    if (placed) {
      const [sx, sy] = proj([placed.lon, placed.lat]);
      if (isFinite(sx) && isFinite(sy)) {
        const gv = getGamma(proj, placed.lon, placed.lat);
        const wdGrid = w360(wdTrue + gv);

        // Station dot
        gArrows.append('circle')
          .attr('cx',sx).attr('cy',sy).attr('r',5.5)
          .attr('fill','#fff').attr('stroke','#222').attr('stroke-width',1.3);
        // True North reference (short, outward from station)
        arrowOut(gArrows, sx, sy, gv, REF_LEN, '#ff6b6b', 'ar-e', 'TN');
        // Wind arrow — FROM convention: True North is at screen angle gv,
        // so the physical FROM-screen angle is gv + wdTrue.
        arrowFrom(gArrows, sx, sy, gv + wdTrue, ARROW, '#ffa040', 'aw-e', `${disp(wdTrue)}°`);
        // MC label
        gArrows.append('text')
          .attr('x',sx+8).attr('y',sy+16)
          .attr('fill','#6bffaa').attr('font-size','10px').attr('font-weight','700')
          .call(halo).text(`MC=${fmtMC(-gv)}`);
        // WD_grid label near tail of arrow
        const [tdx, tdy] = sv(gv + wdTrue);
        gArrows.append('text')
          .attr('x', sx + tdx*ARROW).attr('y', sy + tdy*ARROW + 16)
          .attr('fill','#6baaff').attr('font-size','9px').attr('font-weight','600')
          .attr('text-anchor','middle')
          .call(halo).text(`Grid: ${disp(wdGrid)}°`);
        drawRose(gRose, gv, '-e');
      }
    }

    const renderGhost = (sx, sy, lon, lat) => {
      gGhost.selectAll('*').remove();
      const gv = getGamma(proj, lon, lat);
      gGhost.append('circle')
        .attr('cx',sx).attr('cy',sy).attr('r',4)
        .attr('fill','none').attr('stroke','#fff').attr('stroke-width',1);
      const [tdx,tdy] = sv(gv);
      gGhost.append('line')
        .attr('x1',sx).attr('y1',sy).attr('x2',sx+tdx*REF_LEN).attr('y2',sy+tdy*REF_LEN)
        .attr('stroke','#ff6b6b').attr('stroke-width',1.5).attr('marker-end','url(#ar-e)');
      const [wdx,wdy] = sv(gv + wdTrue);
      gGhost.append('line')
        .attr('x1',sx+wdx*ARROW).attr('y1',sy+wdy*ARROW).attr('x2',sx).attr('y2',sy)
        .attr('stroke','#ffa040').attr('stroke-width',2).attr('marker-end','url(#aw-e)');
    };

    svg.on('mousemove', ev => {
      const [mx,my] = d3.pointer(ev);
      const ll = proj.invert([mx,my]);
      if (!ll || !isFinite(ll[0])) { gGhost.selectAll('*').remove(); return; }
      renderGhost(mx, my, ll[0], ll[1]);
    });
    svg.on('mouseleave', () => gGhost.selectAll('*').remove());
    svg.on('click', ev => {
      const ll = proj.invert(d3.pointer(ev));
      if (!ll || !isFinite(ll[0])) return;
      setPlaced({ lon: ll[0], lat: ll[1] });
    });
  }, [pdef, size, placed, wdTrue]);

  // Values for the info bar (same projection as the map, so same gamma)
  let info = null;
  if (placed && size) {
    const gv = getGamma(pdef.makeProj(size.W, size.H), placed.lon, placed.lat);
    info = { MC: -gv, wdGrid: w360(wdTrue + gv) };
  }
  const setWD = val => setWdTrue(w360(parseFloat(val) || 0));

  return (
    <div className="mc-explorer">
      <div className="mc-topbar">
        <button className="mc-btn" onClick={onBack}>← Projections</button>
        <span className="mc-proj-name">{pdef.name}</span>
        <span className="mc-proj-detail">{pdef.detail}</span>
      </div>
      <div className="mc-map" ref={wrapRef}><svg ref={svgRef} /></div>
      <div className="mc-infobar">
        {info ? (
          <>
            <div className="irow">
              <span className="kv"><span className="k">Location:</span>
                <span className="v">{Math.abs(placed.lon).toFixed(2)}{placed.lon >= 0 ? '°E' : '°W'},{' '}
                  {Math.abs(placed.lat).toFixed(2)}{placed.lat >= 0 ? '°N' : '°S'}</span></span>
              <span className="kv"><span className="k">MC<sub>wasp</sub>:</span><span className="v grn">{fmtMC(info.MC)}</span></span>
            </div>
            <div className="irow">
              <span className="kv"><span className="k">WD<sub>true</sub>:</span><span className="v red">{disp(wdTrue)}°</span></span>
              <span className="kv"><span className="k">WD<sub>grid</sub>:</span><span className="v blue">{disp(info.wdGrid)}°</span></span>
              <span className="kv formula">WD<sub>grid</sub> = WD<sub>true</sub> + γ &nbsp;|&nbsp; MC<sub>wasp</sub> = −γ</span>
            </div>
          </>
        ) : <div className="hint">Click anywhere on the map to place a wind station.</div>}
      </div>
      <div className="mc-ctrlbar">
        <label>True-North WD (°)
          <input type="number" min="0" max="359" step="1" value={disp(wdTrue)} onChange={e => setWD(e.target.value)} />
        </label>
        <input type="range" min="0" max="359" step="1" value={disp(wdTrue)} onChange={e => setWD(e.target.value)} />
        <div className="legend">
          <span><span className="ls" style={{ background:'#ff6b6b' }} /><span style={{ color:'#ff6b6b' }}>True North ref</span></span>
          <span><span className="ls" style={{ background:'#ffa040' }} /><span style={{ color:'#ffa040' }}>Wind (FROM, true-north frame)</span></span>
        </div>
      </div>
    </div>
  );
}
