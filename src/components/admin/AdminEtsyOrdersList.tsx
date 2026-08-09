'use client'

/**
 * PROJ-49: Admin Etsy-Orders-Queue list.
 *
 * Renders:
 *   - Top bar: last-sync timestamp + "Sync now" button + filter chips per status.
 *   - Main table: receipt-id, date, status badge, item counts, address city,
 *     drilldown action.
 *   - Drilldown dialog: full raw receipt + per-item parser breakdown.
 *
 * The table is read-only in Phase 1+2 — no re-parse, no manual-edit yet.
 * Those come once we see real `manual_review` rows to design the form against.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, ChevronRight, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import type {
  EtsyOrderRow,
  EtsyOrderStatus,
  EtsyOrdersResponse,
} from '@/app/api/admin/etsy/orders/route'

const STATUS_LABELS: Record<EtsyOrderStatus | 'all', string> = {
  all: 'Alle',
  pending_parse: 'Parse-Pending',
  pending_mapping: 'Listing fehlt',
  pending_render: 'Bereit',
  imported: 'Importiert',
  manual_review: 'Manuelle Prüfung',
  failed: 'Fehler',
  cancelled: 'Storniert',
}

const STATUS_VARIANTS: Record<EtsyOrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending_parse: 'secondary',
  pending_mapping: 'outline',
  pending_render: 'default',
  imported: 'default',
  manual_review: 'destructive',
  failed: 'destructive',
  cancelled: 'outline',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

interface OrderDetail {
  id: string
  etsy_receipt_id: number
  raw_receipt_payload: unknown
  raw_transactions_payload: unknown
  parsed_items: unknown
  shipping_address: unknown
  status: string
  error_message: string | null
  imported_at: string | null
}

export function AdminEtsyOrdersList() {
  const [data, setData] = useState<EtsyOrdersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<EtsyOrderStatus | 'all'>('all')
  const [syncRunning, setSyncRunning] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const url = new URL('/api/admin/etsy/orders', window.location.origin)
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter)
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as EtsyOrdersResponse
      setData(json)
    } catch (e) {
      toast.error('Bestellungen konnten nicht geladen werden', {
        description: (e as Error).message,
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  const handleSyncNow = async () => {
    setSyncRunning(true)
    try {
      const res = await fetch('/api/admin/etsy/sync-now', { method: 'POST' })
      const body = (await res.json()) as {
        ok: boolean
        summary?: {
          fetched: number
          parsed_ok: number
          parsed_manual_review: number
          parsed_no_mapping: number
          errors: string[]
        }
      }
      if (!res.ok || !body.ok) {
        toast.error('Sync fehlgeschlagen', {
          description: body.summary?.errors[0] ?? `HTTP ${res.status}`,
        })
      } else {
        toast.success('Sync fertig', {
          description: `${body.summary!.fetched} Receipts verarbeitet`,
        })
        await fetchOrders()
      }
    } catch (e) {
      toast.error('Sync fehlgeschlagen', {
        description: (e as Error).message,
      })
    } finally {
      setSyncRunning(false)
    }
  }

  const openDetail = async (orderId: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/etsy/orders/${orderId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const detail = (await res.json()) as OrderDetail
      setSelectedOrder(detail)
    } catch (e) {
      toast.error('Detail-Anzeige fehlgeschlagen', {
        description: (e as Error).message,
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const totalRows = data?.total ?? 0
  const orderRows = data?.items ?? []
  const statusCounts = useMemo(
    () => data?.status_counts ?? ({} as Record<EtsyOrderStatus, number>),
    [data],
  )

  const filterButtons: Array<{ value: EtsyOrderStatus | 'all'; label: string; count: number | null }> = [
    { value: 'all', label: STATUS_LABELS.all, count: totalRows },
    { value: 'pending_render', label: STATUS_LABELS.pending_render, count: statusCounts.pending_render ?? 0 },
    { value: 'manual_review', label: STATUS_LABELS.manual_review, count: statusCounts.manual_review ?? 0 },
    { value: 'pending_mapping', label: STATUS_LABELS.pending_mapping, count: statusCounts.pending_mapping ?? 0 },
    { value: 'imported', label: STATUS_LABELS.imported, count: statusCounts.imported ?? 0 },
    { value: 'failed', label: STATUS_LABELS.failed, count: statusCounts.failed ?? 0 },
    { value: 'cancelled', label: STATUS_LABELS.cancelled, count: statusCounts.cancelled ?? 0 },
  ]

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <Card>
        <CardContent className="py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Letzter Sync:{' '}
            <span className="font-medium text-foreground">
              {data?.last_sync_at ? formatDate(data.last_sync_at) : 'noch nie'}
            </span>
          </div>
          <Button onClick={handleSyncNow} disabled={syncRunning}>
            {syncRunning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Jetzt synchronisieren
          </Button>
        </CardContent>
      </Card>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {filterButtons.map((btn) => (
          <Button
            key={btn.value}
            variant={statusFilter === btn.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(btn.value)}
          >
            {btn.label}
            {btn.count !== null && (
              <span className="ml-2 text-xs opacity-80">{btn.count}</span>
            )}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground p-8">
              <Loader2 className="w-4 h-4 animate-spin" />
              Bestellungen werden geladen…
            </div>
          ) : orderRows.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">
              Keine Bestellungen{statusFilter !== 'all' ? ' mit diesem Status' : ''} vorhanden.
              {statusFilter === 'all' &&
                ' Klick "Jetzt synchronisieren" sobald die Etsy-App approved ist.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt-ID</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderRows.map((row) => (
                  <OrderRow
                    key={row.id}
                    row={row}
                    onOpen={() => openDetail(row.id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Etsy-Receipt #{selectedOrder?.etsy_receipt_id}
            </DialogTitle>
            <DialogDescription>
              Status: <strong>{selectedOrder?.status}</strong>
              {selectedOrder?.imported_at && (
                <> · importiert {formatDate(selectedOrder.imported_at)}</>
              )}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Lädt…
            </div>
          ) : selectedOrder ? (
            <OrderDetailView detail={selectedOrder} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function OrderRow({ row, onOpen }: { row: EtsyOrderRow; onOpen: () => void }) {
  const failedCount = row.items_failed + row.items_no_mapping
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="font-mono">{row.etsy_receipt_id}</TableCell>
      <TableCell>{formatDate(row.purchase_date)}</TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANTS[row.status] ?? 'secondary'}>
          {STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="font-medium">{row.items_count}</span>
        {failedCount > 0 && (
          <span className="text-destructive ml-1">({failedCount} ⚠)</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {row.shipping_city ?? '—'}
        {row.shipping_country ? `, ${row.shipping_country}` : ''}
      </TableCell>
      <TableCell>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </TableCell>
    </TableRow>
  )
}

function OrderDetailView({ detail }: { detail: OrderDetail }) {
  return (
    <ScrollArea className="flex-1 -mx-6 px-6">
      <div className="space-y-6 pb-2">
        {/* Parsed items */}
        <section>
          <h3 className="font-semibold mb-2 text-sm">Geparste Items</h3>
          {Array.isArray(detail.parsed_items) && detail.parsed_items.length > 0 ? (
            <div className="space-y-3">
              {(detail.parsed_items as Array<Record<string, unknown>>).map((item, idx) => (
                <ParsedItemCard key={idx} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Items geparst.</p>
          )}
        </section>

        {/* Shipping */}
        <section>
          <h3 className="font-semibold mb-2 text-sm">Lieferadresse</h3>
          <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">
            {JSON.stringify(detail.shipping_address, null, 2)}
          </pre>
        </section>

        {/* Raw receipt */}
        <section>
          <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
            Raw Receipt Payload
            <a
              href={`https://www.etsy.com/your/orders/sold/completed?order_id=${detail.etsy_receipt_id}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-normal text-muted-foreground inline-flex items-center gap-1 hover:underline"
            >
              auf Etsy ansehen <ExternalLink className="w-3 h-3" />
            </a>
          </h3>
          <pre className="bg-muted rounded p-3 text-xs overflow-x-auto max-h-96">
            {JSON.stringify(detail.raw_receipt_payload, null, 2)}
          </pre>
        </section>

        {detail.error_message && (
          <section>
            <h3 className="font-semibold mb-2 text-sm text-destructive">Fehler</h3>
            <pre className="bg-destructive/10 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
              {detail.error_message}
            </pre>
          </section>
        )}
      </div>
    </ScrollArea>
  )
}

function ParsedItemCard({ item }: { item: Record<string, unknown> }) {
  const status = item.status as string
  const parsed = item.parsed as Record<string, string> | null
  const raw = item.raw as string | null
  const missing = (item.missing as string[] | undefined) ?? []
  const invalid =
    (item.invalid as Array<{ key: string; value: string; reason: string }> | undefined) ?? []

  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Pos.</span>
        <span className="font-medium">{String(item.position)}</span>
        <Badge
          variant={
            status === 'ok'
              ? 'default'
              : status === 'manual_review'
                ? 'destructive'
                : 'outline'
          }
        >
          {status}
        </Badge>
        <span className="text-xs text-muted-foreground font-mono ml-auto">
          listing {String(item.listing_id)} · tx {String(item.transaction_id)}
        </span>
      </div>
      {parsed && Object.keys(parsed).length > 0 && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
          {Object.entries(parsed).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {missing.length > 0 && (
        <p className="text-xs text-destructive">
          Fehlende Pflichtfelder: <span className="font-mono">{missing.join(', ')}</span>
        </p>
      )}
      {invalid.length > 0 && (
        <ul className="text-xs text-destructive list-disc pl-4">
          {invalid.map((i, idx) => (
            <li key={idx}>
              <span className="font-mono">{i.key}</span>: {i.reason}
            </li>
          ))}
        </ul>
      )}
      {raw && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Roh-Personalisierung</summary>
          <pre className="mt-1 bg-muted/50 rounded p-2 whitespace-pre-wrap">{raw}</pre>
        </details>
      )}
    </div>
  )
}
