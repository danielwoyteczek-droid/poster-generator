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
  }
}

export const DEFAULT_SHAPE_CONFIG: ShapeConfigState = {
  outer: { mode: 'none', opacity: 0.3, margin: 10, marginLocked: true, glowRadius: 8, glowIntensity: 0.5 },
  innerFrame: { enabled: false, color: '#1a1a1a', thickness: 0.7 },
  outerFrame: { enabled: false, color: '#1a1a1a', thickness: 0.7, style: 'single', gap: 1.5 },
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

  // Glow: a Gaussian-blurred copy of the shape painted underneath the solid
  // shape produces a soft radial halo that follows the shape's contour.
  let defs = ''
  if (outer.mode === 'glow') {
    const radiusMm = outer.glowRadius ?? 8
    const intensity = outer.glowIntensity ?? 0.5
    const stdDev = mmToUnits(radiusMm, shape.width).toFixed(2)
    // Oversize the filter region so the halo isn't clipped at the viewBox edge.
    defs =
      `<defs><filter id="m-glow" x="-30%" y="-30%" width="160%" height="160%">` +
      `<feGaussianBlur stdDeviation="${stdDev}"/></filter></defs>`
    parts.push(
      `<g fill="#fff" fill-opacity="${intensity}" filter="url(#m-glow)"${shapeTransform}>${shape.markup}</g>`,
    )
  }

  // Shape always drawn at full opacity on top (unless mode=full made it redundant)
  parts.push(`<g fill="#fff" fill-opacity="1"${shapeTransform}>${shape.markup}</g>`)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${shape.viewBox}">${defs}${parts.join('')}</svg>`
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
    const sides = resolveSideMarginsMm(config)
    const mT = mmToUnits(sides.top, shape.width)
    const mR = mmToUnits(sides.right, shape.width)
    const mB = mmToUnits(sides.bottom, shape.width)
    const mL = mmToUnits(sides.left, shape.width)
    const thickness = mmToUnits(outerFrame.thickness, shape.width)
    const w = shape.width - mL - mR
    const h = shape.height - mT - mB
    parts.push(
      `<rect x="${mL}" y="${mT}" width="${w}" height="${h}" fill="none" stroke="${outerFrame.color}" stroke-width="${thickness}"/>`,
    )
    if (outerFrame.style === 'double') {
      const gap = mmToUnits(outerFrame.gap, shape.width)
      const off = thickness + gap
      const innerX = mL + off
      const innerY = mT + off
      const innerW = shape.width - mL - mR - 2 * off
      const innerH = shape.height - mT - mB - 2 * off
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

export function svgToDataUrl(svg: string): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

export function hasAnyFrame(config: ShapeConfigState): boolean {
  return config.innerFrame.enabled || config.outerFrame.enabled
}
