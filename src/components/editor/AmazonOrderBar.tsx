'use client'

/**
 * PROJ-31: Leiste im Editor, solange eine Amazon-Bestellung offen ist.
 *
 * Sie muss drei Dinge leisten: klarmachen, dass hier keine eigene Gestaltung
 * entsteht, sondern eine fremde Bestellung bearbeitet wird; Amazons Vorschau
 * zum Vergleich erreichbar halten; und die Anpassung zurückschreiben.
 *
 * Bewusst am oberen Rand und farblich abgesetzt — wer das übersieht und
 * denkt, er baue gerade ein Preset, überschreibt eine Kundenbestellung.
 */

import { useState } from 'react'
import { Check, Loader2, ImageIcon, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { getConfig } from '@/hooks/useProjectSync'
import type { EditorPayload } from '@/app/api/admin/amazon/orders/[id]/editor/route'

export function AmazonOrderBar({ payload }: { payload: EditorPayload }) {
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(payload.editor_state_saved_at)
  const [showPreview, setShowPreview] = useState(false)
  const gedruckt = Boolean(payload.order.printed_at)
  const storniert = payload.order.order_state === 'cancelled'

  const uebernehmen = async () => {
    setSaving(true)
    try {
      // Derselbe Serialisierer, mit dem auch ein Projekt gespeichert wird —
      // damit der spätere Render keinen Sonderweg für Amazon braucht.
      const editor_state = getConfig('map')
      const r = await fetch(`/api/admin/amazon/orders/${payload.order.id}/editor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editor_state }),
      })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error ?? 'Speichern fehlgeschlagen')
      setSavedAt(json.editor_state_saved_at)
      toast.success('Anpassung übernommen — die Bestellung ist druckfertig')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed top-16 inset-x-0 z-40 bg-amber-100 dark:bg-amber-950/60 border-b border-amber-300 dark:border-amber-800">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-medium text-amber-950 dark:text-amber-100">
            Amazon-Bestellung
          </span>
          <span className="font-mono text-xs text-amber-900 dark:text-amber-200">
            {payload.order.amazon_order_id}
          </span>
          <span className="text-xs text-amber-900/70 dark:text-amber-200/70">
            {payload.order.sku}
          </span>
          {payload.order.quantity > 1 && (
            <span className="text-xs font-medium text-amber-950 dark:text-amber-100">
              {payload.order.quantity} Stück
            </span>
          )}
          {storniert && (
            <span className="text-xs font-medium text-destructive">
              Bei Amazon storniert
            </span>
          )}

          {savedAt && (
            <span className="text-xs text-amber-900/70 dark:text-amber-200/70">
              zuletzt übernommen: {new Date(savedAt).toLocaleString('de-DE', {
                dateStyle: 'short', timeStyle: 'short',
              })}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {payload.order.preview_url && (
              <Button
                size="sm" variant="outline"
                onClick={() => setShowPreview(true)}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Amazons Vorschau
              </Button>
            )}
            <Button size="sm" variant="ghost" asChild>
              <a href="/private/admin/amazon/orders">
                <X className="w-4 h-4 mr-2" />
                Zurück zur Liste
              </a>
            </Button>
            <Button size="sm" onClick={() => void uebernehmen()} disabled={saving || gedruckt || storniert}>
              {saving
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Check className="w-4 h-4 mr-2" />}
              {storniert ? 'Storniert' : gedruckt ? 'Bereits gedruckt' : 'Anpassung übernehmen'}
            </Button>
          </div>

          {payload.overlay.notes.length > 0 && (
            <ul className="w-full text-xs text-amber-900/80 dark:text-amber-200/80 list-disc pl-5">
              {payload.overlay.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </div>
      </div>

      {/* Der Editor beginnt unter der Leiste, sonst verdeckt sie die Sidebar. */}
      <div aria-hidden className="h-12" />

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Amazons Vorschau</DialogTitle>
          </DialogHeader>
          {payload.order.preview_url ? (
            <>
              <img
                src={payload.order.preview_url}
                alt="Vorschau von Amazon"
                className="w-full rounded-md border bg-white"
              />
              <p className="text-xs text-muted-foreground">
                So hat der Käufer das Poster bei Amazon gesehen. Als Vergleich
                gedacht, nicht als Vorlage — Schriften und Maße unterscheiden
                sich zwischen Amazons Darstellung und dem Druck.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Kein Bild geliefert.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
