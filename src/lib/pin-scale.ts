/**
 * Marker-pin sizing as a fraction of poster width — analog to
 * `font-scale.ts`'s `fontSizeFraction` model. The classic and heart pins
 * have a fixed visual size of 28×40 / 32×32 px on an A4 logical canvas
 * (800 px wide), so we capture that ratio once and let renderers resolve
 * actual px on demand. Without this, switching A4 → A3 → A2 keeps the
 * SVG attributes constant and the pin shrinks proportionally to the
 * poster — same bug as the format-invariant font size fix.
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
): { width: number; height: number } {
  const base = PIN_BASE_PX[type]
  const ratio = canvasWidth / PIN_REF_WIDTH
  return { width: base.width * ratio, height: base.height * ratio }
}
