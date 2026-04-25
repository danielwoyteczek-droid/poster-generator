'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, ChevronRight, Package, Download as DownloadIcon } from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { cn } from '@/lib/utils'

interface OrderRow {
  id: string
  fulfillment_status: 'new' | 'in_production' | 'shipped' | 'completed'
  tracking_number: string | null
  total_cents: number
  items: Array<{ productId: string; format: string; title: string; posterType: string }>
  email: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  all: 'Alle',
  new: 'Offen',
  in_production: 'In Produktion',
  shipped: 'Versendet',
  completed: 'Abgeschlossen',
}

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-amber-100 text-amber-800',
  in_production: 'bg-blue-100 text-blue-800',
  shipped: 'bg-green-100 text-green-800',
  completed: 'bg-muted text-muted-foreground',
}

function itemSummary(items: OrderRow['items']) {
  if (items.length === 0) return '—'
  const hasPhysical = items.some((i) => i.productId !== 'download')
  const firstTitle = items[0].title
  if (items.length === 1) {
    return `${firstTitle}${hasPhysical ? ' (physisch)' : ''}`
  }
  return `${firstTitle} +${items.length - 1} weitere${hasPhysical ? ' (physisch)' : ''}`
}

export function AdminOrdersList() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/orders?fulfillment_status=${filter}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              filter === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-white border border-border text-foreground/70 hover:border-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-white border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground/70" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <Package className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            Keine Bestellungen{filter !== 'all' ? ` mit Status "${STATUS_LABELS[filter]}"` : ''}.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground/70 border-b border-border">
                <th className="px-4 py-3 font-medium">Bestellung</th>
                <th className="px-4 py-3 font-medium">Kunde</th>
                <th className="px-4 py-3 font-medium">Produkt</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Preis</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const allDigital = order.items.every((i) => i.productId === 'download')
                return (
                  <tr
                    key={order.id}
                    className="border-b border-border last:border-0 hover:bg-muted transition-colors"
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground/70 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('de-DE', {
                          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/70 truncate max-w-[200px]">
                      {order.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/70">
                      {itemSummary(order.items)}
                      {allDigital && (
                        <span className="inline-flex items-center gap-1 ml-2 text-xs text-blue-600">
                          <DownloadIcon className="w-3 h-3" />
                          digital
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                        STATUS_BADGE[order.fulfillment_status] ?? STATUS_BADGE.new,
                      )}>
                        {STATUS_LABELS[order.fulfillment_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground text-right whitespace-nowrap">
                      {formatPrice(order.total_cents)}
                    </td>
                    <td className="px-2 py-3">
                      <Link
                        href={`/private/admin/orders/${order.id}`}
                        className="inline-flex items-center text-muted-foreground/70 hover:text-foreground/70 p-1"
                        aria-label="Öffnen"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
