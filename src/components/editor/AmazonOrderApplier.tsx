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
 * Das Übersetzen der Bestellung in den Editor-Zustand liegt in
 * `@/lib/amazon/apply-order-to-editor` — dieselbe Funktion, aus der die
 * Vorschau in der Prüf-Queue ihr Bild baut. Hier bleibt nur, was der Editor
 * zusätzlich tut: laden, melden, und die Leiste einblenden, über die der
 * angepasste Zustand zurückgeht.
 */

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { applyOrderToEditor } from '@/lib/amazon/apply-order-to-editor'
import type { EditorPayload } from '@/app/api/admin/amazon/orders/[id]/editor/route'
import { AmazonOrderBar } from './AmazonOrderBar'

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

      const result = applyOrderToEditor(data)
      setPayload(data)

      if (result.mode === 'kein_preset') {
        toast.error('Dieser SKU ist noch kein Design zugeordnet.')
        return
      }
      if (result.mode === 'gespeichert') {
        toast.success('Zuletzt gespeicherte Anpassung geladen')
      } else {
        toast.success(`Bestellung ${data.order.amazon_order_id} geladen`)
      }
      if (result.orphans > 0) {
        toast.warning(
          `${result.orphans} Angabe(n) aus der Bestellung zeigen auf Textblöcke, die dieses Design nicht hat.`,
          { duration: 10000 },
        )
      }
    })()

    return () => { cancelled = true }
  }, [searchParams])

  if (!payload) return null
  return <AmazonOrderBar payload={payload} />
}
