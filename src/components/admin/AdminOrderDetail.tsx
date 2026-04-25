'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Download as DownloadIcon, Truck, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice, PRODUCTS } from '@/lib/products'
import { PRINT_FORMAT_OPTIONS, type PrintFormat } from '@/lib/print-formats'
import {
  renderPosterFromSnapshot,
  canvasToPngBlob,
  pngBlobToPdfBlob,
  type PosterType,
} from '@/lib/poster-from-snapshot'
import { cn } from '@/lib/utils'

type FulfillmentStatus = 'new' | 'in_production' | 'shipped' | 'completed'

interface OrderDetail {
  id: string
  status: string
  fulfillment_status: FulfillmentStatus
  tracking_number: string | null
  total_cents: number
  currency: string
  items: Array<{
    productId: 'download' | 'poster' | 'frame'
    format: 'a4' | 'a3'
    posterType: PosterType
    title: string
    priceCents: number
    snapshot: Record<string, unknown>
  }>
  email: string | null
  shipping_address: Record<string, string | null> | null
  created_at: string
  paid_at: string | null
  shipped_at: string | null
  access_token: string
}

interface OrderExport {
  id: string
  item_index: number
  file_type: 'png' | 'pdf'
}

const STATUS_LABELS: Record<FulfillmentStatus, string> = {
  new: 'Offen',
  in_production: 'In Produktion',
  shipped: 'Versendet',
  completed: 'Abgeschlossen',
}

