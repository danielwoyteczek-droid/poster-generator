/**
 * Composes mask and frame SVGs dynamically from a base shape + configuration.
 *
 * The architecture: admin uploads only the pure shape (e.g. `<circle .../>`).
 * Everything else — outer fade area, inner frame stroke, outer frame stroke
 * (single or double) — is generated at render time from parameters.
 */

export type OuterMode = 'none' | 'opacity' | 'full' | 'glow'
export type FrameStyle = 'single' | 'double'

export interface ShapeConfigState {
  outer: {
    mode: OuterMode
    opacity: number // 0..1, used when mode === 'opacity'
    /** Margin in mm. When marginLocked is true this value applies to all
     *  four sides and the per-side fields are ignored. */
    margin: number
    marginLocked?: boolean
    marginTop?: number
    marginRight?: number
    marginBottom?: number
    marginLeft?: number
    /** Radius of the radial glow halo around the shape, in mm.
     *  Used when mode === 'glow'. */
    glowRadius?: number
    /** Peak opacity of the glow halo (0..1). Used when mode === 'glow'. */
    glowIntensity?: number
  }
  innerFrame: {
    enabled: boolean
    color: string
    thickness: number // mm, 0.3–2
  }
  outerFrame: {
    enabled: boolean
    color: string
    thickness: number // mm, 0.3–2
    style: FrameStyle
    gap: number       // mm between double lines
    offset?: number   // mm, Abstand vom Poster-Rand (Default 10). Eigener Wert,
                      // damit der Rahmen nicht an `outer.margin` gekoppelt ist.
  }
}

export const DEFAULT_SHAPE_CONFIG: ShapeConfigState = {
  // Opt-in-Defaults: Toggle auf "Fade" zeigt zunächst KEIN sichtbares Fade
  // (opacity=1 = volle Deckkraft am Rand). Operator dreht den Slider runter,
  // um Fade-Stärke zu setzen. Verhindert Überraschungen, wenn jemand "Fade"/
  // "Glow" toggelt und plötzlich einen unerwarteten Effekt bekommt.
  outer: { mode: 'none', opacity: 1, margin: 0, marginLocked: true, glowRadius: 0, glowIntensity: 0 },
  innerFrame: { enabled: false, color: '#1a1a1a', thickness: 0.7 },
  outerFrame: { enabled: false, color: '#1a1a1a', thickness: 0.7, style: 'single', gap: 1.5, offset: 10 },
}

export interface ShapeDefinition {
  viewBox: string    // e.g. '0 0 595.3 841.9'
  width: number      // viewBox width in SVG units
  height: number     // viewBox height in SVG units
  markup: string     // inner shape elements, e.g. '<circle cx=".." cy=".." r=".."/>'
  /**
   * Fraction of viewBox height at which the shape's visible bottom sits.
   * Used by the Layout system to decide whether the shape needs to be
   * scaled down so it doesn't intrude into the text area. Default 1.0
   * (treat as filling the whole viewBox; no scaling).
   */
  bottomFraction?: number
}

/**
 * Convert a millimeter measurement to SVG-viewBox units. We assume the
 * uploaded shape SVG has viewBox width ≈ A4-width in its unit system
 * (most exports from Illustrator use 595.3pt = 210mm for A4).
 */
export function mmToUnits(mm: number, viewBoxWidth: number): number {
  return (mm / 210) * viewBoxWidth
}

/**
 * Parse an uploaded SVG string and extract the useful bits: viewBox and
 * inner shape markup. Strips CSS classes and fill attributes so they don't
 * fight the composition's own fill/stroke rules.
 */
export function parseShapeSvg(svgString: string): ShapeDefinition | null {
  const viewBoxMatch = svgString.match(/viewBox\s*=\s*"([^"]+)"/i)
  if (!viewBoxMatch) return null
  const [, , widthStr, heightStr] = viewBoxMatch[1].split(/\s+/)
  const width = parseFloat(widthStr)
  const height = parseFloat(heightStr)
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null

  // Extract only shape elements from inside <svg>. Drop <style>, <defs>, comments.
  const innerMatch = svgString.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  if (!innerMatch) return null
  let inner = innerMatch[1]
  inner = inner.replace(/<!--[\s\S]*?-->/g, '')
  inner = inner.replace(/<defs[\s\S]*?<\/defs>/gi, '')
  inner = inner.replace(/<style[\s\S]*?<\/style>/gi, '')
  // Remove class attributes (we can't resolve CSS classes anyway)
  inner = inner.replace(/\sclass\s*=\s*"[^"]*"/gi, '')
  // Remove hard-coded fills so our group-level fill wins
  inner = inner.replace(/\sfill\s*=\s*"[^"]*"/gi, '')
  inner = inner.replace(/\sfill-opacity\s*=\s*"[^"]*"/gi, '')
  // Remove strokes (we add our own in the frame composer)
  inner = inner.replace(/\sstroke\s*=\s*"[^"]*"/gi, '')
  inner = inner.replace(/\sstroke-width\s*=\s*"[^"]*"/gi, '')
  inner = inner.replace(/\sstroke-miterlimit\s*=\s*"[^"]*"/gi, '')
  inner = inner.replace(/\sstyle\s*=\s*"[^"]*"/gi, '')

  return {
    viewBox: viewBoxMatch[1].trim(),
    width, height,
    markup: inner.trim(),
  }
}

