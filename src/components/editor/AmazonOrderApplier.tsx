'use client'

/**
 * PROJ-31: Eine Amazon-Bestellung im echten Editor öffnen.
 *
 * Aufruf: /[locale]/map?amazon_order=<id>
 *
 * Die automatische Auswertung trifft die Angaben des Käufers, aber nicht
 * immer die Gestaltung — ein langer Name braucht eine kleinere Schrift, der
 * Kartenausschnitt sitzt daneben. Deshalb dieselbe Oberfläche wie für
 * Kunden, statt einer zweiten, schlechteren Nachbildung im Admin.
 *
 * Ablauf:
 *   1. Preset anwenden (die Grundlage, wie bei jedem Deep-Link)
 *   2. Angaben des Käufers darüberlegen — Ort, Texte, Format
 *   3. Leiste einblenden, über die der angepasste Zustand zurückgeht
 *
 * Wurde die Bestellung schon einmal von Hand angepasst, gewinnt der
 * gespeicherte Zustand: eine Handkorrektur soll nicht bei jedem Öffnen
 * wieder von der Automatik überschrieben werden.
 */

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { applyPreset } from '@/lib/apply-preset'
import { useEditorStore, type TextBlock } from '@/hooks/useEditorStore'
import { invalidateCustomMasksCache } from '@/hooks/useCustomMasks'
import type { PrintFormat } from '@/lib/print-formats'
import type { EditorPayload } from '@/app/api/admin/amazon/orders/[id]/editor/route'
import { AmazonOrderBar } from './AmazonOrderBar'

const VALID_FORMATS: ReadonlySet<string> = new Set(['a4', 'a3', 'a2'])

export function AmazonOrderApplier() {
  const searchParams = useSearchParams()
  const [payload, setPayload] = useState<EditorPayload | null>(null)
  const appliedRef = useRef<string | null>(null)

  useEffect(() => {
    const id = searchParams.get('amazon_order')
    if (!id || appliedRef.current === id) return
    appliedRef.current = id

    let cancelled = false

    void (async () => {
      let data: EditorPayload
      try {
        const r = await fetch(`/api/admin/amazon/orders/${id}/editor`)
        if (r.status === 401 || r.status === 403) {
          toast.error('Nur für Admins.')
          return
        }
        if (!r.ok) throw new Error((await r.json()).error ?? 'Laden fehlgeschlagen')
        data = await r.json()
      } catch (e) {
        toast.error(`Bestellung konnte nicht geladen werden: ${(e as Error).message}`)
        return
      }
      if (cancelled) return

      if (!data.preset) {
        toast.error('Dieser SKU ist noch kein Design zugeordnet.')
        setPayload(data)
        return
      }

      invalidateCustomMasksCache()

      // Schon einmal von Hand angepasst? Dann gewinnt dieser Zustand.
      if (data.editor_state) {
        applyPreset(
          { poster_type: 'map', config_json: data.editor_state as Record<string, unknown> },
          { mode: 'full' },
        )
        applyStoredExtras(data.editor_state as Record<string, unknown>)
        toast.success('Zuletzt gespeicherte Anpassung geladen')
        setPayload(data)
        return
      }

      // Sonst: Preset als Grundlage, Käuferangaben darüber.
      applyPreset(
        { poster_type: 'map', config_json: (data.preset.config_json ?? {}) as Record<string, unknown> },
        { mode: 'full' },
      )
      applyOverlay(data)
      toast.success(`Bestellung ${data.order.amazon_order_id} geladen`)
      setPayload(data)
    })()

    return () => { cancelled = true }
  }, [searchParams])

  if (!payload) return null
  return <AmazonOrderBar payload={payload} />
}

/** Felder, die `applyPreset` nicht anfasst, aus einem gespeicherten Zustand holen. */
function applyStoredExtras(state: Record<string, unknown>) {
  const store = useEditorStore.getState()
  const fmt = state.printFormat
  if (typeof fmt === 'string' && VALID_FORMATS.has(fmt)) {
    store.setPrintFormat(fmt as PrintFormat)
  }
  const view = state.viewState as { lat?: number; lng?: number; zoom?: number } | undefined
  if (view && typeof view.lat === 'number' && typeof view.lng === 'number') {
    useEditorStore.setState((s) => ({
      // Fehlt der Zoom im gespeicherten Zustand, den aktuellen behalten —
      // lieber der bisherige Ausschnitt als ein Sprung auf Weltansicht.
      pendingCenter: {
        lat: view.lat!,
        lng: view.lng!,
        zoom: typeof view.zoom === 'number' ? view.zoom : s.viewState.zoom,
      },
    }))
  }
}

/**
 * Legt die Angaben des Käufers über das Preset.
 *
 * Texte wandern der Reihe nach auf die Textblöcke des Presets — der erste
 * freie Block bekommt den Titel, der nächste die Namen, der nächste die
 * Freitextzeile. Koordinatenblöcke bleiben ausgespart, die füllt der
 * Renderer selbst aus der Kartenmitte.
 *
 * Diese Zuordnung ist eine Annahme und darf eine sein: der Betreiber sieht
 * das Ergebnis sofort auf dem Poster und schiebt es zurecht, falls es nicht
 * passt. Genau dafür ist der Editor da.
 */
function applyOverlay(data: EditorPayload) {
  const { overlay } = data
  const store = useEditorStore.getState()

  if (overlay.printFormat && VALID_FORMATS.has(overlay.printFormat)) {
    store.setPrintFormat(overlay.printFormat as PrintFormat)
  }

  if (typeof overlay.lat === 'number' && typeof overlay.lng === 'number') {
    useEditorStore.setState((s) => ({
      pendingCenter: { lat: overlay.lat!, lng: overlay.lng!, zoom: s.viewState.zoom },
      locationName: overlay.locationName ?? s.locationName,
      marker: { ...s.marker, lat: overlay.lat!, lng: overlay.lng!, enabled: true },
    }))
  } else if (overlay.locationName) {
    useEditorStore.setState({ locationName: overlay.locationName })
  }

  if (overlay.texts.length === 0) return

  useEditorStore.setState((s) => {
    const blocks = [...s.textBlocks]
    const targets = blocks
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => !b.isCoordinates)

    const next: TextBlock[] = [...blocks]
    overlay.texts.forEach((t, n) => {
      const target = targets[n]
      if (!target) return
      next[target.i] = {
        ...next[target.i],
        text: t.value,
        ...(t.fontFamily ? { fontFamily: t.fontFamily } : {}),
        ...(t.color ? { color: t.color } : {}),
      }
    })
    return { textBlocks: next }
  })

  const ueberzaehlig = overlay.texts.length -
    useEditorStore.getState().textBlocks.filter((b) => !b.isCoordinates).length
  if (ueberzaehlig > 0) {
    toast.warning(
      `${ueberzaehlig} Textzeile(n) aus der Bestellung haben im Preset keinen Platz — bitte Textblöcke ergänzen.`,
      { duration: 10000 },
    )
  }
}
