import * as d3 from 'd3';

export const M       = 12;   // margin for fitExtent
export const ARROW   = 62;   // wind arrow length px
export const REF_LEN = 36;   // true-north reference arrow length px
const EPS_DEG = 0.07;        // finite-diff step for meridian convergence

// ─── GeoJSON bounding box helper ─────────────────────────────────────────────
function geoBox(lonW, lonE, latS, latN) {
  // Use MultiPoint — avoids polygon winding / clip issues with fitExtent
  const lons = [lonW, (lonW+lonE)/2, lonE];
  const lats = [latS, (latS+latN)/2, latN];
  const pts = [];
  lons.forEach(lo => lats.forEach(la => pts.push([lo, la])));
  return { type:'Feature', geometry:{ type:'MultiPoint', coordinates: pts }};
}

// ─── Projection definitions ───────────────────────────────────────────────────
export const PROJECTIONS = [
  {
    id: 'lcc',
    name: 'Lambert Conformal Conic',
    detail: 'lon₀=25°E · sp 30°N/60°N · WRF-like (Europe)',
    box: geoBox(-20, 65, 18, 78),
    makeProj(W, H) {
      const p = d3.geoConicConformal().parallels([30, 60]).rotate([-25, 0]).precision(0.3);
      p.fitExtent([[M,M],[W-M,H-M]], this.box);
      // clipExtent is ESSENTIAL for conic projections: without it, features near
      // the antipodal pole project to ρ=∞ and break the renderer entirely.
      p.clipExtent([[0,0],[W,H]]);
      return p;
    },
  },
  {
    id: 'laea',
    name: 'Lambert Azimuthal Equal Area',
    detail: '≈ EPSG:3035 · lon₀=10°E · lat₀=52°N (Europe)',
    box: geoBox(-28, 52, 18, 78),
    makeProj(W, H) {
      const p = d3.geoAzimuthalEqualArea().rotate([-10, -52]).precision(0.3);
      p.fitExtent([[M,M],[W-M,H-M]], this.box);
      p.clipExtent([[0,0],[W,H]]);
      return p;
    },
  },
  {
    id: 'utm36n',
    name: 'UTM Zone 36N',
    detail: 'EPSG:32636 · lon₀=33°E · Europe / Middle East strip',
    box: geoBox(25, 41, 30, 65),
    utmZone: { cm: 33, w: 30, e: 36, labelLat: 62 },
    makeProj(W, H) {
      const p = d3.geoTransverseMercator().rotate([-33, 0]).precision(0.3);
      p.fitExtent([[M,M],[W-M,H-M]], this.box);
      p.clipExtent([[0,0],[W,H]]);
      return p;
    },
  },
  {
    id: 'utm32n',
    name: 'UTM Zone 32N',
    detail: 'EPSG:32632 · lon₀=9°E · Central Europe (Germany / Norway)',
    box: geoBox(0, 18, 38, 80),
    utmZone: { cm: 9, w: 6, e: 12, labelLat: 66 },
    makeProj(W, H) {
      const p = d3.geoTransverseMercator().rotate([-9, 0]).precision(0.3);
      p.fitExtent([[M,M],[W-M,H-M]], this.box);
      p.clipExtent([[0,0],[W,H]]);
      return p;
    },
  },
  {
    id: 'stereo',
    name: 'Polar Stereographic',
    detail: 'lon₀=25°E · North polar · lat_ts≈60°N (Europe)',
    box: geoBox(-20, 65, 18, 78),
    makeProj(W, H) {
      const p = d3.geoStereographic().rotate([-25, -90]).clipAngle(90).precision(0.3);
      p.fitExtent([[M,M],[W-M,H-M]], this.box);
      p.clipExtent([[0,0],[W,H]]);
      return p;
    },
  },
  {
    id: 'merc',
    name: 'Mercator',
    detail: 'lon₀=25°E · MC = 0 everywhere (meridians are vertical)',
    box: geoBox(-20, 65, 18, 75),
    makeProj(W, H) {
      const p = d3.geoMercator().rotate([-25, 0]).precision(0.3);
      p.fitExtent([[M,M],[W-M,H-M]], this.box);
      p.clipExtent([[0,0],[W,H]]);
      return p;
    },
  },
  {
    id: 'utm36s',
    name: 'UTM Zone 36S',
    detail: 'EPSG:32736 · lon₀=33°E · East Africa',
    box: geoBox(27, 39, -32, 4),
    utmZone: { cm: 33, w: 30, e: 36, labelLat: 2 },
    makeProj(W, H) {
      const p = d3.geoTransverseMercator().rotate([-33, 0]).precision(0.3);
      p.fitExtent([[M,M],[W-M,H-M]], this.box);
      p.clipExtent([[0,0],[W,H]]);
      return p;
    },
  },
  {
    id: 'lcc_sh',
    name: 'Lambert Conformal Conic — Southern Hemisphere',
    detail: 'lon₀=25°E · lat₀=−28°S · sp −18°S/−32°S (South Africa)',
    box: geoBox(-10, 58, -47, -4),
    makeProj(W, H) {
      const p = d3.geoConicConformal().parallels([-18, -32]).rotate([-25, 0]).precision(0.3);
      p.fitExtent([[M,M],[W-M,H-M]], this.box);
      // Same as LCC NH: antipodal pole (north pole) → ρ=∞ without clip
      p.clipExtent([[0,0],[W,H]]);
      return p;
    },
  },
];

