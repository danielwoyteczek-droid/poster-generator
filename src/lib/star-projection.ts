const DEG = Math.PI / 180

function getJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

function getGMST(jd: number): number {
  const T = (jd - 2451545.0) / 36525
  const gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    T * T * 0.000387933 -
    (T * T * T) / 38710000
  return ((gmst % 360) + 360) % 360
}

export interface HorizontalCoords {
  alt: number // altitude degrees (-90..90)
  az: number  // azimuth degrees (0..360, N=0, E=90)
}

export function equatorialToHorizontal(
  ra: number,  // right ascension in hours (0-24)
  dec: number, // declination in degrees
  lat: number, // observer latitude degrees
  lng: number, // observer longitude degrees
  date: Date,
): HorizontalCoords {
  const jd = getJulianDate(date)
  const gmst = getGMST(jd)
  const lst = ((gmst + lng) % 360 + 360) % 360

  const raD = ra * 15
  const H = ((lst - raD) % 360 + 360) % 360

  const hRad = H * DEG
  const decRad = dec * DEG
  const latRad = lat * DEG

  const sinAlt =
    Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(hRad)
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG

  const altRad = alt * DEG
  const cosAlt = Math.cos(altRad)
  let az = 0
  if (Math.abs(cosAlt) > 1e-10) {
    const cosAz =
      (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) /
      (cosAlt * Math.cos(latRad))
    az = Math.acos(Math.max(-1, Math.min(1, cosAz))) / DEG
    if (Math.sin(hRad) > 0) az = 360 - az
  }

  return { alt, az }
}

export interface CanvasPoint {
  x: number
  y: number
}

export function horizontalToCanvas(
  alt: number,
  az: number,
  cx: number,
  cy: number,
  radius: number,
): CanvasPoint | null {
  if (alt < 0) return null
  const r = ((90 - alt) / 90) * radius
  const azRad = az * DEG
  return {
    x: cx + r * Math.sin(azRad),
    y: cy - r * Math.cos(azRad),
  }
}

// Like horizontalToCanvas but always returns a point — below-horizon points project
// outside the circle and get clipped by the canvas clip path. Use for line features.
export function horizontalToCanvasUnclipped(
  alt: number,
  az: number,
  cx: number,
  cy: number,
  radius: number,
): CanvasPoint {
  const r = ((90 - alt) / 90) * radius
  const azRad = az * DEG
  return {
    x: cx + r * Math.sin(azRad),
    y: cy - r * Math.cos(azRad),
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const full = hex.length === 4
    ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
    : hex
  const r = parseInt(full.slice(1, 3), 16)
  const g = parseInt(full.slice(3, 5), 16)
  const b = parseInt(full.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
