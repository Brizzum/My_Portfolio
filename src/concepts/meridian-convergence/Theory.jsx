// Theoretical background and references for the meridian convergence explorer.
// To add a reference, append an entry to REFERENCES.
const REFERENCES = [
  { title: 'Snyder (1987), Map Projections — A Working Manual, USGS Professional Paper 1395',
    url: 'https://pubs.usgs.gov/pp/1395/report.pdf',
    note: 'Standard reference for the projection formulas, including convergence.' },
  { title: 'QGIS — A Gentle Introduction to GIS: Coordinate Reference Systems',
    url: 'https://docs.qgis.org/3.44/en/docs/gentle_gis_introduction/coordinate_reference_systems.html' },
  { title: 'pyproj — Proj.get_factors (meridian_convergence)',
    url: 'https://pyproj4.github.io/pyproj/stable/api/proj.html#pyproj.Proj.get_factors',
    note: 'Source of the sign convention used for MC here.' },
  { title: 'wrf-python — DCOMPUTEUVMET (grid-relative to earth-relative winds)',
    url: 'https://github.com/NCAR/wrf-python/blob/develop/fortran/wrf_user.f90' },
  { title: 'WRF — module_llxy.F (map projection geometry, incl. LCC)',
    url: 'https://github.com/wrf-model/WRF/blob/develop/share/module_llxy.F' },
  { title: 'd3-geo projections',
    url: 'https://d3js.org/d3-geo/projection',
    note: 'The (spherical) projections used to draw the maps on this page.' },
];

export default function Theory() {
  return (
    <section className="theory">
      <h2>Theoretical framework</h2>

      <h3>True North, Grid North and meridian convergence</h3>
      <p>
        <strong>True North</strong> at a point is the direction along the local meridian towards the
        geographic North Pole. <strong>Grid North</strong> is the direction of the +y axis (northing) of a
        projected coordinate reference system (CRS). The <strong>meridian convergence</strong> (also
        grid convergence) γ is the angle between the two at that point. It arises because, on most
        projections, meridians are not drawn as parallel vertical lines: they converge towards the pole,
        so the direction of True North rotates across the map while Grid North stays fixed.
      </p>

      <h3>Spherical formulas for the projections shown</h3>
      <p>With λ the longitude, φ the latitude and λ₀ the central meridian
        (signs follow the pyproj convention below):</p>
      <ul>
        <li><strong>Mercator:</strong> γ = 0 everywhere — meridians are vertical lines.</li>
        <li><strong>Transverse Mercator / UTM:</strong> tan γ = tan(λ − λ₀) · sin φ, i.e.
          γ ≈ (λ − λ₀) sin φ. Zero on the central meridian and on the equator; UTM restricts each zone
          to ±3° of λ₀ partly to keep γ small.</li>
        <li><strong>Lambert Conformal Conic:</strong> γ = n (λ − λ₀), where the cone constant
          n = ln(cos φ₁ / cos φ₂) / ln(tan(π/4 + φ₂/2) / tan(π/4 + φ₁/2)) for standard parallels
          φ₁, φ₂ (n = sin φ₁ with a single parallel). γ is independent of latitude, and n &lt; 0 in the
          southern hemisphere.</li>
        <li><strong>North Polar Stereographic:</strong> γ = λ − λ₀ — meridians are straight lines
          radiating from the pole (n = 1).</li>
        <li><strong>Lambert Azimuthal Equal Area:</strong> not conformal. The rotation of the north
          direction is still defined, but other directions are additionally distorted (angular
          distortion), so adding a single γ to a wind direction is only an approximation.</li>
      </ul>

      <h3>Sign conventions</h3>
      <ul>
        <li><strong>pyproj / PROJ</strong> (<code>meridian_convergence</code>): MC &gt; 0 when Grid North
          lies clockwise (east) of True North — e.g. east of the central meridian in the northern
          hemisphere. This page labels it MC<sub>wasp</sub>.</li>
        <li><strong>WRF</strong> (<code>SINALPHA</code>/<code>COSALPHA</code>): α &gt; 0 when Grid North is
          counter-clockwise of True North, hence α<sub>WRF</sub> = −MC<sub>pyproj</sub>.</li>
        <li><strong>This page</strong> computes γ numerically as the screen angle of True North measured
          clockwise from screen-up (Grid North), by projecting a point 0.07° further north. Hence
          MC<sub>wasp</sub> = −γ.</li>
      </ul>

      <h3>Converting wind directions</h3>
      <p>
        Wind direction (WD) follows the meteorological convention: the direction the wind blows
        <em> from</em>, measured clockwise from north. A direction measured from True North becomes, in
        the grid frame,
      </p>
      <p className="eq">WD<sub>grid</sub> = (WD<sub>true</sub> − MC) mod 360 &nbsp;⇔&nbsp;
        WD<sub>true</sub> = (WD<sub>grid</sub> + MC) mod 360 = (WD<sub>grid</sub> − α<sub>WRF</sub>) mod 360</p>
      <p>
        Equivalently for vector components (u, v), the grid-relative wind is rotated by α into
        earth-relative components: u<sub>earth</sub> = u cos α − v sin α,
        v<sub>earth</sub> = v cos α + u sin α. In PyWAsP the generalisation step applies +MC and the
        downscaling step applies −MC, so across two projections the net effect is
        WD<sub>out</sub> = WD<sub>in</sub> + (MC<sub>out</sub> − MC<sub>in</sub>).
      </p>

      <h3>Limitations of this explorer</h3>
      <p>
        The maps use d3's spherical projections, whereas pyproj works on an ellipsoid (WGS84/GRS80).
        The resulting convergence values differ slightly from pyproj; the explorer is meant to show the
        geometry, not to produce authoritative values.
      </p>

      <h2>References</h2>
      <ul className="refs">
        {REFERENCES.map(r => (
          <li key={r.url}>
            <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
            {r.note && <span className="ref-note"> — {r.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
