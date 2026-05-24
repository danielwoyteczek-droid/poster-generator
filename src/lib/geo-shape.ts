/**
 * PROJ-51 follow-up: turn a geo-boundary polygon into a `ShapeDefinition`
 * that the existing SVG-mask pipeline (`composeMaskSvg` / `composeFrameSvg`)
 * can consume — exactly like the heart/circle masks.
 *
 * The polygon is projected from lng/lat into the A4 viewBox coordinate space
 * the composer works in. Because the resulting shape's `viewBox` / `width` /
 * `height` equal the A4 canvas, the composer's fit/centre step is an identity
 * (scale 1, offset 0) — the projected path renders 1:1. No composer change.
 */

import type { GeoBoundaryGeometry } from './geo-boundaries'
import type { ShapeDefinition } from './mask-composer'

/** A `map.project()`-style function: lng/lat → container pixel. */
export type ProjectFn = (lngLat: [number, number]) => { x: number; y: number }

/**
 * Build a `ShapeDefinition` for a geo-boundary by projecting its polygon to
 * the current map viewport. `containerW/H` are the pixel size of the map
 * container the projection is relative to; the path is rescaled into the A4
 * viewBox so the composer treats it like any other mask shape.
 *
 * Returns null when the container has no size yet (map not laid out).
 */
export function buildGeoShapeDefinition(
  geometry: GeoBoundaryGeometry,
  project: ProjectFn,
  containerW: number,
  containerH: number,
  orientation: 'portrait' | 'landscape',
): ShapeDefinition | null {
  if (containerW <= 0 || containerH <= 0) return null

  const canvasW = orientation === 'landscape' ? 841.9 : 595.3
  const canvasH = orientation === 'landscape' ? 595.3 : 841.9

  const ringToPath = (ring: number[][]): string => {
    if (ring.length < 3) return ''
    let d = ''
    for (let i = 0; i < ring.length; i++) {
      const pt = project([ring[i][0], ring[i][1]])
      const vx = ((pt.x / containerW) * canvasW).toFixed(1)
      const vy = ((pt.y / containerH) * canvasH).toFixed(1)
      d += `${i === 0 ? 'M' : 'L'}${vx} ${vy}`
    }
    return `${d}Z`
  }

  // Polygon: [outerRing, ...holes]. MultiPolygon: [[outerRing, ...holes], …].
  const rings: number[][][] =
    geometry.type === 'Polygon'
      ? geometry.coordinates
      : geometry.coordinates.flat()

  const d = rings.map(ringToPath).join('')
  if (!d) return null

  // fill-rule evenodd so polygon holes (lakes) and multi-part regions
  // (islands) render correctly.
  return {
    viewBox: `0 0 ${canvasW} ${canvasH}`,
    width: canvasW,
    height: canvasH,
    markup: `<path d="${d}" fill-rule="evenodd"/>`,
    bottomFraction: 1,
  }
}
