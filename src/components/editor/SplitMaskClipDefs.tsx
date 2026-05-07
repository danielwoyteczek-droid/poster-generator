'use client'

/**
 * Inline SVG `<clipPath>` definitions for split-masks where the visual
 * divider between the two halves isn't a straight line (entwined hearts,
 * etc.). Each map div in PosterCanvas references one of these via CSS
 * `clip-path: url(#mask-...-left)` so pointer events follow the actual
 * shape — pixels outside the heart fall through to the other map's div.
 *
 * Why inline SVG and not external file: CSS `clip-path: url()` only
 * resolves IDs in the same document. The SVG is sized 0×0 and absolutely
 * positioned so it doesn't disturb layout.
 *
 * Coordinate system: each clipPath uses `clipPathUnits="objectBoundingBox"`
 * so the path scales with the clipped element (the map div). The path data
 * is in the canonical 595.3 × 841.9 viewBox of the mask SVGs — converted
 * to 0..1 via the outer scale, and positioned by the same translate/scale
 * baked into the corresponding mask SVG file.
 *
 * Adding a new shape-clipped split-mask:
 *  1. Add the mask to MAP_MASKS with `leftClipPath: 'url(#mask-X-left)'`
 *     and the matching `rightClipPath`
 *  2. Add the two clipPath blocks below using the same outer scale and
 *     inner translate/scale as the mask SVG files
 */

const VIEWBOX_W = 595.3
const VIEWBOX_H = 841.9
const SX = (1 / VIEWBOX_W).toFixed(6)
const SY = (1 / VIEWBOX_H).toFixed(6)

const HEARTS_DIAGONAL_TRANSFORM = 'translate(46 130) scale(1.3)'
const HEARTS_DIAGONAL_LEFT_PATH =
  'M136.3,61.11c1.5-5.53,9.76-33.85,38.57-50.14,37.18-21.02,80.27-7.67,100.29,29.57,15.66,29.14,7.57,57.08,6,62.14-15.22-18.91-39.57-27.47-62.14-21.86-22.02,5.48-37.95,23.6-43.18,45.33-6.1,25.34,4.7,46.41,14.46,69.09,3.84,8.93,9.56,22.47,16.29,39.43-6,13.29-12,26.57-18,39.86-35.95-24.11-72.04-48.01-108.26-71.72-27.96-18.3-60.6-33.17-73.46-66.28C.02,118.9-1.21,98.73,5.18,80.79,26.1,22.02,95.54,27.45,136.3,61.11Z'
const HEARTS_DIAGONAL_RIGHT_PATH =
  'M291.01,133.68c3.17-1.95,37.47-22.36,67.14-6.57,4.64,2.47,10.77,6.67,16.57,14,3.49,4.8,11.45,17.16,11.43,34.29-.01,10.3-2.91,19.15-6.78,26.37-6.29,11.72-16.35,20.97-28.33,26.73l-119.46,57.47-46-110.86c-2.77-5.15-11.25-22.53-6.86-44.57.32-1.6.69-3.16,1.11-4.65,5.23-18.81,19.37-34.07,37.95-40.06,6.49-2.09,14.05-3.26,22.35-2.3,24.4,2.84,45.26,22.97,50.87,50.15Z'

const HEARTS_CURVED_TRANSFORM = 'translate(40 48) scale(0.9)'
const HEARTS_CURVED_LEFT_PATH =
  'M211.2,224.38c3.12-53.45-41.67-104.88-97.22-95.13l-.18.03c-80.21,15.67-90.26,95.71-56.78,158.97,20.87,40.7,58.58,71.89,98.42,93.38,8.37,4.38,16.92,8.54,25.68,12.34,5.81,2.2,11.43,5.94,16.73,4.48,5.06-2.1-10.63-25.09-11.01-31.22-25.8-63,20.33-85.35,24.35-142.85Z'
const HEARTS_CURVED_RIGHT_PATH =
  'M364.1,183.38c-19.67-61.75-106.26-75.91-142.8-21.78-14.78,19.83,8.86,49.29.87,76.4-5.3,29.47-26.69,52.38-30.88,82.28-4.25,19.24,7.08,66.16,22.81,77.65l.14.07c19.1,6.07,50.24-22.98,66.44-33.72,50.73-42.97,103.78-110.65,83.42-180.9Z'

export function SplitMaskClipDefs() {
  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
    >
      <defs>
        <clipPath id="mask-hearts-diagonal-left" clipPathUnits="objectBoundingBox">
          <g transform={`scale(${SX} ${SY})`}>
            <g transform={HEARTS_DIAGONAL_TRANSFORM}>
              <path d={HEARTS_DIAGONAL_LEFT_PATH} />
            </g>
          </g>
        </clipPath>
        <clipPath id="mask-hearts-diagonal-right" clipPathUnits="objectBoundingBox">
          <g transform={`scale(${SX} ${SY})`}>
            <g transform={HEARTS_DIAGONAL_TRANSFORM}>
              <path d={HEARTS_DIAGONAL_RIGHT_PATH} />
            </g>
          </g>
        </clipPath>
        <clipPath id="mask-hearts-curved-left" clipPathUnits="objectBoundingBox">
          <g transform={`scale(${SX} ${SY})`}>
            <g transform={HEARTS_CURVED_TRANSFORM}>
              <path d={HEARTS_CURVED_LEFT_PATH} />
            </g>
          </g>
        </clipPath>
        <clipPath id="mask-hearts-curved-right" clipPathUnits="objectBoundingBox">
          <g transform={`scale(${SX} ${SY})`}>
            <g transform={HEARTS_CURVED_TRANSFORM}>
              <path d={HEARTS_CURVED_RIGHT_PATH} />
            </g>
          </g>
        </clipPath>
      </defs>
    </svg>
  )
}
