'use client'

/**
 * Foundation: Hero-Script-Text mit optionalem horizontalem Flourish.
 *
 * Pattern: Das Wort steht zentriert auf einer durchgezogenen Linie, die
 * deutlich über das Wort hinausragt (siehe Design "Lena & Marc" — das "ja"
 * sitzt auf einer Linie, die fast die volle Breite des Posters einnimmt).
 * Der Flourish wird via CSS-Pseudo-Element gerendert (kein extra SVG nötig),
 * damit das Rendering im Headless-Browser garantiert identisch zum Live-Edit
 * aussieht.
 */
interface ScriptTextProps {
  text: string
  fontFamily: string
  color: string
  /** Font-Größe in logischen Pixeln (Editor-Canvas läuft im Logical-Pixel-Space). */
  fontSize: number
  /** Optional: horizontale Linie durchs Wort (Etsy-Standard-Pattern). */
  showFlourish?: boolean
  /** Breite der Flourish-Linie in % der Container-Breite (default: 70 %). */
  flourishWidthPct?: number
}

export function ScriptText({
  text,
  fontFamily,
  color,
  fontSize,
  showFlourish = true,
  flourishWidthPct = 70,
}: ScriptTextProps) {
  return (
    <div className="relative flex items-center justify-center w-full">
      {showFlourish ? (
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: `${flourishWidthPct}%`,
            height: 1,
            background: color,
          }}
        />
      ) : null}
      <span
        className="relative z-10 italic leading-none"
        style={{
          fontFamily,
          fontSize,
          color,
        }}
      >
        {text}
      </span>
    </div>
  )
}
