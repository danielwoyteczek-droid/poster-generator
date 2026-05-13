'use client'

/**
 * Foundation: Verschlungene Ringe als kleines Ornament (z. B. zwischen
 * den Paar-Namen im Footer). SVG-basiert für saubere Skalierung.
 */
interface RingsSymbolProps {
  /** Symbol-Größe in logischen Pixeln (height = width). */
  size: number
  color: string
}

export function RingsSymbol({ size, color }: RingsSymbolProps) {
  const stroke = Math.max(1, size / 16)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="11" cy="8" r="6" stroke={color} strokeWidth={stroke} fill="none" />
      <circle cx="21" cy="8" r="6" stroke={color} strokeWidth={stroke} fill="none" />
    </svg>
  )
}
