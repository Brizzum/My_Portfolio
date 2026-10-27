// d3 drawing helpers, ported from the standalone mc_wind_explorer.html.
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import { sv, fmtMC } from './geo.js';

const countries = feature(world, world.objects.countries);

// Dark outline behind text so labels stay legible over any map background.
export const halo = sel => sel.attr('stroke','#0a1628').attr('stroke-width',2.5)
  .attr('stroke-linejoin','round').attr('paint-order','stroke');

const fmtLon = lon => `${Math.abs(lon)}°${lon < 0 ? 'W' : 'E'}`;

// ─── SVG marker defs ──────────────────────────────────────────────────────────
export function addMarkers(svgSel, sfx) {
  const defs = svgSel.append('defs');
  [['ar','#ff6b6b'],['ab','#6baaff'],['aw','#ffa040'],['ag','#aaaaaa']].forEach(([id, col]) => {
    defs.append('marker').attr('id', id+sfx)
      .attr('markerWidth',8).attr('markerHeight',8)
      .attr('refX',7).attr('refY',3.5).attr('orient','auto')
      .append('path').attr('d','M0,0 L0,7 L8,3.5 z').attr('fill',col);
  });
}

// ─── Arrow helpers ────────────────────────────────────────────────────────────
// Standard arrow: from station OUTWARD in angleDeg direction
export function arrowOut(g, sx, sy, angleDeg, len, color, mid, label) {
  const [dx, dy] = sv(angleDeg);
  const x1 = sx + dx*len, y1 = sy + dy*len;
  g.append('line')
    .attr('x1',sx).attr('y1',sy).attr('x2',x1).attr('y2',y1)
    .attr('stroke',color).attr('stroke-width',1.8).attr('marker-end',`url(#${mid})`);
  if (label) {
    g.append('text')
      .attr('x', x1 + dx*10 - dy*5).attr('y', y1 + dy*10 + dx*5)
      .attr('fill',color).attr('font-size','9px').attr('font-weight','700')
      .attr('text-anchor','middle').attr('dominant-baseline','middle')
      .call(halo).text(label);
  }
}

// FROM-convention arrow: wind comes FROM angleDeg direction → arrowhead at station
// Tail is placed in the FROM direction; head points back to the station.
export function arrowFrom(g, sx, sy, angleDeg, len, color, mid, label) {
  const [dx, dy] = sv(angleDeg);
  const tx = sx + dx*len, ty = sy + dy*len;
  g.append('line')
    .attr('x1',tx).attr('y1',ty).attr('x2',sx).attr('y2',sy)
    .attr('stroke',color).attr('stroke-width',2.5).attr('marker-end',`url(#${mid})`);
  if (label) {
    g.append('text')
      .attr('x', tx + dx*12).attr('y', ty + dy*12)
      .attr('fill',color).attr('font-size','10px').attr('font-weight','700')
      .attr('text-anchor','middle').attr('dominant-baseline','middle')
      .call(halo).text(label);
  }
}

// ─── Compass rose ─────────────────────────────────────────────────────────────
export function drawRose(g, gv, sfx) {
  g.selectAll('*').remove();
  const R = 22;
  g.append('circle').attr('r',R+4)
    .attr('fill','#0a1628').attr('fill-opacity',.85)
    .attr('stroke','#2a4060').attr('stroke-width',1);

  // TN label on the side True North leans to, GN label on the other side.
  const tnSide = (gv ?? 0) < 0 ? -1 : 1;
  const ra = (deg, color, mid, lbl, side) => {
    const [dx,dy] = sv(deg);
    g.append('line')
      .attr('x1',-dx*4).attr('y1',-dy*4).attr('x2',dx*(R-2)).attr('y2',dy*(R-2))
      .attr('stroke',color).attr('stroke-width',1.8).attr('marker-end',`url(#${mid})`);
    g.append('text')
      .attr('x',dx*(R+6) + side*3).attr('y',dy*(R+6))
      .attr('fill',color).attr('font-size','9px').attr('font-weight','700')
      .attr('text-anchor', side < 0 ? 'end' : 'start').attr('dominant-baseline','middle')
      .call(halo).text(lbl);
  };

  ra(0,    '#6baaff', 'ab'+sfx, 'GN', -tnSide);   // Grid North = screen-up
  ra(gv ?? 0, '#ff6b6b', 'ar'+sfx, 'TN', tnSide); // True North = screen-up + gamma

  if (gv !== null && gv !== undefined && Math.abs(gv) > 0.4) {
    g.append('text').attr('x',0).attr('y',R+15)
      .attr('fill','#6bffaa').attr('font-size','9px').attr('text-anchor','middle')
      .call(halo).text(`γ=${fmtMC(gv)}`);
  }
}

