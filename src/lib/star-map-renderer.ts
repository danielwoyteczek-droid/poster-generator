import { equatorialToHorizontal, horizontalToCanvas, horizontalToCanvasUnclipped, hexToRgba } from './star-projection'
import { getSunCoords, getMoonCoords, getPlanetCoords } from './celestial'
import type { StarMapFrameConfig } from '@/hooks/useStarMapStore'

export interface StarEntry { ra: number; dec: number; mag: number }
export interface GeoFeature { geometry: { type: string; coordinates: unknown } }

export interface StarMapRenderOptions {
  width: number
  height: number
  lat: number
  lng: number
  date: Date
  posterBgColor: string
  skyBgColor: string
  starColor: string
  starData: StarEntry[]
  constellationData: GeoFeature[]
  milkyWayData: GeoFeature[]
  showConstellations: boolean
  showMilkyWay: boolean
  showSun: boolean
  showMoon: boolean
  showPlanets: boolean
  frameConfig?: StarMapFrameConfig
}

const DEG = Math.PI / 180

function projectLine(raDeg: number, decDeg: number, lat: number, lng: number, date: Date, cx: number, cy: number, skyR: number) {
  const { alt, az } = equatorialToHorizontal(raDeg / 15, decDeg, lat, lng, date)
  return horizontalToCanvasUnclipped(alt, az, cx, cy, skyR)
}

function projectPoint(raDeg: number, decDeg: number, lat: number, lng: number, date: Date, cx: number, cy: number, skyR: number) {
  const { alt, az } = equatorialToHorizontal(raDeg / 15, decDeg, lat, lng, date)
  return horizontalToCanvas(alt, az, cx, cy, skyR)
}

