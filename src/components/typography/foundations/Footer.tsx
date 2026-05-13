'use client'

import { RingsSymbol } from './RingsSymbol'

/**
 * Foundation: Footer-Block für Typografie-Hochzeitsposter.
 *
 * Layout (Etsy-Standard):
 *   [optionales Mini-Symbol — Ringe oder Herz]
 *   NAME 1  &  NAME 2
 *           DATUM (optional)
 *
 * Long-Name-Handling: Container hat festes Width (Container-Query-Pattern),
 * Names + Dates kriegen `text-balance` + auto-shrink via CSS clamp() für
 * sehr lange Eingaben. Echtes Resize-Observer-Auto-Shrink kommt in Chunk 2,
 * sobald wir mehr realen Edge-Case-Input haben.
 */
type FooterSymbol = 'none' | 'rings' | 'heart'

interface FooterProps {
  name1: string
  name2: string
  /** Vorformatiertes Datum (Locale wird vom Caller aufgelöst). Leerer String = nicht rendern. */
  formattedDate: string
  fontFamily: string
  color: string
  /** Basis-Font-Size für Namen (logische Pixel). */
  namesFontSize: number
  /** Font-Size für Datum (~60 % der Names-Size ist Etsy-Standard). */
  dateFontSize: number
  /** Welches Mini-Symbol zwischen die Namen platzieren ('none' = kein Symbol). */
  symbol?: FooterSymbol
}

export function Footer({
  name1,
  name2,
  formattedDate,
  fontFamily,
  color,
  namesFontSize,
  dateFontSize,
  symbol = 'none',
}: FooterProps) {
  const hasNames = name1.trim() !== '' || name2.trim() !== ''
  const hasDate = formattedDate.trim() !== ''

  if (!hasNames && !hasDate) return null

  // Approximate Auto-Shrink: bei langen Namen Font-Size schrittweise reduzieren.
  // Final-Lösung in Chunk 2 via ResizeObserver, MVP-Variante reicht für die
  // typischen 95 % der Customer-Eingaben (~10–25 Zeichen pro Name).
  const combinedLength = name1.length + name2.length
  const scale =
    combinedLength <= 24 ? 1
      : combinedLength <= 36 ? 0.85
      : combinedLength <= 48 ? 0.7
      : 0.6
  const effectiveNamesSize = Math.round(namesFontSize * scale)

  return (
    <div
      className="flex flex-col items-center"
      style={{ fontFamily, color }}
    >
      {symbol === 'rings' ? (
        <div className="mb-2">
          <RingsSymbol size={Math.round(namesFontSize * 0.55)} color={color} />
        </div>
      ) : symbol === 'heart' ? (
        <div className="mb-2" style={{ fontSize: namesFontSize * 0.5, lineHeight: 1 }}>
          ♥
        </div>
      ) : null}

      {hasNames ? (
        <div
          className="font-medium tracking-[0.18em] uppercase text-center whitespace-nowrap"
          style={{ fontSize: effectiveNamesSize, lineHeight: 1.2 }}
        >
          {[name1, name2].filter((n) => n.trim() !== '').join('  ·  ')}
        </div>
      ) : null}

      {hasDate ? (
        <div
          className="tracking-[0.16em] uppercase text-center mt-2"
          style={{ fontSize: dateFontSize, lineHeight: 1.2, opacity: 0.85 }}
        >
          {formattedDate}
        </div>
      ) : null}
    </div>
  )
}