// ─── On-the-fly UTM zone definition ────────────────────────────────────────────
// Builds a session-only projection def from a zone number (1–60) + hemisphere.
export function makeCustomUTMDef(zone, south) {
  const cm = zone * 6 - 183;            // UTM central meridian for the zone
  const w  = cm - 3, e = cm + 3;        // zone is 6° wide
  const epsg = (south ? 32700 : 32600) + zone;
  const cmStr = cm >= 0 ? `${cm}°E` : `${-cm}°W`;
  // Box a bit wider than the 6° zone so the convergence is visible with context.
  const box = south ? geoBox(cm - 9, cm + 9, -80, -5)
                    : geoBox(cm - 9, cm + 9,   5, 85);
  return {
    id: 'custom-utm',
    name: `UTM Zone ${zone}${south ? 'S' : 'N'}`,
    detail: `EPSG:${epsg} · lon₀=${cmStr} · on-the-fly (session only)`,
    box,
    utmZone: { cm, w, e, labelLat: south ? -68 : 70 },
    makeProj(W, H) {
      const p = d3.geoTransverseMercator().rotate([-cm, 0]).precision(0.3);
      p.fitExtent([[M,M],[W-M,H-M]], this.box);
      p.clipExtent([[0,0],[W,H]]);
      return p;
    },
  };
}

// ─── Math ─────────────────────────────────────────────────────────────────────
/**
 * gamma(proj, lon, lat) — angle of True North from screen-up (= Grid North), CW positive.
 *   MC_wasp  = −gamma  (positive when Grid North is CW of True North, pyproj convention)
 *   WD_grid  = w360(WD_true + gamma)
 */
export function getGamma(proj, lon, lat) {
  const [x0, y0] = proj([lon, lat]);
  const p1 = proj([lon, lat + EPS_DEG]);
  if (!p1 || !isFinite(p1[0])) return 0;
  return Math.atan2(p1[0]-x0, -(p1[1]-y0)) * 180 / Math.PI;
}

// Angle CW from screen-up → unit screen vector [dx, dy]
export function sv(deg) {
  const r = deg * Math.PI / 180;
  return [Math.sin(r), -Math.cos(r)];
}

// Always keep angles in [0, 360)
export function w360(d) { return ((d % 360) + 360) % 360; }
export function disp(d) { return w360(Math.round(d)); }   // safe display: always 0–359
export function fmtMC(v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '°'; }
