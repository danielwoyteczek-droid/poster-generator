'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { displayFormatLabel } from '@/lib/products'

/**
 * PROJ-55 Phase 4: Druckdateien in der Bestellansicht.
 *
 * Zeigt pro DTF-Position Status und Download. Der Status ist bewusst
 * sichtbar und nicht nur ein Link: Wenn die Erzeugung stillschweigend
 * fehlschlägt, merkt es der Betreiber sonst erst, wenn der Kunde auf seinen
 * Druck wartet.
 *
 * Der Wiederholen-Knopf ruft dieselbe Funktion wie der Webhook. Bereits
 * fertige Dateien werden dabei übersprungen, es entsteht also kein Schaden
 * durch mehrfaches Klicken.
 */

interface PrintFile {
  itemIndex: number
  status: 'pending' | 'ready' | 'failed'
  sheetFormat: string | null
  quantity: number | null
  byteSize: number | null
  errorMessage: string | null
  downloadUrl: string | null
}

export function AdminDtfPrintFiles({ orderId }: { orderId: string }) {
  const [files, setFiles] = useState<PrintFile[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/dtf-print-files`)
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { files: PrintFile[] }
      setFiles(data.files)
    } catch {
      toast.error('Druckdateien konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void load()
  }, [load])

  // Keine DTF-Position in dieser Bestellung — dann gar nichts anzeigen.
  if (!loading && files.length === 0) return null

  async function regenerate() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/dtf-print-files`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erzeugung fehlgeschlagen')
      toast.success(`${data.generated} Datei(en) erzeugt, ${data.failed} fehlgeschlagen.`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erzeugung fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  const anyFailed = files.some((f) => f.status === 'failed')

  return (
    <div className="rounded-lg border border-border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Druckdateien (DTF)</h3>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={regenerate}>
          {busy ? 'Wird erzeugt …' : anyFailed ? 'Erneut versuchen' : 'Neu erzeugen'}
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Wird geladen …</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.itemIndex}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
            >
              <div className="min-w-0 text-sm">
                <div className="font-medium">
                  Bogen {file.itemIndex + 1}
                  {file.sheetFormat && ` · ${displayFormatLabel(file.sheetFormat)}`}
                  {file.quantity && file.quantity > 1 && ` · ${file.quantity}×`}
                </div>
                {file.status === 'failed' && file.errorMessage && (
                  <p className="text-xs text-destructive mt-0.5 break-words">
                    {file.errorMessage}
                  </p>
                )}
                {file.byteSize && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(file.byteSize / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={
                    file.status === 'ready'
                      ? 'default'
                      : file.status === 'failed'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {file.status === 'ready'
                    ? 'bereit'
                    : file.status === 'failed'
                      ? 'fehlgeschlagen'
                      : 'in Arbeit'}
                </Badge>
                {file.downloadUrl && (
                  <Button asChild size="sm" variant="outline">
                    <a href={file.downloadUrl} download>
                      PDF
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Ungespiegelt — die Spiegelung übernimmt die RIP-Software am Drucker.
      </p>
    </div>
  )
}