function productLabel(id: string) {
  return PRODUCTS.find((p) => p.id === id)?.label ?? id
}
function formatLabel(id: string) {
  return PRINT_FORMAT_OPTIONS.find((f) => f.id === id)?.label ?? id.toUpperCase()
}

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [exports, setExports] = useState<OrderExport[]>([])
  const [tracking, setTracking] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState<Record<number, boolean>>({})

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/admin/orders/${orderId}`)
    const data = await res.json()
    if (res.ok) {
      setOrder(data.order)
      setExports(data.exports ?? [])
      setTracking(data.order.tracking_number ?? '')
    }
    setLoading(false)
  }, [orderId])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const uploadExport = useCallback(
    async (itemIndex: number, fileType: 'png' | 'pdf', blob: Blob) => {
      if (!order) return
      const initRes = await fetch(`/api/orders/${order.id}/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_index: itemIndex,
          file_type: fileType,
          token: order.access_token,
        }),
      })
      const init = await initRes.json()
      if (!initRes.ok) throw new Error(init.error || 'Upload-URL fehlgeschlagen')

      const putRes = await fetch(init.uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': fileType === 'png' ? 'image/png' : 'application/pdf' },
      })
      if (!putRes.ok) throw new Error('Storage-Upload fehlgeschlagen')

      const commitRes = await fetch(`/api/orders/${order.id}/exports`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_index: itemIndex,
          file_type: fileType,
          storage_path: init.storagePath,
          file_size_bytes: blob.size,
          token: order.access_token,
        }),
      })
      if (!commitRes.ok) {
        const err = await commitRes.json()
        throw new Error(err.error || 'Commit fehlgeschlagen')
      }
    },
    [order],
  )

  const prepareItem = useCallback(
    async (itemIndex: number, item: OrderDetail['items'][number]) => {
      setPreparing((p) => ({ ...p, [itemIndex]: true }))
      try {
        const canvas = await renderPosterFromSnapshot(item.posterType, item.format as PrintFormat, item.snapshot)
        const pngBlob = await canvasToPngBlob(canvas)
        const pdfBlob = await pngBlobToPdfBlob(pngBlob, item.format as PrintFormat)
        await uploadExport(itemIndex, 'png', pngBlob)
        await uploadExport(itemIndex, 'pdf', pdfBlob)
        await fetchOrder()
      } catch (err) {
        console.error('[admin] prepare failed:', err)
        toast.error(err instanceof Error ? err.message : 'Rendering fehlgeschlagen')
      } finally {
        setPreparing((p) => ({ ...p, [itemIndex]: false }))
      }
    },
    [uploadExport, fetchOrder],
  )

  // Auto-prepare missing exports when the admin opens the detail view
  useEffect(() => {
    if (!order) return
    order.items.forEach((item, idx) => {
      const hasPng = exports.some((e) => e.item_index === idx && e.file_type === 'png')
      const hasPdf = exports.some((e) => e.item_index === idx && e.file_type === 'pdf')
      if (!hasPng || !hasPdf) {
        if (!preparing[idx]) prepareItem(idx, item)
      }
    })
  }, [order, exports, preparing, prepareItem])

  const updateStatus = async (
    fulfillment_status: FulfillmentStatus,
    opts?: { tracking_number?: string },
  ) => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = { fulfillment_status }
      if (opts?.tracking_number) body.tracking_number = opts.tracking_number
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update fehlgeschlagen')
      await fetchOrder()
      toast.success('Status aktualisiert')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkShipped = async () => {
    if (!tracking.trim()) {
      toast.error('Bitte Sendungsnummer eingeben')
      return
    }
    await updateStatus('shipped', { tracking_number: tracking.trim() })
  }

  const downloadExport = async (exportId: string) => {
    if (!order) return
    const res = await fetch(
      `/api/orders/${order.id}/exports/${exportId}/download?token=${encodeURIComponent(order.access_token)}`,
    )
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Download fehlgeschlagen')
      return
    }
    window.location.href = data.url
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground/70" />
      </div>
    )
  }

  if (!order) {
    return <div className="text-center py-20 text-muted-foreground">Bestellung nicht gefunden</div>
  }

  const allDigital = order.items.every((i) => i.productId === 'download')
  const hasPhysical = !allDigital

  return (
    <div className="space-y-6">
      <Link href="/private/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Zurück zur Übersicht
      </Link>

      <div className="rounded-xl bg-white border border-border p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-xs text-muted-foreground">#{order.id}</div>
            <h1 className="text-xl font-semibold text-foreground mt-1">
              Bestellung · {formatPrice(order.total_cents)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {order.email ?? 'Kein Kunde'} · {new Date(order.created_at).toLocaleString('de-DE')}
            </p>
          </div>
          <span className={cn(
            'inline-block px-3 py-1 rounded-full text-xs font-semibold',
            order.fulfillment_status === 'new' && 'bg-amber-100 text-amber-800',
            order.fulfillment_status === 'in_production' && 'bg-blue-100 text-blue-800',
            order.fulfillment_status === 'shipped' && 'bg-green-100 text-green-800',
            order.fulfillment_status === 'completed' && 'bg-muted text-foreground/70',
          )}>
            {STATUS_LABELS[order.fulfillment_status]}
          </span>
        </div>
      </div>

      {hasPhysical && order.shipping_address && (
        <div className="rounded-xl bg-white border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Lieferadresse</h2>
          <div className="text-sm text-foreground/70 space-y-0.5">
            {order.shipping_address.name && <div>{order.shipping_address.name}</div>}
            {order.shipping_address.line1 && <div>{order.shipping_address.line1}</div>}
            {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
            <div>
              {order.shipping_address.postal_code} {order.shipping_address.city}
            </div>
            {order.shipping_address.country && <div>{order.shipping_address.country}</div>}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white border border-border">
        <h2 className="text-sm font-semibold text-foreground p-6 pb-3">Artikel</h2>
        <ul className="divide-y divide-gray-100">
          {order.items.map((item, idx) => {
            const png = exports.find((e) => e.item_index === idx && e.file_type === 'png')
            const pdf = exports.find((e) => e.item_index === idx && e.file_type === 'pdf')
            return (
              <li key={idx} className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground/70">
                    {item.posterType === 'star-map' ? 'Sternenposter' : 'Stadtposter'}
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-0.5 truncate">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {productLabel(item.productId)} · {formatLabel(item.format)} · {formatPrice(item.priceCents)}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {preparing[idx] && (!png || !pdf) ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Datei wird generiert…
                    </div>
                  ) : (
                    <>
                      {png && (
                        <Button variant="outline" size="sm" onClick={() => downloadExport(png.id)}>
                          <DownloadIcon className="w-4 h-4 mr-1.5" />
                          PNG
                        </Button>
                      )}
                      {pdf && (
                        <Button variant="outline" size="sm" onClick={() => downloadExport(pdf.id)}>
                          <DownloadIcon className="w-4 h-4 mr-1.5" />
                          PDF
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {hasPhysical && (
        <div className="rounded-xl bg-white border border-border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Fulfillment</h2>

          <div className="flex flex-wrap gap-2">
            {(['new', 'in_production', 'completed'] as FulfillmentStatus[]).map((s) => (
              <Button
                key={s}
                variant={order.fulfillment_status === s ? 'default' : 'outline'}
                size="sm"
                disabled={saving || order.fulfillment_status === s}
                onClick={() => updateStatus(s)}
              >
                {STATUS_LABELS[s]}
              </Button>
            ))}
          </div>

          <div className="pt-4 border-t border-border">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Als versendet markieren
            </label>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Sendungsnummer (z.B. DHL-1234567890)"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleMarkShipped}
                disabled={saving || !tracking.trim()}
              >
                {order.fulfillment_status === 'shipped' ? (
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                ) : (
                  <Truck className="w-4 h-4 mr-1.5" />
                )}
                {order.fulfillment_status === 'shipped' ? 'Aktualisieren' : 'Versenden'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Beim Status-Wechsel auf "Versendet" wird automatisch eine E-Mail mit der Sendungsnummer an den Kunden geschickt.
            </p>
          </div>
        </div>
      )}

      {allDigital && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-5 text-sm text-blue-900">
          Reine Digital-Bestellung — kein Versand erforderlich. Der Kunde hat die Dateien bereits über seinen Order-Link heruntergeladen.
        </div>
      )}
    </div>
  )
}
