'use client'

import { useCallback, useEffect, useState } from 'react'
import { type ArrayOfPrimitivesInputProps, type PatchEvent, set, unset, useFormValue } from 'sanity'

/**
 * Custom Sanity Studio input für `featuredPresetIds` auf occasionPage.
 *
 * Statt rohe UUIDs als Tags einzugeben, zeigt diese Komponente alle
 * publizierten Presets aus Supabase mit Name + Vorschaubild und
 * speichert die ausgewählten UUIDs in der gepflegten Reihenfolge.
 *
 * Authentifizierung läuft über die Supabase-Session-Cookies, die das
 * Studio (gehostet unter /studio) automatisch mitschickt — `/api/admin/presets`
 * verlangt `requireAdmin()`, das funktioniert hier nahtlos, solange der
 * eingeloggte User Admin-Rechte hat.
 */

interface Preset {
  id: string
  name: string
  poster_type: 'map' | 'star-map'
  preview_image_url: string | null
  status: 'draft' | 'published'
  target_locales: string[] | null
  occasions: string[] | null
}

const buttonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #e2e2e6',
  borderRadius: 4,
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: 12,
  lineHeight: 1.2,
  color: 'inherit',
}

const cardStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 48px 1fr auto',
  gap: 12,
  alignItems: 'center',
  padding: 8,
  border: '1px solid #e2e2e6',
  borderRadius: 6,
}

const thumbStyle: React.CSSProperties = {
  width: 48,
  height: 64,
  objectFit: 'cover',
  borderRadius: 4,
  background: '#f4f4f5',
  border: '1px solid #e2e2e6',
}

