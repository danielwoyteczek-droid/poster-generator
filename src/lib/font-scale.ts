/** Canonical preview width used to normalise text-block font-scaling across
 *  every render path (live editor preview, Zimmeransicht, PDF/PNG export,
 *  server-rendered snapshots). Keeps the text-to-poster ratio consistent
 *  regardless of the current device's preview width:
 *
 *    - Desktop previews ≈ 660 px → fontScale = 1 (unchanged)
 *    - Mobile previews ≈ 300 px → fontScale ≈ 0.45
 *    - Print export → scaleX compensates so printed text ratio matches
 *
 *  Picking 660 centres the scale on typical Desktop preview widths, so
 *  Desktop users see no change and Mobile users see the same print-ratio
 *  they would see on Desktop, just at smaller pixel dimensions. */
export const FONT_SCALE_REFERENCE_WIDTH = 660

export function computeFontScale(previewW: number): number {
  if (previewW <= 0) return 1
  return Math.min(1, previewW / FONT_SCALE_REFERENCE_WIDTH)
}
