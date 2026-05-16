'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/** Expand #abc → #aabbcc, ensure a leading # and lowercase. Returns null for
 *  anything that isn't a valid 3- or 6-digit hex colour. */
function normalizeHex(raw: string): string | null {
  const m = raw.trim().replace(/^#/, '')
  if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(m)) return null
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  return `#${full.toLowerCase()}`
}

/**
 * Compact hex text field for the palette colour editors. Lets the user type
 * or paste a hex value directly — the native <input type="color"> only
 * exposes an RGB/HSL picker. Commits to `onChange` as soon as the draft is a
 * valid hex; on blur an invalid draft reverts to the last good value.
 */
export function HexColorInput({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (hex: string) => void
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)

  // Keep the field in sync when the colour changes elsewhere (native picker,
  // reset button) — but never overwrite what the user is currently typing.
  useEffect(() => {
    if (!focused) setDraft(value)
  }, [value, focused])

  const invalid = normalizeHex(draft) === null

  return (
    <input
      type="text"
      spellCheck={false}
      maxLength={7}
      value={draft}
      onChange={(e) => {
        const v = e.target.value
        setDraft(v)
        const norm = normalizeHex(v)
        if (norm) onChange(norm)
      }}
      onFocus={(e) => {
        setFocused(true)
        e.target.select()
      }}
      onBlur={() => {
        setFocused(false)
        setDraft(normalizeHex(draft) ?? value)
      }}
      aria-label="Hex-Farbwert"
      className={cn(
        'w-[4.75rem] shrink-0 rounded border bg-background px-1.5 py-0.5 text-right',
        'font-mono tabular-nums uppercase outline-none focus:ring-1 focus:ring-primary',
        invalid ? 'border-red-400 text-red-500' : 'border-border text-muted-foreground',
        className,
      )}
    />
  )
}
