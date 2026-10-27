import { describe, expect, test } from 'vitest';
import { PROJECTIONS, getGamma } from './geo.js';

// Check the numerical gamma against the spherical formulas in Theory.jsx
// (MC_pyproj = −gamma).
const byId = id => PROJECTIONS.find(p => p.id === id).makeProj(800, 600);
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const coneConstant = (p1, p2) =>
  Math.log(Math.cos(rad(p1)) / Math.cos(rad(p2))) /
  Math.log(Math.tan(Math.PI / 4 + rad(p2) / 2) / Math.tan(Math.PI / 4 + rad(p1) / 2));

describe('meridian convergence', () => {
  test('Mercator: zero everywhere', () => {
    expect(getGamma(byId('merc'), 50, 60)).toBeCloseTo(0, 6);
  });
  test.each([[36, 60], [30, 45], [35, 50]])('UTM 36N at (%d, %d): tan γ = tan Δλ sin φ', (lon, lat) => {
    const mc = deg(Math.atan(Math.tan(rad(lon - 33)) * Math.sin(rad(lat))));
    expect(-getGamma(byId('utm36n'), lon, lat)).toBeCloseTo(mc, 1);
  });
  test.each([[45, 50], [0, 40]])('LCC at (%d, %d): γ = n Δλ', (lon, lat) => {
    expect(-getGamma(byId('lcc'), lon, lat)).toBeCloseTo(coneConstant(30, 60) * (lon - 25), 1);
  });
  test('LCC southern hemisphere: n < 0', () => {
    const mc = -getGamma(byId('lcc_sh'), 40, -25);
    expect(mc).toBeLessThan(0);
    expect(mc).toBeCloseTo(coneConstant(-18, -32) * 15, 1);
  });
  test('North polar stereographic: γ = Δλ', () => {
    expect(-getGamma(byId('stereo'), 45, 60)).toBeCloseTo(20, 1);
  });
});
