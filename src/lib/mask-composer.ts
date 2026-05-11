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
  /**
   * Per-side markup for split-mask frames (PROJ-1, hearts-curved /
   * hearts-diagonal). When the mask is `isSplit + noHalfClip`, the
   * inner-frame stroke uses these instead of the combined `markup` so
   * each side gets its own outline matching its own filled mask. Falls
   * back to `markup` when not present.
   */
  splitMarkup?: { left: string; right: string }
  /**
   * Optional zoom factor applied on top of the uniform-fit scaling when
   * the poster is in landscape orientation. Defaults to 1.0 (pure fit).
   * Use values > 1 to make a forgiving silhouette (heart, circle) fill
   * more of the wider landscape canvas at the cost of the top/bottom
   * extents being clipped by the poster edges. Shapes with critical
   * upper/lower detail (e.g. house roof) should stay at 1.0.
   */
  landscapeScale?: number
  /**
   * Optional vertical offset applied in landscape orientation, expressed
   * as a fraction of the landscape canvas height (positive = shift down).
   * Defaults to 0 (centred). Useful for top-heavy silhouettes like the
   * heart whose visual mass sits in the upper half — a small positive
   * value (~0.05–0.1) keeps the bottom point inside the poster while
   * leaving more breathing room at the top.
   */
  landscapeYOffset?: number
  /**
   * Optional pre-baked landscape geometry. When provided AND the poster
   * is in landscape orientation, every composer uses this shape directly
   * (no uniform-fit, no landscapeScale, no landscapeYOffset). Lets a
   * silhouette that doesn't translate well via auto-fit (e.g. hearts-
   * diagonal whose tips sit too close to the canvas top edge after
   * scaling) ship a hand-tuned landscape variant. The variant should
   * use a landscape viewBox (e.g. `0 0 841.9 595.3`) and place its
   * markup directly in canvas coords.
   */
  shapeLandscape?: ShapeDefinition
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
  orientation: 'portrait' | 'landscape' = 'portrait',
): string {
  const parts: string[] = []
  const { outer } = config

  // Landscape branch: render into an A4-landscape viewBox (841.9 x 595.3),
  // uniformly fit + centre the shape inside it, and recompute the faded/full
  // rectangle + glow against canvas coords. The mask SVG is then applied
  // with mask-size: 100% 100% on a landscape canvas (same aspect) — no
  // stretching, shape stays a circle/heart/etc. instead of becoming an
  // ellipse pulled across the wide axis.
  if (orientation === 'landscape') {
    // PROJ-37 Stufe 1: prefer a pre-baked landscape variant when the
    // shape provides one. The variant ships its own canvas-fit geometry
    // (no further scale/offset needed).
    const activeShape = shape.shapeLandscape ?? shape
    const canvasW = 841.9
    const canvasH = 595.3
    const mmCorrection = 210 / 297

    const bottom = activeShape.bottomFraction ?? 1
    const layoutScale = bottom > layoutMapHeight ? layoutMapHeight / bottom : 1
    const fitScale = Math.min(canvasW / activeShape.width, canvasH / activeShape.height)
    const landscapeScale = activeShape.landscapeScale ?? 1
    const totalScale = layoutScale * fitScale * landscapeScale
    const scaledW = activeShape.width * totalScale
    const scaledH = activeShape.height * totalScale
    const tx = +((canvasW - scaledW) / 2).toFixed(2)
    const ty = +((canvasH - scaledH) / 2 + canvasH * (activeShape.landscapeYOffset ?? 0)).toFixed(2)
    const shapeTransform = ` transform="translate(${tx} ${ty}) scale(${totalScale.toFixed(4)})"`

    if (outer.mode === 'opacity' || outer.mode === 'full') {
      const sides = resolveSideMarginsMm(config)
      const mT = mmToUnits(sides.top, canvasW) * mmCorrection
      const mR = mmToUnits(sides.right, canvasW) * mmCorrection
      const mB = mmToUnits(sides.bottom, canvasW) * mmCorrection
      const mL = mmToUnits(sides.left, canvasW) * mmCorrection
      const w = canvasW - mL - mR
      const h = canvasH - mT - mB
      const op = outer.mode === 'full' ? 1 : outer.opacity
      parts.push(
        `<rect x="${mL}" y="${mT}" width="${w}" height="${h}" fill="#fff" fill-opacity="${op}"/>`,
      )
    }

    let defs = ''
    if (outer.mode === 'glow') {
      const radiusMm = outer.glowRadius ?? 250
      const intensity = outer.glowIntensity ?? 0.5
      const r = (mmToUnits(radiusMm, canvasW) * mmCorrection).toFixed(2)
      const visibleBottom = Math.min(bottom, layoutMapHeight)
      // Centre on the shape's transformed visual midpoint (in canvas coords).
      const cx = (tx + (activeShape.width / 2) * totalScale).toFixed(2)
      const cy = (ty + ((activeShape.height * visibleBottom) / 2) * totalScale).toFixed(2)
      // Margin inset rect: clips the glow so the user-set "Abstand zum
      // Posterrand" works in glow mode too (was opacity/full-only before).
      const sides = resolveSideMarginsMm(config)
      const hasMargin = sides.top > 0 || sides.right > 0 || sides.bottom > 0 || sides.left > 0
      const mT = mmToUnits(sides.top, canvasW) * mmCorrection
      const mR = mmToUnits(sides.right, canvasW) * mmCorrection
      const mB = mmToUnits(sides.bottom, canvasW) * mmCorrection
      const mL = mmToUnits(sides.left, canvasW) * mmCorrection
      const clipDef = hasMargin
        ? `<clipPath id="m-glow-clip"><rect x="${mL}" y="${mT}" width="${canvasW - mL - mR}" height="${canvasH - mT - mB}"/></clipPath>`
        : ''
      defs =
        `<defs><radialGradient id="m-glow">` +
        `<stop offset="0%" stop-color="#fff" stop-opacity="${intensity}"/>` +
        `<stop offset="100%" stop-color="#fff" stop-opacity="0"/>` +
        `</radialGradient>${clipDef}</defs>`
      const circle = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#m-glow)"/>`
      parts.push(hasMargin ? `<g clip-path="url(#m-glow-clip)">${circle}</g>` : circle)
    }

    parts.push(`<g fill="#fff" fill-opacity="1"${shapeTransform}>${activeShape.markup}</g>`)

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}" width="${canvasW}" height="${canvasH}">${defs}${parts.join('')}</svg>`
  }

  // Portrait — render into an A4-portrait viewBox (595.3 × 841.9) and
  // uniformly fit + centre the shape inside it, mirroring the landscape
  // branch's behaviour. Without uniform-fit, a non-A4 source viewBox (e.g.
  // 572.77 × 549.93 for some custom uploads) gets stretched anisotropically
  // when the mask SVG is rasterised to the poster aspect — the figure ends
  // up vertically elongated. Built-in shapes whose viewBox already matches
  // A4 portrait keep rendering identically.
  //
  // layoutScale uses the EFFECTIVE bottom (after fit) rather than the raw
  // bottomFraction, so a custom mask with a near-square source viewBox
  // doesn't get over-shrunk for non-full layouts: after uniform-fit it may
  // already sit comfortably above the layout's text area, in which case no
  // extra shrinking is needed.
  const canvasW = 595.3
  const canvasH = 841.9
  const fitScale = Math.min(canvasW / shape.width, canvasH / shape.height)
  const bottom = shape.bottomFraction ?? 1
  const effectiveBottom = (shape.height * fitScale * bottom) / canvasH
  const layoutScale = effectiveBottom > layoutMapHeight ? layoutMapHeight / effectiveBottom : 1
  const totalScale = layoutScale * fitScale
  const scaledW = shape.width * totalScale
  const scaledH = shape.height * totalScale
  const tx = +((canvasW - scaledW) / 2).toFixed(2)
  // Anchor at the top when the layout has a text area below; centre when
  // the layout grants the full canvas (mapHeight=1) so symmetric figures
  // don't hug one edge.
  const ty = layoutMapHeight < 1 ? 0 : +((canvasH - scaledH) / 2).toFixed(2)
  const scaleStr = totalScale.toFixed(4)
  const shapeTransform = ` transform="translate(${tx} ${ty}) scale(${scaleStr})"`

  if (outer.mode === 'opacity' || outer.mode === 'full') {
    const sides = resolveSideMarginsMm(config)
    const mT = mmToUnits(sides.top, canvasW)
    const mR = mmToUnits(sides.right, canvasW)
    const mB = mmToUnits(sides.bottom, canvasW)
    const mL = mmToUnits(sides.left, canvasW)
    const w = canvasW - mL - mR
    const h = canvasH - mT - mB
    const op = outer.mode === 'full' ? 1 : outer.opacity
    parts.push(
      `<rect x="${mL}" y="${mT}" width="${w}" height="${h}" fill="#fff" fill-opacity="${op}"/>`,
    )
  }

  // Glow: a true radial gradient on a circle centred on the shape's
  // visual midpoint (in canvas coords, since the shape is uniform-fit
  // into the canvas). Rendering correctness in CSS mask-image relies on
  // the consumer rasterising this SVG to a PNG first (see
  // useRasterizedMaskUrl in PosterCanvas) — Chromium doesn't always
  // honour <radialGradient> when an SVG data URL is used directly as a
  // mask source. The canvas export pipeline rasterises by default.
  let defs = ''
  if (outer.mode === 'glow') {
    const radiusMm = outer.glowRadius ?? 250
    const intensity = outer.glowIntensity ?? 0.5
    const r = mmToUnits(radiusMm, canvasW).toFixed(2)
    const visibleBottom = Math.min(bottom, layoutMapHeight)
    const cx = (tx + (shape.width / 2) * totalScale).toFixed(2)
    const cy = (ty + ((shape.height * visibleBottom) / 2) * totalScale).toFixed(2)
    const sides = resolveSideMarginsMm(config)
    const hasMargin = sides.top > 0 || sides.right > 0 || sides.bottom > 0 || sides.left > 0
    const mT = mmToUnits(sides.top, canvasW)
    const mR = mmToUnits(sides.right, canvasW)
    const mB = mmToUnits(sides.bottom, canvasW)
    const mL = mmToUnits(sides.left, canvasW)
    const clipDef = hasMargin
      ? `<clipPath id="m-glow-clip"><rect x="${mL}" y="${mT}" width="${canvasW - mL - mR}" height="${canvasH - mT - mB}"/></clipPath>`
      : ''
    defs =
      `<defs><radialGradient id="m-glow">` +
      `<stop offset="0%" stop-color="#fff" stop-opacity="${intensity}"/>` +
      `<stop offset="100%" stop-color="#fff" stop-opacity="0"/>` +
      `</radialGradient>${clipDef}</defs>`
    const circle = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#m-glow)"/>`
    parts.push(hasMargin ? `<g clip-path="url(#m-glow-clip)">${circle}</g>` : circle)
  }

  // Shape always drawn at full opacity on top (unless mode=full made it redundant)
  parts.push(`<g fill="#fff" fill-opacity="1"${shapeTransform}>${shape.markup}</g>`)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}" width="${canvasW}" height="${canvasH}">${defs}${parts.join('')}</svg>`
}

