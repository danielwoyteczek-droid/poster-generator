/**
 * Reference width used to convert legacy `fontSize` values (px @ 800-wide
 * canvas) into format-invariant `fontSizeFraction` values. Picked at 800
 * because the editor's A4 logical canvas is 800 px wide — A4 designs from
 * before the format-invariance fix render at the same visual size after
 * migration. Stable: any change here re-scales every legacy text block.
 */
export const FONT_SIZE_LEGACY_REF_WIDTH = 800

/**
 * Resolve a TextBlock's renderable font size in px for a given canvas
 * width. `fontSizeFraction` is the renderer truth (fraction of canvas
 * width); `fontSize` is the legacy backup used only when the block
 * predates the migration.
 */
export function resolveFontSizePx(
  block: { fontSize: number; fontSizeFraction?: number },
  canvasWidth: number,
): number {
  const fraction = block.fontSizeFraction ?? block.fontSize / FONT_SIZE_LEGACY_REF_WIDTH
  return fraction * canvasWidth
}
