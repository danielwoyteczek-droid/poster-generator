'use client'

/**
 * Foundation: SVG-Hero-Asset. Rendert eine SVG-Datei aus /public als
 * CSS-Mask-Layer auf einem farbigen Hintergrund-Div. Damit ist die Farbe
 * außen kontrollierbar (Palette.ink) und das SVG bleibt eine einzige
 * Asset-Datei.
 *
 * Trade-off: Das SVG muss als reines Silhouetten-/Fill-Asset funktionieren —
 * Mehrfarbige Logos würden monochrom umgemalt. Für Wedding-Typographie ist
 * das gewollt (Designs sind eh 1-Farb-Glyphen).
 *
 * Aspect-Ratio kommt aus dem SVG (mask-size: contain). Der Caller gibt nur
 * Width vor, Höhe folgt; falls eine exakte Höhe nötig wird, fügen wir später
 * eine optionale `aspect`-Prop hinzu.
 */
interface SvgHeroProps {
  /** Pfad zur SVG-Datei (ab /public). */
  src: string
  /** Breite in logischen Pixeln. */
  width: number
  /** Höhe in logischen Pixeln. Caller weiß die Composition-Höhe. */
  height: number
  /** Farbe (wird zur Mask-Fill). */
  color: string
  /** Screenreader-Label. */
  alt?: string
}

export function SvgHero({ src, width, height, color, alt = '' }: SvgHeroProps) {
  const maskUrl = `url(${JSON.stringify(src)})`
  return (
    <div
      role={alt === '' ? 'presentation' : 'img'}
      aria-label={alt || undefined}
      style={{
        width,
        height,
        background: color,
        WebkitMaskImage: maskUrl,
        maskImage: maskUrl,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  )
}
