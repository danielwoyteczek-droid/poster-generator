'use client'

/**
 * PROJ-31: Das Poster einer importierten Bestellung als Bild.
 *
 * Wozu: Ob ein Design passt, entscheidet ein Mensch — ein langer Name, der
 * umbricht, ein Kartenausschnitt, der danebensitzt. Bis hierher musste der
 * Betreiber dafür jede Bestellung im Editor öffnen und laden lassen. Diese
 * Vorschau macht aus dem Klickweg einen Blick.
 *
 * Absichtlich KEIN gespeicherter Render: kein Worker, kein Speicherplatz,
 * keine Datei, die neben der Wahrheit herläuft. Das Bild entsteht beim
 * Ansehen im Browser des Betreibers — aus demselben `renderPreview()`, das
 * auch die Druckdatei erzeugt, und aus derselben Übersetzung
 * (`applyOrderToEditor`), die der Editor benutzt. Was hier steht, steht
 * gleich auch im Editor.
 *
 * Die Druckdatei entsteht weiterhin erst auf Freigabe. Eine hochauflösende
 * Datei, die vor der Prüfung herumliegt, lädt dazu ein, die falsche zu
 * greifen.
 *
 * Läuft als eigene Seite unter /private/admin/amazon/orders/[id]/vorschau
 * und wird von der Queue in einem Rahmen eingebettet. Der eigene
 * Seitenaufruf hält den Editor-Store aus dem Admin heraus: Beim Schließen
 * ist er mitsamt Zustand weg.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMapExport } from '@/hooks/useMapExport'
import { useEditorStore } from '@/hooks/useEditorStore'
import { applyOrderToEditor, commitPendingCenter } from '@/lib/amazon/apply-order-to-editor'
import type { EditorPayload } from '@/app/api/admin/amazon/orders/[id]/editor/route'

/**
 * Puffer zwischen „Zustand gesetzt" und „Bild bauen". `renderPreview()`
 * rendert die Karte offscreen neu, braucht davor aber die geladenen
 * Schriften und den fertigen Kartenstil. Derselbe Wert wie im
 * Headless-Render der Preset-Pipeline (PROJ-30).
 */
const READY_DELAY_MS = 1500

type Status =
  | { kind: 'laedt' }
  | { kind: 'rendert' }
  | { kind: 'fertig'; src: string; hinweis: string | null }
  | { kind: 'fehler'; text: string }

export function AmazonOrderPreview({ orderId }: { orderId: string }) {
  const { renderPreview } = useMapExport()
  const [status, setStatus] = useState<Status>({ kind: 'laedt' })
  const [versuch, setVersuch] = useState(0)

  // `renderPreview` kommt bei jedem Store-Update neu; ohne Ref würde der
  // Effekt durchlaufen, während er selbst den Store beschreibt.
  const renderRef = useRef(renderPreview)
  renderRef.current = renderPreview

  useEffect(() => {
    let abgebrochen = false

    void (async () => {
      setStatus({ kind: 'laedt' })

      let data: EditorPayload
      try {
        const r = await fetch(`/api/admin/amazon/orders/${orderId}/editor`)
        if (r.status === 401 || r.status === 403) throw new Error('Nur für Admins.')
        if (!r.ok) throw new Error((await r.json()).error ?? 'Laden fehlgeschlagen')
        data = await r.json()
      } catch (e) {
        if (!abgebrochen) setStatus({ kind: 'fehler', text: (e as Error).message })
        return
      }
      if (abgebrochen) return

      const result = applyOrderToEditor(data)
      if (result.mode === 'kein_preset') {
        setStatus({ kind: 'fehler', text: 'Diesem SKU ist noch kein Design zugeordnet.' })
        return
      }

      // Ohne Karte führt den Kartenauftrag niemand aus — hier selbst tun,
      // sonst rendert das Bild den Ort des Presets statt den der Bestellung.
      commitPendingCenter()

      setStatus({ kind: 'rendert' })
      await document.fonts.ready
      await new Promise((r) => setTimeout(r, READY_DELAY_MS))
      if (abgebrochen) return

      try {
        // Das Format steht erst nach dem Anwenden fest — die Bestellung kann
        // A3 oder A2 gewählt haben, und ein A4-Render zeigte den falschen
        // Ausschnitt.
        const format = useEditorStore.getState().printFormat
        const src = await renderRef.current(format)
        if (abgebrochen) return
        setStatus({
          kind: 'fertig',
          src,
          hinweis: hinweisText(result),
        })
      } catch (e) {
        if (!abgebrochen) setStatus({ kind: 'fehler', text: (e as Error).message })
      }
    })()

    return () => { abgebrochen = true }
  }, [orderId, versuch])

  const neu = useCallback(() => setVersuch((v) => v + 1), [])

  if (status.kind === 'fehler') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-muted-foreground max-w-xs">{status.text}</p>
        <Button variant="outline" size="sm" onClick={neu}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Nochmal versuchen
        </Button>
      </div>
    )
  }

  if (status.kind !== 'fertig') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {status.kind === 'laedt' ? 'Bestellung wird geladen…' : 'Poster wird gebaut…'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- Data-URL aus dem Canvas, kein optimierbares Asset */}
      <img
        src={status.src}
        alt="Vorschau des Posters dieser Bestellung"
        className="min-h-0 flex-1 object-contain"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {status.hinweis ?? 'Aus den Angaben des Käufers erzeugt.'}
        </p>
        <Button variant="ghost" size="sm" onClick={neu}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Neu bauen
        </Button>
      </div>
    </div>
  )
}

function hinweisText(result: { mode: string; orphans?: number }): string | null {
  if (result.orphans && result.orphans > 0) {
    return `${result.orphans} Angabe(n) zeigen auf Textblöcke, die dieses Design nicht hat.`
  }
  if (result.mode === 'gespeichert') return 'Zeigt deine zuletzt gespeicherte Anpassung.'
  return null
}
