/**
 * Decoration colour helpers — recolour a decoration SVG to match the active
 * innerFrame colour at render time. Decoration files ship with a hard-coded
 * `#1d1d1b` (or similar) but the visual must follow `shapeConfig.innerFrame.color`
 * so heart silhouette + decoration overlay form a unified design (PROJ-35).
 *
 * We don't use CSS `currentColor` because the decoration is loaded via
 * `<img>` / canvas `drawImage`, neither of which propagates CSS to embedded SVG.
 * Instead we fetch the SVG text once, rewrite the stroke/fill attributes, and
 * serve a data URL.
 */

const svgTextCache = new Map<string, Promise<string>>()

/** Fetch the raw SVG text for a decoration URL, deduped + cached. */
export function fetchDecorationSvgText(url: string): Promise<string> {
  let pending = svgTextCache.get(url)
  if (!pending) {
    pending = fetch(url).then((r) => r.text())
    svgTextCache.set(url, pending)
  }
  return pending
}

/**
 * Replace every `stroke="<colour>"` and `fill="<colour>"` with the target
 * colour, preserving `none` so non-stroked / non-filled paths stay invisible.
 * Hex / rgb / named colours all match (anything that's not "none" or "transparent").
 */
export function recolorSvg(svgText: string, color: string): string {
  return svgText
    .replace(/stroke\s*=\s*"(?!(?:none|transparent)\b)[^"]*"/gi, `stroke="${color}"`)
    .replace(/fill\s*=\s*"(?!(?:none|transparent)\b)[^"]*"/gi, `fill="${color}"`)
}

export function svgTextToDataUrl(svgText: string): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgText)
}
