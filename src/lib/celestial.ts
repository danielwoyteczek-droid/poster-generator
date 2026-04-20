// Astronomical calculations for Sun, Moon, and Planets
// Formulas from Meeus "Astronomical Algorithms" (simplified)

const DEG = Math.PI / 180

function jd(date: Date) {
  return date.getTime() / 86400000 + 2440587.5
}

function norm360(x: number) {
  return ((x % 360) + 360) % 360
}

// ─── Sun ──────────────────────────────────────────────────────────────────────

export function getSunCoords(date: Date): { ra: number; dec: number } {
  const T = (jd(date) - 2451545.0) / 36525
  const L0 = norm360(280.46646 + 36000.76983 * T)
  const M = norm360(357.52911 + 35999.05029 * T) * DEG
  const C =
    (1.914602 - 0.004817 * T) * Math.sin(M) +
    0.019993 * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M)
  const sunLon = (L0 + C) * DEG
  const omega = norm360(125.04 - 1934.136 * T) * DEG
  const apparent = sunLon - 0.00569 * DEG - 0.00478 * DEG * Math.sin(omega)
  const eps = (23.439291111 - 0.013004167 * T + 0.00256 * Math.cos(omega)) * DEG
  const ra = norm360(Math.atan2(Math.cos(eps) * Math.sin(apparent), Math.cos(apparent)) / DEG)
  const dec = Math.asin(Math.sin(eps) * Math.sin(apparent)) / DEG
  return { ra: ra / 15, dec }
}

// ─── Moon ─────────────────────────────────────────────────────────────────────

export function getMoonCoords(date: Date): { ra: number; dec: number } {
  const T = (jd(date) - 2451545.0) / 36525
  const Lprime = norm360(218.3164477 + 481267.88123421 * T)
  const M = norm360(357.5291092 + 35999.0502909 * T) * DEG
  const Mprime = norm360(134.9633964 + 477198.8675055 * T) * DEG
  const D = norm360(297.8501921 + 445267.1114034 * T) * DEG
  const F = norm360(93.2720950 + 483202.0175233 * T) * DEG

  const lon = norm360(
    Lprime +
    6.289 * Math.sin(Mprime) -
    1.274 * Math.sin(2 * D - Mprime) +
    0.658 * Math.sin(2 * D) -
    0.214 * Math.sin(2 * Mprime) -
    0.186 * Math.sin(M),
  )
  const lat = 5.128 * Math.sin(F)

  const eps = (23.439291111 - 0.013004167 * T) * DEG
  const lonRad = lon * DEG
  const latRad = lat * DEG
  const ra = norm360(
    Math.atan2(
      Math.sin(lonRad) * Math.cos(eps) - Math.tan(latRad) * Math.sin(eps),
      Math.cos(lonRad),
    ) / DEG,
  )
  const dec = Math.asin(
    Math.sin(latRad) * Math.cos(eps) +
    Math.cos(latRad) * Math.sin(eps) * Math.sin(lonRad),
  ) / DEG
  return { ra: ra / 15, dec }
}

// ─── Planets ──────────────────────────────────────────────────────────────────

interface OrbitalElements {
  N: number; i: number; w: number
  a: number; e: number; M: number
}

function planetElements(d: number): Record<string, OrbitalElements> {
  return {
    Mercury: {
      N: norm360(48.3313 + 3.24587e-5 * d), i: 7.0047 + 5.00e-8 * d,
      w: norm360(29.1241 + 1.01444e-5 * d), a: 0.387098,
      e: 0.205635 + 5.59e-10 * d, M: norm360(168.6562 + 4.0923344368 * d),
    },
    Venus: {
      N: norm360(76.6799 + 2.46590e-5 * d), i: 3.3946 + 2.75e-8 * d,
      w: norm360(54.8910 + 1.38374e-5 * d), a: 0.723330,
      e: 0.006773 - 1.302e-9 * d, M: norm360(48.0052 + 1.6021302244 * d),
    },
    Mars: {
      N: norm360(49.5574 + 2.11081e-5 * d), i: 1.8497 - 1.78e-8 * d,
      w: norm360(286.5016 + 2.92961e-5 * d), a: 1.523688,
      e: 0.093405 + 2.516e-9 * d, M: norm360(18.6021 + 0.5240207766 * d),
    },
    Jupiter: {
      N: norm360(100.4542 + 2.76854e-5 * d), i: 1.3030 - 1.557e-7 * d,
      w: norm360(273.8777 + 1.64505e-5 * d), a: 5.20256,
      e: 0.048498 + 4.469e-9 * d, M: norm360(19.8950 + 0.0830853001 * d),
    },
    Saturn: {
      N: norm360(113.6634 + 2.38980e-5 * d), i: 2.4886 - 1.081e-7 * d,
      w: norm360(339.3939 + 2.97661e-5 * d), a: 9.55475,
      e: 0.055546 - 9.499e-9 * d, M: norm360(316.9670 + 0.0334442282 * d),
    },
  }
}

function solveKepler(M: number, e: number): number {
  let E = M
  for (let i = 0; i < 50; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E))
    E += dE
    if (Math.abs(dE) < 1e-8) break
  }
  return E
}

function orbitToEcl(el: OrbitalElements): { x: number; y: number; z: number } {
  const Mrad = el.M * DEG
  const E = solveKepler(Mrad, el.e)
  const xv = el.a * (Math.cos(E) - el.e)
  const yv = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E)
  const v = Math.atan2(yv, xv)
  const r = Math.sqrt(xv * xv + yv * yv)
  const Nrad = el.N * DEG
  const irad = el.i * DEG
  const wrad = el.w * DEG
  const xecl = r * (Math.cos(Nrad) * Math.cos(v + wrad) - Math.sin(Nrad) * Math.sin(v + wrad) * Math.cos(irad))
  const yecl = r * (Math.sin(Nrad) * Math.cos(v + wrad) + Math.cos(Nrad) * Math.sin(v + wrad) * Math.cos(irad))
  const zecl = r * Math.sin(v + wrad) * Math.sin(irad)
  return { x: xecl, y: yecl, z: zecl }
}

export interface PlanetCoords { ra: number; dec: number; name: string }

export function getPlanetCoords(date: Date): PlanetCoords[] {
  const d = jd(date) - 2451543.5
  const elements = planetElements(d)

  // Earth
  const earthEl = {
    N: 0, i: 0,
    w: norm360(282.9404 + 4.70935e-5 * d), a: 1.000000,
    e: 0.016709 - 1.151e-9 * d, M: norm360(356.0470 + 0.9856002585 * d),
  }
  const earth = orbitToEcl(earthEl)

  const eps = 23.4393 * DEG

  return Object.entries(elements).map(([name, el]) => {
    const p = orbitToEcl(el)
    // Geocentric ecliptic
    const dx = p.x - earth.x
    const dy = p.y - earth.y
    const dz = p.z - earth.z
    // Equatorial
    const xeq = dx
    const yeq = dy * Math.cos(eps) - dz * Math.sin(eps)
    const zeq = dy * Math.sin(eps) + dz * Math.cos(eps)
    const ra = norm360(Math.atan2(yeq, xeq) / DEG) / 15
    const dec = Math.atan2(zeq, Math.sqrt(xeq * xeq + yeq * yeq)) / DEG
    return { name, ra, dec }
  })
}
