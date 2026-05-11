/**
 * Marker-pin sizing as a fraction of poster width — analog to
 * `font-scale.ts`'s `fontSizeFraction` model. The classic and heart pins
 * have a fixed visual size of 28×40 / 32×32 px on an A4 logical canvas
 * (800 px wide), so we capture that ratio once and let renderers resolve
 * actual px on demand. Without this, switching A4 → A3 → A2 keeps the
 * SVG attributes constant and the pin shrinks proportionally to the
 * poster — same bug as the format-invariant font size fix.
 *
 * Scaling uses `min(canvasWidth, canvasHeight)` — i.e. the poster's SHORT
 * edge — so the pin stays the same size when the user only flips between
 * portrait and landscape (same paper, just rotated). Sizing by width alone
 * would make landscape A4 a ~41 % larger pin than portrait A4, since the
 * landscape canvas width IS the long edge.
 */
export type PinType = 'classic' | 'heart'

const PIN_REF_WIDTH = 800

const PIN_BASE_PX: Record<PinType, { width: number; height: number }> = {
  classic: { width: 28, height: 40 },
  heart: { width: 32, height: 32 },
}

export function resolvePinSizePx(
  type: PinType,
  canvasWidth: number,
  canvasHeight?: number,
): { width: number; height: number } {
  const base = PIN_BASE_PX[type]
  const refEdge = canvasHeight != null ? Math.min(canvasWidth, canvasHeight) : canvasWidth
  const ratio = refEdge / PIN_REF_WIDTH
  return { width: base.width * ratio, height: base.height * ratio }
}