// ─── Render base map ─────────────────────────────────────────────────────────
export function renderBaseMap(svgSel, proj, W, H, sfx) {
  const path = d3.geoPath().projection(proj);
  svgSel.append('rect').attr('width',W).attr('height',H).attr('fill','#7ecfe0');
  svgSel.select('defs').append('clipPath').attr('id','cp'+sfx)
    .append('rect').attr('width',W).attr('height',H);
  const gMap = svgSel.append('g').attr('clip-path',`url(#cp${sfx})`);
  gMap.append('path')
    .datum(d3.geoGraticule().step([10,10])())
    .attr('d',path).attr('fill','none').attr('stroke','#55aabb')
    .attr('stroke-width',.45).attr('stroke-dasharray','3,2').attr('opacity',.8);
  gMap.append('path')
    .datum(countries)
    .attr('d',path)
    .attr('fill','#d8c898').attr('stroke','#8a7850').attr('stroke-width',.5);
  return { path, gMap };
}

// ─── UTM zone meridian overlay ────────────────────────────────────────────────
// Draws the central meridian and zone boundary meridians for UTM projections.
export function addUTMZoneOverlay(gMap, path, proj, utmZone, forExplorer) {
  const mkLine = lon => ({
    type: 'Feature', geometry: { type: 'LineString',
      coordinates: Array.from({length:120}, (_,i) => [lon, -85 + 170*i/119])
    }
  });

  // Boundary meridians (dashed)
  [utmZone.w, utmZone.e].forEach(lon => {
    gMap.append('path').datum(mkLine(lon)).attr('d', path)
      .attr('fill','none').attr('stroke','#ffaa50')
      .attr('stroke-width', forExplorer ? 1.4 : 0.9)
      .attr('stroke-dasharray','6,3').attr('opacity',0.85);
  });

  // Central meridian (solid)
  gMap.append('path').datum(mkLine(utmZone.cm)).attr('d', path)
    .attr('fill','none').attr('stroke','#ff7040')
    .attr('stroke-width', forExplorer ? 2.0 : 1.3)
    .attr('opacity',0.9);

  // Labels (explorer only — too small for thumbnails)
  // The zone is narrow on screen, so the central-meridian label sits above and
  // the boundary labels sit one row lower, outside their meridians.
  if (forExplorer && proj) {
    [[utmZone.w,'#ffaa50','end',-4,10], [utmZone.cm,'#ff7040','middle',0,-6], [utmZone.e,'#ffaa50','start',4,10]]
      .forEach(([lon, col, anchor, ox, oy]) => {
        const pt = proj([lon, utmZone.labelLat]);
        if (!pt || !isFinite(pt[0])) return;
        gMap.append('text')
          .attr('x', pt[0] + ox).attr('y', pt[1] + oy)
          .attr('fill', col).attr('font-size','9px').attr('font-weight','700')
          .attr('text-anchor', anchor).call(halo)
          .text(lon === utmZone.cm ? `${fmtLon(lon)} (CM)` : fmtLon(lon));
      });
  }
}