/**
 * Build the decorative frame SVG (strokes). Returns empty SVG if nothing enabled.
 */
export function composeFrameSvg(
  shape: ShapeDefinition,
  config: ShapeConfigState,
  layoutMapHeight: number = 1,
  /** mm equivalent of `shape.width`. Defaults to 210 (A4 portrait short
   *  edge), matching the convention of all uploaded mask SVGs. Synthetic
   *  landscape frames pass 297 so mm offsets stay honest. */
  referenceMm: number = 210,
  orientation: 'portrait' | 'landscape' = 'portrait',
): string {
  // Landscape branch — render into A4-landscape viewBox. The OUTER frame
  // wraps the actual landscape canvas (not the shape's portrait box), and
  // the INNER frame contour follows the same uniform-fit + centred shape
  // transform that composeMaskSvg uses, so the two layers stay in lockstep.
  if (orientation === 'landscape') {
    // PROJ-37 Stufe 1: prefer pre-baked landscape geometry when shape
    // ships one — keeps the frame contour in lockstep with the mask.
    const activeShape = shape.shapeLandscape ?? shape
    const canvasW = 841.9
    const canvasH = 595.3
    const mmCorrectionLand = 210 / 297
    const toUnitsLand = (mm: number) => mmToUnits(mm, canvasW) * mmCorrectionLand

    const bottom = activeShape.bottomFraction ?? 1
    const layoutScale = bottom > layoutMapHeight ? layoutMapHeight / bottom : 1
    const fitScale = Math.min(canvasW / activeShape.width, canvasH / activeShape.height)
    const landscapeScale = activeShape.landscapeScale ?? 1
    const totalScale = layoutScale * fitScale * landscapeScale
    const scaledW = activeShape.width * totalScale
    const scaledH = activeShape.height * totalScale
    const tx = +((canvasW - scaledW) / 2).toFixed(2)
    const ty = +((canvasH - scaledH) / 2 + canvasH * (activeShape.landscapeYOffset ?? 0)).toFixed(2)

    const parts: string[] = []
    const { innerFrame, outerFrame } = config

    if (outerFrame.enabled) {
      const offsetMm = outerFrame.offset ?? 10
      const off0 = toUnitsLand(offsetMm)
      const thickness = toUnitsLand(outerFrame.thickness)
      const w = canvasW - 2 * off0
      const h = canvasH - 2 * off0
      parts.push(
        `<rect x="${off0}" y="${off0}" width="${w}" height="${h}" fill="none" stroke="${outerFrame.color}" stroke-width="${thickness}"/>`,
      )
      if (outerFrame.style === 'double') {
        const gap = toUnitsLand(outerFrame.gap)
        const off = thickness + gap
        const innerX = off0 + off
        const innerY = off0 + off
        const innerW = canvasW - 2 * off0 - 2 * off
        const innerH = canvasH - 2 * off0 - 2 * off
        if (innerW > 0 && innerH > 0) {
          parts.push(
            `<rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" fill="none" stroke="${outerFrame.color}" stroke-width="${thickness}"/>`,
          )
        }
      }
    }

    if (innerFrame.enabled) {
      const thickness = toUnitsLand(innerFrame.thickness)
      // Stroke is drawn AFTER scaling, so divide by totalScale to keep the
      // visual thickness constant.
      const scaledThickness = thickness / (totalScale || 1)
      const innerTransform = ` transform="translate(${tx} ${ty}) scale(${totalScale.toFixed(4)})"`
      parts.push(
        `<g fill="none" stroke="${innerFrame.color}" stroke-width="${scaledThickness}" stroke-linejoin="round"${innerTransform}>${activeShape.markup}</g>`,
      )
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}">${parts.join('')}</svg>`
  }

  // Portrait — render into A4-portrait viewBox and uniform-fit + center
  // the shape inside it (mirrors composeMaskSvg portrait branch). Outer
  // frame wraps the canvas (not the shape's source viewBox), inner frame
  // strokes follow the same fit-and-centre transform as the mask so they
  // stay aligned.
  const canvasW = 595.3
  const canvasH = 841.9
  const fitScale = Math.min(canvasW / shape.width, canvasH / shape.height)
  const bottom = shape.bottomFraction ?? 1
  const effectiveBottom = (shape.height * fitScale * bottom) / canvasH
  const layoutScale = effectiveBottom > layoutMapHeight ? layoutMapHeight / effectiveBottom : 1
  const totalScale = layoutScale * fitScale
  const scaledW = shape.width * totalScale
  const scaledH = shape.height * totalScale
  const tx = +((canvasW - scaledW) / 2).toFixed(2)
  const ty = layoutMapHeight < 1 ? 0 : +((canvasH - scaledH) / 2).toFixed(2)
  const frameTransform = ` transform="translate(${tx} ${ty}) scale(${totalScale.toFixed(4)})"`
  const parts: string[] = []
  const { innerFrame, outerFrame } = config
  const mmCorrection = 210 / referenceMm
  const toUnits = (mm: number) => mmToUnits(mm, canvasW) * mmCorrection

  if (outerFrame.enabled) {
    // Eigener Offset (alle Seiten gleich), nicht an outer.margin gekoppelt.
    const offsetMm = outerFrame.offset ?? 10
    const off0 = toUnits(offsetMm)
    const thickness = toUnits(outerFrame.thickness)
    const w = canvasW - 2 * off0
    const h = canvasH - 2 * off0
    parts.push(
      `<rect x="${off0}" y="${off0}" width="${w}" height="${h}" fill="none" stroke="${outerFrame.color}" stroke-width="${thickness}"/>`,
    )
    if (outerFrame.style === 'double') {
      const gap = toUnits(outerFrame.gap)
      const off = thickness + gap
      const innerX = off0 + off
      const innerY = off0 + off
      const innerW = canvasW - 2 * off0 - 2 * off
      const innerH = canvasH - 2 * off0 - 2 * off
      if (innerW > 0 && innerH > 0) {
        parts.push(
          `<rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" fill="none" stroke="${outerFrame.color}" stroke-width="${thickness}"/>`,
        )
      }
    }
  }

  if (innerFrame.enabled) {
    const thickness = toUnits(innerFrame.thickness)
    // Compensate stroke thickness so the outline doesn't thicken when the
    // shape is scaled down by the fit+layout transform.
    const scaledThickness = thickness / (totalScale || 1)
    parts.push(
      `<g fill="none" stroke="${innerFrame.color}" stroke-width="${scaledThickness}" stroke-linejoin="round"${frameTransform}>${shape.markup}</g>`,
    )
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}">${parts.join('')}</svg>`
}

