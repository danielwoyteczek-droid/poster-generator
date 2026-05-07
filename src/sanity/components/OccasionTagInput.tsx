'use client'

import { useEffect, useState } from 'react'
import { set, unset, useClient, type StringInputProps } from 'sanity'

/**
 * PROJ-29 Iteration 2: Sanity Studio dropdown for occasion-tag fields.
 *
 * Replaces the hardcoded `options: { list: [...] }` on `galleryPage`
 * `categories[].tag` and `occasionPage.occasion`. Fetches the current
 * `occasion`-Doc list at render-time and shows it as a Select. The
 * stored value stays a plain string (the occasion's `code.current`),
 * so existing documents are unaffected — the only thing that changes
 * is which options appear in the dropdown.
 *
 * Self-contained: no schema-side options.list needed; this component
 * is the entire UI for the field.
 */

interface OccasionOption {
  code: string
  title: string
}

export function OccasionTagInput(props: StringInputProps) {
  const client = useClient({ apiVersion: '2024-10-01' })
  const [options, setOptions] = useState<OccasionOption[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    client
      .fetch<OccasionOption[]>(
        `*[_type == "occasion" && defined(code.current)] | order(displayOrder asc, title asc) { "code": code.current, title }`,
      )
      .then((data) => {
        if (cancelled) return
        setOptions(data ?? [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [client])

  const value = props.value ?? ''

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.currentTarget.value
    props.onChange(next ? set(next) : unset())
  }

  // Plain HTML — no @sanity/ui dependency. Sanity Studio applies its own
  // theming to native form elements via global CSS, so this still looks
  // consistent within the Studio.
  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    border: '1px solid var(--card-border-color, #ccc)',
    background: 'var(--card-bg-color, #fff)',
    color: 'var(--card-fg-color, #000)',
    fontSize: '0.95rem',
  }

  if (options === null) {
    return <div style={{ color: 'var(--card-muted-fg-color, #666)', fontSize: '0.85rem' }}>Lade Anlässe…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <select
        value={value}
        onChange={handleChange}
        disabled={props.readOnly}
        style={selectStyle}
      >
        <option value="">— Anlass wählen —</option>
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.title} ({opt.code})
          </option>
        ))}
        {/* If the saved value is a code that no longer exists as an occasion-Doc
            (e.g. someone renamed it), show it anyway so the field doesn't appear
            empty — admin can pick something else or recreate the missing doc. */}
        {value && !options.some((o) => o.code === value) && (
          <option value={value}>⚠ {value} (nicht in Sanity gefunden)</option>
        )}
      </select>
      {options.length === 0 && !error && (
        <p style={{ fontSize: '0.85rem', color: 'var(--card-muted-fg-color, #666)', margin: 0 }}>
          Noch keine Anlässe definiert. Lege zuerst Anlässe unter „Anlässe (Stammdaten)" an.
        </p>
      )}
      {error && (
        <p style={{ fontSize: '0.85rem', color: '#c00', margin: 0 }}>
          Anlässe konnten nicht geladen werden: {error}
        </p>
      )}
    </div>
  )
}
