'use client'

import { useEffect, useState } from 'react'
import { set, unset, type StringInputProps } from 'sanity'

/**
 * PROJ-42: Sanity Studio dropdown for city-FK fields.
 *
 * Loads the live `cities` table from Supabase via the public
 * `/api/cities` endpoint and shows it as a Select. The stored value is
 * the city's `slug_base` (a plain string) — Sanity does not know about
 * Postgres, so we use a string-FK pattern with this picker as the UX
 * layer and a custom validator (defined in the cityPage schema) as the
 * safety net.
 *
 * If the saved value points at a city that no longer exists in the DB,
 * we still show it so the field doesn't appear empty — the validator
 * will flag it as invalid on save.
 */

interface CityOption {
  slug_base: string
  name: string
  country_code: string
  region: string | null
}

const FETCH_URL = '/api/cities?limit=500'

export function CityIdInput(props: StringInputProps) {
  const [options, setOptions] = useState<CityOption[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(FETCH_URL, { headers: { Accept: 'application/json' } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as { cities: CityOption[] }
      })
      .then((data) => {
        if (cancelled) return
        setOptions(data.cities ?? [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = props.value ?? ''

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.currentTarget.value
    props.onChange(next ? set(next) : unset())
  }

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
    return (
      <div style={{ color: 'var(--card-muted-fg-color, #666)', fontSize: '0.85rem' }}>
        Lade Staedte…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <select
        value={value}
        onChange={handleChange}
        disabled={props.readOnly}
        style={selectStyle}
      >
        <option value="">— Stadt waehlen —</option>
        {options.map((opt) => {
          const labelSuffix = opt.region ? `${opt.region}, ${opt.country_code}` : opt.country_code
          return (
            <option key={`${opt.country_code}:${opt.slug_base}`} value={opt.slug_base}>
              {opt.name} ({labelSuffix})
            </option>
          )
        })}
        {value && !options.some((o) => o.slug_base === value) && (
          <option value={value}>⚠ {value} (nicht in DB gefunden)</option>
        )}
      </select>
      {options.length === 0 && !error && (
        <p style={{ fontSize: '0.85rem', color: 'var(--card-muted-fg-color, #666)', margin: 0 }}>
          Noch keine Staedte angelegt. Lege zuerst Staedte im Admin-Bereich an.
        </p>
      )}
      {error && (
        <p style={{ fontSize: '0.85rem', color: '#c00', margin: 0 }}>
          Staedte konnten nicht geladen werden: {error}
        </p>
      )}
    </div>
  )
}