export function renderStarMap(ctx: CanvasRenderingContext2D, opts: StarMapRenderOptions) {
  const {
    width: w, height: h, lat, lng, date,
    posterBgColor, skyBgColor, starColor,
    starData, constellationData, milkyWayData,
    showConstellations, showMilkyWay, showSun, showMoon, showPlanets,
    frameConfig,
  } = opts

  const cx = w / 2
  const cy = cx
  const skyR = Math.min(w, h) * 0.41
  const pxPerMm = w / 210

  // Poster background
  ctx.fillStyle = posterBgColor
  ctx.fillRect(0, 0, w, h)

  // Backdrop sky zone (faded rectangle behind the circle) — admin-configurable
  if (frameConfig && frameConfig.outer.mode !== 'none') {
    const m = frameConfig.outer.margin * pxPerMm
    const op = frameConfig.outer.mode === 'full' ? 1 : frameConfig.outer.opacity
    ctx.save()
    ctx.globalAlpha = op
    ctx.fillStyle = skyBgColor
    ctx.fillRect(m, m, w - 2 * m, h - 2 * m)
    ctx.restore()
  }

  // Clip + sky background
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, skyR, 0, Math.PI * 2)
  ctx.clip()

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, skyR)
  bg.addColorStop(0, hexToRgba(skyBgColor, 0.85))
  bg.addColorStop(1, skyBgColor)
  ctx.fillStyle = bg
  ctx.fillRect(cx - skyR, cy - skyR, skyR * 2, skyR * 2)

  // Milky Way
  if (showMilkyWay && milkyWayData.length > 0) {
    ctx.save()
    for (const feature of milkyWayData) {
      const polys: number[][][][] =
        feature.geometry.type === 'MultiPolygon'
          ? (feature.geometry.coordinates as number[][][][])
          : [feature.geometry.coordinates as number[][][]]
      for (const poly of polys) {
        for (const ring of poly) {
          const pts = (ring as number[][])
            .map(([raDeg, decDeg]) => projectPoint(raDeg, decDeg, lat, lng, date, cx, cy, skyR))
            .filter(Boolean) as { x: number; y: number }[]
          if (pts.length < 3) continue
          ctx.beginPath()
          ctx.moveTo(pts[0].x, pts[0].y)
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
          ctx.closePath()
          ctx.fillStyle = hexToRgba(starColor, 0.07)
          ctx.fill()
        }
      }
    }
    ctx.restore()
  }

  // Constellation lines
  if (showConstellations && constellationData.length > 0) {
    ctx.save()
    ctx.strokeStyle = hexToRgba(starColor, 0.4)
    ctx.lineWidth = Math.max(1, w * 0.0004)
    for (const feature of constellationData) {
      const lines: number[][][] =
        feature.geometry.type === 'MultiLineString'
          ? (feature.geometry.coordinates as number[][][])
          : [feature.geometry.coordinates as unknown as number[][]]
      for (const line of lines) {
        const pts = (line as number[][]).map(([raDeg, decDeg]) =>
          projectLine(raDeg, decDeg, lat, lng, date, cx, cy, skyR))
        if (pts.length < 2) continue
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  // Stars
  for (const { ra, dec, mag } of starData) {
    if (mag > 7.5) continue
    const { alt, az } = equatorialToHorizontal(ra, dec, lat, lng, date)
    const pt = horizontalToCanvas(alt, az, cx, cy, skyR)
    if (!pt) continue

    const norm = Math.max(0, Math.min(1, (mag + 1.5) / 9))
    const radius = Math.max(0.6, 3.2 * (1 - norm)) * (w / 400)
    const alpha = Math.max(0.25, 1 - norm * 0.65)

    if (mag < 2) {
      const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius * 5)
      glow.addColorStop(0, hexToRgba(starColor, 0.35))
      glow.addColorStop(1, hexToRgba(starColor, 0))
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, radius * 5, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = hexToRgba(starColor, alpha)
    ctx.fill()
  }

  // Planets
  if (showPlanets) {
    const r = Math.max(3, w * 0.008)
    for (const { name, ra, dec } of getPlanetCoords(date)) {
      const { alt, az } = equatorialToHorizontal(ra, dec, lat, lng, date)
      const pt = horizontalToCanvas(alt, az, cx, cy, skyR)
      if (!pt) continue
      const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 4)
      glow.addColorStop(0, hexToRgba(starColor, 0.4))
      glow.addColorStop(1, hexToRgba(starColor, 0))
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r * 4, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill()
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fillStyle = hexToRgba(starColor, 0.95); ctx.fill()
      const fs = Math.max(10, w * 0.009)
      ctx.font = `${fs}px sans-serif`; ctx.fillStyle = hexToRgba(starColor, 0.7)
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(name, pt.x, pt.y + r + 2)
    }
  }

  // Moon
  if (showMoon) {
    const { ra, dec } = getMoonCoords(date)
    const { alt, az } = equatorialToHorizontal(ra, dec, lat, lng, date)
    const pt = horizontalToCanvas(alt, az, cx, cy, skyR)
    if (pt) {
      const r = Math.max(5, w * 0.012)
      const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 5)
      glow.addColorStop(0, hexToRgba('#e8dfc0', 0.5)); glow.addColorStop(1, hexToRgba('#e8dfc0', 0))
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r * 5, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill()
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fillStyle = '#e8dfc0'; ctx.fill()
      const fs = Math.max(10, w * 0.009)
      ctx.font = `${fs}px sans-serif`; ctx.fillStyle = hexToRgba(starColor, 0.7)
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('Mond', pt.x, pt.y + r + 2)
    }
  }

  // Sun
  if (showSun) {
    const { ra, dec } = getSunCoords(date)
    const { alt, az } = equatorialToHorizontal(ra, dec, lat, lng, date)
    const pt = horizontalToCanvas(alt, az, cx, cy, skyR)
    if (pt) {
      const r = Math.max(6, w * 0.015)
      const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 6)
      glow.addColorStop(0, hexToRgba('#ffe066', 0.6)); glow.addColorStop(1, hexToRgba('#ffe066', 0))
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r * 6, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill()
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffe066'; ctx.fill()
      const fs = Math.max(10, w * 0.009)
      ctx.font = `${fs}px sans-serif`; ctx.fillStyle = hexToRgba(starColor, 0.7)
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('Sonne', pt.x, pt.y + r + 2)
    }
  }

  ctx.restore()

  // Default subtle sky-circle border — only shown when admin did NOT configure an inner frame
  if (!frameConfig?.innerFrame.enabled) {
    ctx.beginPath()
    ctx.arc(cx, cy, skyR, 0, Math.PI * 2)
    ctx.strokeStyle = hexToRgba(starColor, 0.25)
    ctx.lineWidth = Math.max(1, w * 0.001)
    ctx.stroke()
  }

  // Compass labels
  const COMPASS = [{ label: 'N', az: 0 }, { label: 'O', az: 90 }, { label: 'S', az: 180 }, { label: 'W', az: 270 }]
  const fontSize = Math.max(10, w * 0.013)
  ctx.font = `${fontSize}px sans-serif`
  ctx.fillStyle = hexToRgba(starColor, 0.5)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const { label, az } of COMPASS) {
    const azR = az * DEG
    const dist = skyR + fontSize * 1.4
    ctx.fillText(label, cx + dist * Math.sin(azR), cy - dist * Math.cos(azR))
  }

  // Configurable frames (admin via presets)
  if (frameConfig) {
    if (frameConfig.innerFrame.enabled) {
      ctx.beginPath()
      ctx.arc(cx, cy, skyR, 0, Math.PI * 2)
      ctx.strokeStyle = frameConfig.innerFrame.color
      ctx.lineWidth = frameConfig.innerFrame.thickness * pxPerMm
      ctx.stroke()
    }
    if (frameConfig.outerFrame.enabled) {
      const t = frameConfig.outerFrame.thickness * pxPerMm
      const m = frameConfig.outer.margin * pxPerMm
      ctx.strokeStyle = frameConfig.outerFrame.color
      ctx.lineWidth = t
      ctx.strokeRect(m, m, w - 2 * m, h - 2 * m)
      if (frameConfig.outerFrame.style === 'double') {
        const gap = frameConfig.outerFrame.gap * pxPerMm
        const off = m + t + gap
        if (w - 2 * off > 0 && h - 2 * off > 0) {
          ctx.strokeRect(off, off, w - 2 * off, h - 2 * off)
        }
      }
    }
  }
}
