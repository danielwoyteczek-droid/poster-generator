'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Package, FileImage, FileText, ChevronRight, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrice, PRODUCTS } from '@/lib/products'
import { PRINT_FORMAT_OPTIONS } from '@/lib/print-formats'
import { Button } from '@/components/ui/button'

interface OrderItem {
  productId: 'download' | 'poster' | 'frame'
  format: string
  posterType: 'map' | 'star-map'
  title: string
  priceCents: number
}

interface Order {
  id: string
  status: string
  fulfillment_status: string
  total_cents: number
  items: OrderItem[]
  access_token: string
  created_at: string
  exports: Array<{ id: string; item_index: number; file_type: 'png' | 'pdf' }>
}

const FULFILLMENT_LABELS: Record<string, string> = {
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

export function UserOrdersList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false))
  }, [])

  const downloadExport = async (order: Order, exportId: string) => {
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

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
        <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground mb-6">Du hast noch keine Bestellungen.</p>
        <Button asChild>
          <Link href="/map">Jetzt Poster erstellen</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const isPhysical = order.items.some((i) => i.productId !== 'download')
        return (
          <div key={order.id} className="rounded-xl bg-white border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-muted border-b border-border">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground/70 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </div>
                </div>
                {isPhysical && (
                  <span className="text-xs font-medium text-foreground/70 bg-white border border-border rounded-full px-2.5 py-1">
                    <Package className="w-3 h-3 inline mr-1" />
                    {FULFILLMENT_LABELS[order.fulfillment_status] ?? order.fulfillment_status}
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {formatPrice(order.total_cents)}
              </div>
            </div>

            <ul className="divide-y divide-gray-100">
              {order.items.map((item, idx) => {
                const png = order.exports.find((e) => e.item_index === idx && e.file_type === 'png')
                const pdf = order.exports.find((e) => e.item_index === idx && e.file_type === 'pdf')
                return (
                  <li key={idx} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground/70">
                        {item.posterType === 'star-map' ? 'Sternenposter' : 'Stadtposter'}
                      </p>
                      <h3 className="text-sm font-semibold text-foreground truncate mt-0.5">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {productLabel(item.productId)} · {formatLabel(item.format)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {png ? (
                        <Button variant="outline" size="sm" onClick={() => downloadExport(order, png.id)}>
                          <FileImage className="w-4 h-4 mr-1.5" />
                          PNG
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          <FileImage className="w-4 h-4 mr-1.5" />
                          PNG
                        </Button>
                      )}
                      {pdf ? (
                        <Button variant="outline" size="sm" onClick={() => downloadExport(order, pdf.id)}>
                          <FileText className="w-4 h-4 mr-1.5" />
                          PDF
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          <FileText className="w-4 h-4 mr-1.5" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="px-5 py-2.5 bg-muted border-t border-border">
              <Link
                href={`/orders/${order.id}?token=${order.access_token}`}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                Bestelldetails öffnen
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