/**
 * Build a left- or right-half alpha-mask SVG for a split mask. Used in
 * dual-map and split-photo modes. The static SVGs in /public/masks/ are
 * authored at the canonical portrait viewBox (e.g. 100×141, 595×842) and
 * served as-is. When the poster is in landscape orientation the canvas
 * aspect flips to 1.41:1 — `mask-size: 100% 100%` would stretch the
 * portrait SVG horizontally and turn circles into ovals, hearts into
 * lemons. This helper generates an orientation-aware SVG that fits the
 * shape uniformly into the current canvas and clips to the requested
 * half — analogous to `composeMaskSvg` for non-split masks.
 *
 * Portrait orientation just emits the shape in its native viewBox with
 * a rect-clip on the requested half (or uses pre-baked `splitMarkup`
 * when the mask provides it, e.g. hearts-curved / hearts-diagonal).
 */
export function composeSplitMaskHalfSvg(
  shape: ShapeDefinition,
  half: 'left' | 'right',
  orientation: 'portrait' | 'landscape' = 'portrait',
): string {
  const { width: W, height: H, splitMarkup, markup } = shape
  const halfMarkup = splitMarkup?.[half]

  // Small overlap past the centerline so paths whose centre point lies
  // marginally off the viewBox midline (e.g. heart's top dip at x=298 in
  // a 595.3-wide viewBox where centre is 297.65) still appear in the
  // clipped half. The PosterCanvas application-clip enforces the visible
  // seam-gap, so a few units of overlap here are invisible to the user.
  const OVERLAP_PT = 2

  if (orientation === 'portrait') {
    const viewBox = `0 0 ${W} ${H}`
    if (halfMarkup) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><g fill="black">${halfMarkup}</g></svg>`
    }
    const halfX = W / 2
    const clipX = half === 'left' ? 0 : halfX - OVERLAP_PT
    const clipW = halfX + OVERLAP_PT
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><defs><clipPath id="h"><rect x="${clipX}" y="0" width="${clipW}" height="${H}"/></clipPath></defs><g fill="black" clip-path="url(#h)">${markup}</g></svg>`
  }

  // Landscape: A4-landscape canvas (841.9 × 595.3), uniform-fit + centre
  // the shape (same approach as composeMaskSvg). Half-clip references the
  // landscape canvas's midline so each map slot gets its proper side.
  // PROJ-37 Stufe 1: shape.shapeLandscape overrides if present.
  const activeShape = shape.shapeLandscape ?? shape
  const activeMarkup = activeShape.markup
  const activeHalfMarkup = activeShape.splitMarkup?.[half]
  const activeW = activeShape.width
  const activeH = activeShape.height
  const canvasW = 841.9
  const canvasH = 595.3
  const fitScale = Math.min(canvasW / activeW, canvasH / activeH)
  const landscapeScale = activeShape.landscapeScale ?? 1
  const landscapeYOffset = activeShape.landscapeYOffset ?? 0
  const totalScale = fitScale * landscapeScale
  const fittedW = activeW * totalScale
  const fittedH = activeH * totalScale
  const tx = ((canvasW - fittedW) / 2).toFixed(2)
  const ty = ((canvasH - fittedH) / 2 + canvasH * landscapeYOffset).toFixed(2)
  const shapeTransform = `translate(${tx} ${ty}) scale(${totalScale.toFixed(4)})`

  const OVERLAP_LAND = 3
  const halfCanvasX = canvasW / 2
  const clipX = half === 'left' ? 0 : halfCanvasX - OVERLAP_LAND
  const clipW = halfCanvasX + OVERLAP_LAND

  if (activeHalfMarkup) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}"><g transform="${shapeTransform}" fill="black">${activeHalfMarkup}</g></svg>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}"><defs><clipPath id="h"><rect x="${clipX}" y="0" width="${clipW}" height="${canvasH}"/></clipPath></defs><g clip-path="url(#h)"><g transform="${shapeTransform}" fill="black">${activeMarkup}</g></g></svg>`
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
 * The viewBox aspect follows `orientation` so the mask matches the actual
 * canvas shape (otherwise the rasterised SVG gets stretched and the inset
 * is no longer uniform). mm-arithmetic still uses the standard 595.3/210
 * unit-per-mm convention, so values stay consistent across portrait and
 * landscape.
 */
export function composeFullbleedMaskSvg(
  config: ShapeConfigState,
  orientation: 'portrait' | 'landscape' = 'portrait',
): string {
  const { outer } = config
  if (outer.mode === 'none') return ''
  const sides = resolveSideMarginsMm(config)
  if (sides.top === 0 && sides.right === 0 && sides.bottom === 0 && sides.left === 0) {
    return ''
  }
  const W = orientation === 'landscape' ? 841.9 : 595.3
  const H = orientation === 'landscape' ? 595.3 : 841.9
  // mmToUnits assumes a 210mm reference width; in landscape the SVG width
  // represents 297mm, so multiply by 210/refMm to keep mm values honest.
  const refMm = orientation === 'landscape' ? 297 : 210
  const mmCorrection = 210 / refMm
  const mT = mmToUnits(sides.top, W) * mmCorrection
  const mR = mmToUnits(sides.right, W) * mmCorrection
  const mB = mmToUnits(sides.bottom, W) * mmCorrection
  const mL = mmToUnits(sides.left, W) * mmCorrection
  const w = W - mL - mR
  const h = H - mT - mB
  if (w <= 0 || h <= 0) return ''
  const op = outer.mode === 'full' ? 1 : (outer.opacity ?? 1)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect x="${mL}" y="${mT}" width="${w}" height="${h}" fill="#fff" fill-opacity="${op}"/></svg>`
}