export function PresetPickerInput(props: ArrayOfPrimitivesInputProps) {
  const value = (props.value as string[] | undefined) ?? []

  const language = useFormValue(['language']) as string | undefined
  const occasion = useFormValue(['occasion']) as string | undefined

  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Per default nur Presets zeigen, deren target_locales + occasions zur Seite
  // passen — das ist der häufigste Curation-Case. Lässt sich aber per Toggle
  // abschalten falls Marketing ein Preset ohne passendes Tag featuren will.
  const [filterMatch, setFilterMatch] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ status: 'published' })
    if (filterMatch && language) params.set('locale', language)
    if (filterMatch && occasion) params.set('occasion', occasion)

    fetch(`/api/admin/presets?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const d = await r.json()
        if (!cancelled) setPresets((d.presets ?? []) as Preset[])
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [language, occasion, filterMatch])

  const emit = useCallback(
    (next: string[]) => {
      const event: PatchEvent | ReturnType<typeof set> | ReturnType<typeof unset> =
        next.length === 0 ? unset() : set(next)
      props.onChange(event)
    },
    [props],
  )

  const toggle = (id: string) => {
    if (value.includes(id)) emit(value.filter((v) => v !== id))
    else emit([...value, id])
  }

  const move = (idx: number, dir: -1 | 1) => {
    const tgt = idx + dir
    if (tgt < 0 || tgt >= value.length) return
    const next = [...value]
    ;[next[idx], next[tgt]] = [next[tgt], next[idx]]
    emit(next)
  }

  // Map id → preset für den ausgewählten Block (auch wenn Preset im Filter
  // nicht enthalten ist, soll es in der Selected-Liste angezeigt werden)
  const presetById = new Map(presets.map((p) => [p.id, p]))
  // Wenn ein ausgewähltes Preset durch den Filter gerutscht ist (z. B. Tag
  // entfernt), holen wir es separat dazu — sonst sieht der User nur leere IDs.
  const missingIds = value.filter((id) => !presetById.has(id))
  const [missing, setMissing] = useState<Preset[]>([])
  useEffect(() => {
    if (missingIds.length === 0) {
      setMissing([])
      return
    }
    let cancelled = false
    fetch('/api/admin/presets?status=all')
      .then(async (r) => (r.ok ? r.json() : { presets: [] }))
      .then((d) => {
        if (cancelled) return
        const all = (d.presets ?? []) as Preset[]
        setMissing(all.filter((p) => missingIds.includes(p.id)))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingIds.join(',')])
  for (const m of missing) presetById.set(m.id, m)

  const selectedPresets = value
    .map((id) => presetById.get(id))
    .filter((p): p is Preset => Boolean(p))

  const availablePresets = presets.filter((p) => !value.includes(p.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Selected list with order controls */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 8,
            color: '#5e5e72',
          }}
        >
          Ausgewählt ({selectedPresets.length})
        </div>
        {selectedPresets.length === 0 ? (
          <div style={{ fontSize: 13, color: '#8e8e9c', fontStyle: 'italic' }}>
            Noch keine Presets ausgewählt — wähle unten welche aus.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedPresets.map((preset, idx) => (
              <div key={preset.id} style={cardStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button
                    type="button"
                    style={{ ...buttonStyle, padding: '2px 6px' }}
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    title="Nach oben"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    style={{ ...buttonStyle, padding: '2px 6px' }}
                    onClick={() => move(idx, 1)}
                    disabled={idx === selectedPresets.length - 1}
                    title="Nach unten"
                  >
                    ↓
                  </button>
                </div>
                {preset.preview_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preset.preview_image_url} alt={preset.name} style={thumbStyle} />
                ) : (
                  <div style={thumbStyle} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{preset.name}</div>
                  <div style={{ fontSize: 11, color: '#8e8e9c' }}>
                    {preset.poster_type === 'star-map' ? 'Sternenkarte' : 'Stadtposter'}
                    {preset.target_locales && preset.target_locales.length > 0
                      ? ` · ${preset.target_locales.join(', ')}`
                      : ''}
                  </div>
                </div>
                <button
                  type="button"
                  style={{ ...buttonStyle, color: '#c2185b' }}
                  onClick={() => toggle(preset.id)}
                  title="Entfernen"
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter toggle + available list */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#5e5e72' }}>
            Verfügbare Presets {filterMatch && (language || occasion) ? '(gefiltert)' : '(alle)'}
          </div>
          <label
            style={{
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={filterMatch}
              onChange={(e) => setFilterMatch(e.target.checked)}
            />
            Nur passende ({language ?? '—'} · {occasion ?? '—'})
          </label>
        </div>
        {loading && <div style={{ fontSize: 13, color: '#8e8e9c' }}>Lade …</div>}
        {error && (
          <div style={{ fontSize: 13, color: '#c2185b' }}>
            Fehler beim Laden: {error}
          </div>
        )}
        {!loading && !error && availablePresets.length === 0 && (
          <div style={{ fontSize: 13, color: '#8e8e9c', fontStyle: 'italic' }}>
            Keine weiteren Presets passend zu diesem Filter.
          </div>
        )}
        {availablePresets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {availablePresets.map((preset) => (
              <div key={preset.id} style={{ ...cardStyle, gridTemplateColumns: 'auto 48px 1fr auto' }}>
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => toggle(preset.id)}
                  style={{ cursor: 'pointer' }}
                />
                {preset.preview_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preset.preview_image_url} alt={preset.name} style={thumbStyle} />
                ) : (
                  <div style={thumbStyle} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{preset.name}</div>
                  <div style={{ fontSize: 11, color: '#8e8e9c' }}>
                    {preset.poster_type === 'star-map' ? 'Sternenkarte' : 'Stadtposter'}
                    {preset.target_locales && preset.target_locales.length > 0
                      ? ` · ${preset.target_locales.join(', ')}`
                      : ''}
                    {preset.occasions && preset.occasions.length > 0
                      ? ` · ${preset.occasions.join(', ')}`
                      : ''}
                  </div>
                </div>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => toggle(preset.id)}
                >
                  Hinzufügen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