/**
 * Resolve the four side margins (mm) from the config. If locked or the
 * per-side fields are missing, all sides use `outer.margin`.
 */
function resolveSideMarginsMm(config: ShapeConfigState): {
  top: number; right: number; bottom: number; left: number
} {
  const o = config.outer
  const locked = o.marginLocked !== false
  if (locked) {
    return { top: o.margin, right: o.margin, bottom: o.margin, left: o.margin }
  }
  return {
    top: o.marginTop ?? o.margin,
    right: o.marginRight ?? o.margin,
    bottom: o.marginBottom ?? o.margin,
    left: o.marginLeft ?? o.margin,
  }
}

/**
 * Build the final alpha-mask SVG for a given shape + config.
 * Resulting SVG uses fill-opacity to indicate map visibility per region.
 */
export function composeMaskSvg(
  shape: ShapeDefinition,
  config: ShapeConfigState,
  layoutMapHeight: number = 1,
): string {
  const parts: string[] = []
  const { outer } = config

  // Layout-aware scaling: if the shape's natural bottom sits lower than the
  // map area allows (e.g. heart-single bottoms at 84 % but the layout only
  // grants 70 %), scale it down uniformly so it fits — preserving aspect
  // ratio — and anchor it at the top of the viewBox.
  const bottom = shape.bottomFraction ?? 1
  const shapeScale = bottom > layoutMapHeight ? layoutMapHeight / bottom : 1
  const translateX = +((shape.width * (1 - shapeScale)) / 2).toFixed(2)
  const scaleStr = shapeScale.toFixed(4)
  const shapeTransform = shapeScale < 1
    ? ` transform="translate(${translateX} 0) scale(${scaleStr})"`
    : ''

  if (outer.mode === 'opacity' || outer.mode === 'full') {
    const sides = resolveSideMarginsMm(config)
    const mT = mmToUnits(sides.top, shape.width)
    const mR = mmToUnits(sides.right, shape.width)
    const mB = mmToUnits(sides.bottom, shape.width)
    const mL = mmToUnits(sides.left, shape.width)
    const w = shape.width - mL - mR
    const h = shape.height - mT - mB
    const op = outer.mode === 'full' ? 1 : outer.opacity
    parts.push(
      `<rect x="${mL}" y="${mT}" width="${w}" height="${h}" fill="#fff" fill-opacity="${op}"/>`,
    )
  }

  // Glow: a true radial gradient on a circle centred on the shape's
  // visual midpoint. Rendering correctness in CSS mask-image relies on
  // the consumer rasterising this SVG to a PNG first (see
  // useRasterizedMaskUrl in PosterCanvas) — Chromium doesn't always
  // honour <radialGradient> when an SVG data URL is used directly as a
  // mask source. The canvas export pipeline rasterises by default.
  let defs = ''
  if (outer.mode === 'glow') {
    const radiusMm = outer.glowRadius ?? 250
    const intensity = outer.glowIntensity ?? 0.5
    const r = mmToUnits(radiusMm, shape.width).toFixed(2)
    const bottomFraction = shape.bottomFraction ?? 1
    const visibleBottom = Math.min(bottomFraction, layoutMapHeight)
    const cx = (shape.width / 2).toFixed(2)
    const cy = ((shape.height * visibleBottom) / 2).toFixed(2)
    defs =
      `<defs><radialGradient id="m-glow">` +
      `<stop offset="0%" stop-color="#fff" stop-opacity="${intensity}"/>` +
      `<stop offset="100%" stop-color="#fff" stop-opacity="0"/>` +
      `</radialGradient></defs>`
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#m-glow)"/>`,
    )
  }

  // Shape always drawn at full opacity on top (unless mode=full made it redundant)
  parts.push(`<g fill="#fff" fill-opacity="1"${shapeTransform}>${shape.markup}</g>`)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${shape.viewBox}" width="${shape.width}" height="${shape.height}">${defs}${parts.join('')}</svg>`
}

/**
 * Build the decorative frame SVG (strokes). Returns empty SVG if nothing enabled.
 */
export function composeFrameSvg(
  shape: ShapeDefinition,
  config: ShapeConfigState,
  layoutMapHeight: number = 1,
): string {
  const bottom = shape.bottomFraction ?? 1
  const shapeScale = bottom > layoutMapHeight ? layoutMapHeight / bottom : 1
  const frameTranslateX = +((shape.width * (1 - shapeScale)) / 2).toFixed(2)
  const frameScaleStr = shapeScale.toFixed(4)
  const frameTransform = shapeScale < 1
    ? ` transform="translate(${frameTranslateX} 0) scale(${frameScaleStr})"`
    : ''
  const parts: string[] = []
  const { innerFrame, outerFrame } = config

  if (outerFrame.enabled) {
    // Eigener Offset (alle Seiten gleich), nicht an outer.margin gekoppelt.
    const offsetMm = outerFrame.offset ?? 10
    const off0 = mmToUnits(offsetMm, shape.width)
    const thickness = mmToUnits(outerFrame.thickness, shape.width)
    const w = shape.width - 2 * off0
    const h = shape.height - 2 * off0
    parts.push(
      `<rect x="${off0}" y="${off0}" width="${w}" height="${h}" fill="none" stroke="${outerFrame.color}" stroke-width="${thickness}"/>`,
    )
    if (outerFrame.style === 'double') {
      const gap = mmToUnits(outerFrame.gap, shape.width)
      const off = thickness + gap
      const innerX = off0 + off
      const innerY = off0 + off
      const innerW = shape.width - 2 * off0 - 2 * off
      const innerH = shape.height - 2 * off0 - 2 * off
      if (innerW > 0 && innerH > 0) {
        parts.push(
          `<rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" fill="none" stroke="${outerFrame.color}" stroke-width="${thickness}"/>`,
        )
      }
    }
  }

  if (innerFrame.enabled) {
    const thickness = mmToUnits(innerFrame.thickness, shape.width)
    // Compensate stroke thickness so the outline doesn't thicken when the
    // shape is scaled down by the layout transform.
    const scaledThickness = thickness / (shapeScale || 1)
    parts.push(
      `<g fill="none" stroke="${innerFrame.color}" stroke-width="${scaledThickness}" stroke-linejoin="round"${frameTransform}>${shape.markup}</g>`,
    )
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${shape.viewBox}">${parts.join('')}</svg>`
}

/**
 * Seam lines for split modes — two vertical strokes at x = midline ±
 * splitGapMm, clipped to the shape's interior so they only appear inside
 * the silhouette. Rendered as a separate layer (without the per-half CSS
 * clip used for the outer contour) so the full stroke thickness stays
 * visible on both sides of the gap.
 */
export function composeSplitSeamSvg(
  shape: ShapeDefinition,
  innerFrame: ShapeConfigState['innerFrame'],
  splitGapMm: number = 1,
): string {
  const thickness = mmToUnits(innerFrame.thickness, shape.width)
  const mid = shape.width / 2
  const gap = mmToUnits(splitGapMm, shape.width)
  const clipId = 'split-seam-clip'
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${shape.viewBox}">` +
      `<defs><clipPath id="${clipId}">${shape.markup}</clipPath></defs>` +
      `<g fill="none" stroke="${innerFrame.color}" stroke-width="${thickness}" stroke-linecap="butt" clip-path="url(#${clipId})">` +
        `<line x1="${(mid - gap).toFixed(2)}" y1="0" x2="${(mid - gap).toFixed(2)}" y2="${shape.height}"/>` +
        `<line x1="${(mid + gap).toFixed(2)}" y1="0" x2="${(mid + gap).toFixed(2)}" y2="${shape.height}"/>` +
      `</g>` +
    `</svg>`
  )
}

export function svgToDataUrl(svg: string): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

export function hasAnyFrame(config: ShapeConfigState): boolean {
  return config.innerFrame.enabled || config.outerFrame.enabled
}

/**
 * Build a fullbleed mask SVG (inset-rect only) for the case where there's no
 * shape silhouette but the user wants a margin around the map. Used for
 * fullbleed posters with `outer.mode === 'full'` (or 'opacity', if reachable):
 * the resulting alpha mask keeps the map visible inside the inset rect and
 * lets the poster background show through outside.
 *
 * Returns an empty string when no mask is needed (mode 'none' or all margins
 * zero) — caller should then skip mask application.
 *
 * Uses A4 proportions for the viewBox; the mask gets rasterised + stretched
 * to fit the actual canvas, so the small aspect-ratio difference for non-A4
 * formats (e.g. 50×70cm) is visually negligible.
 */
export function composeFullbleedMaskSvg(config: ShapeConfigState): string {
  const { outer } = config
  if (outer.mode === 'none') return ''
  const sides = resolveSideMarginsMm(config)
  if (sides.top === 0 && sides.right === 0 && sides.bottom === 0 && sides.left === 0) {
    return ''
  }
  const W = 595.3
  const H = 841.9
  const mT = mmToUnits(sides.top, W)
  const mR = mmToUnits(sides.right, W)
  const mB = mmToUnits(sides.bottom, W)
  const mL = mmToUnits(sides.left, W)
  const w = W - mL - mR
  const h = H - mT - mB
  if (w <= 0 || h <= 0) return ''
  const op = outer.mode === 'full' ? 1 : (outer.opacity ?? 1)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect x="${mL}" y="${mT}" width="${w}" height="${h}" fill="#fff" fill-opacity="${op}"/></svg>`
}
