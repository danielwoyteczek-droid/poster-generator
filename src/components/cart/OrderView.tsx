'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTranslatedLabel } from '@/lib/i18n-catalog'
import { CheckCircle2, Loader2, FileImage, FileText, Package, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/hooks/useCartStore'
import { trackPurchase } from '@/lib/analytics'
import { PRODUCTS, formatPrice } from '@/lib/products'
import { PRINT_FORMAT_OPTIONS, type PrintFormat } from '@/lib/print-formats'
import {
  renderPosterFromSnapshot,
  canvasToPngBlob,
  pngBlobToPdfBlob,
  type PosterType,
} from '@/lib/poster-from-snapshot'

interface OrderItem {
  productId: 'download' | 'poster' | 'frame'
  format: PrintFormat
  posterType: PosterType
  title: string
  priceCents: number
  snapshot: Record<string, unknown>
}

interface OrderExport {
  id: string
  item_index: number
  file_type: 'png' | 'pdf'
  storage_path: string
}

interface OrderData {
  id: string
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  total_cents: number
  currency: string
  items: OrderItem[]
  created_at: string
  paid_at: string | null
}

interface Props {
  orderId: string
  token: string
  showSuccessBanner: boolean
}

function formatLabel(id: string) {
  return PRINT_FORMAT_OPTIONS.find((f) => f.id === id)?.label ?? id.toUpperCase()
}

export function OrderView({ orderId, token, showSuccessBanner }: Props) {
  const t = useTranslations('order')
  const productI18n = useTranslatedLabel('products')
  const productLabel = (id: string) =>
    productI18n(`${id}Label`, PRODUCTS.find((p) => p.id === id)?.label ?? id)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [exports, setExports] = useState<OrderExport[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [preparing, setPreparing] = useState<Record<number, boolean>>({})
  const clearCart = useCartStore((s) => s.clearCart)
  const purchaseTrackedRef = useRef(false)

  useEffect(() => {
    if (showSuccessBanner) clearCart()
  }, [showSuccessBanner, clearCart])

  useEffect(() => {
    if (!showSuccessBanner || !order || purchaseTrackedRef.current) return
    if (order.status !== 'paid') return
    purchaseTrackedRef.current = true
    trackPurchase({
      transactionId: order.id,
      totalCents: order.total_cents,
      items: order.items.map((item, idx) => ({
        id: `${order.id}-${idx}`,
        title: item.title,
        productId: item.productId,
        format: item.format,
        priceCents: item.priceCents,
        posterType: item.posterType,
      })),
    })
  }, [showSuccessBanner, order])

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}?token=${encodeURIComponent(token)}`)
    const data = await res.json()
    if (!res.ok) {
      setLoadError(data.error || t('loadFailed'))
      return
    }
    setOrder(data.order)
    setExports(data.exports ?? [])
  }, [orderId, token])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  // Poll for "paid" if still pending — webhook might not have fired yet
  useEffect(() => {
    if (order?.status !== 'pending') return
    const t = setInterval(fetchOrder, 3000)
    return () => clearInterval(t)
  }, [order?.status, fetchOrder])

  const uploadExport = useCallback(
    async (itemIndex: number, fileType: 'png' | 'pdf', blob: Blob) => {
      const initRes = await fetch(`/api/orders/${orderId}/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_index: itemIndex, file_type: fileType, token }),
      })
      const init = await initRes.json()
      if (!initRes.ok) throw new Error(init.error || t('uploadUrlFailed'))

      const putRes = await fetch(init.uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': fileType === 'png' ? 'image/png' : 'application/pdf' },
      })
      if (!putRes.ok) throw new Error(t('storageUploadFailed'))

      const commitRes = await fetch(`/api/orders/${orderId}/exports`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_index: itemIndex,
          file_type: fileType,
          storage_path: init.storagePath,
          file_size_bytes: blob.size,
          token,
        }),
      })
      const commit = await commitRes.json()
      if (!commitRes.ok) throw new Error(commit.error || t('commitFailed'))
    },
    [orderId, token, t],
  )

  const prepareExports = useCallback(
    async (itemIndex: number, item: OrderItem) => {
      setPreparing((p) => ({ ...p, [itemIndex]: true }))
      try {
        console.log('[order] step 1: rendering canvas', { itemIndex, posterType: item.posterType, format: item.format })
        const canvas = await renderPosterFromSnapshot(item.posterType, item.format, item.snapshot)
        console.log('[order] step 2: canvas rendered', canvas.width, 'x', canvas.height)
        const pngBlob = await canvasToPngBlob(canvas)
        console.log('[order] step 3: PNG blob created', pngBlob.size, 'bytes')
        const pdfBlob = await pngBlobToPdfBlob(
          pngBlob,
          item.format,
          (item.snapshot as { orientation?: 'portrait' | 'landscape' })?.orientation ?? 'portrait',
        )
        console.log('[order] step 4: PDF blob created', pdfBlob.size, 'bytes')
        await uploadExport(itemIndex, 'png', pngBlob)
        console.log('[order] step 5: PNG uploaded')
        await uploadExport(itemIndex, 'pdf', pdfBlob)
        console.log('[order] step 6: PDF uploaded')
        await fetchOrder()
        toast.success(t('downloadReady', { title: item.title }))
      } catch (err) {
        console.error('[order] prepareExports failed:', err)
        toast.error(err instanceof Error ? err.message : t('preparationFailed'))
      } finally {
        setPreparing((p) => ({ ...p, [itemIndex]: false }))
      }
    },
    [uploadExport, fetchOrder, t],
  )

  const handleDownload = async (exportId: string) => {
    const res = await fetch(
      `/api/orders/${orderId}/exports/${exportId}/download?token=${encodeURIComponent(token)}`,
    )
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || t('downloadFailed'))
      return
    }
    window.location.href = data.url
  }

  // Auto-prepare missing files when order becomes paid — applies to ALL items
  // (digital + physical) so the admin always has a print-ready file on the fulfillment side.
  useEffect(() => {
    if (order?.status !== 'paid') return
    order.items.forEach((item, idx) => {
      const hasPng = exports.some((e) => e.item_index === idx && e.file_type === 'png')
      const hasPdf = exports.some((e) => e.item_index === idx && e.file_type === 'pdf')
      if (!hasPng || !hasPdf) {
        if (!preparing[idx]) prepareExports(idx, item)
      }
    })
  }, [order, exports, preparing, prepareExports])

  if (loadError) {
    return (
      <div className="rounded-xl bg-white border border-red-200 p-6 text-red-700 flex gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">{t('notFoundTitle')}</p>
          <p className="text-sm mt-1 text-red-600">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center text-muted-foreground py-20">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
        <p className="text-sm">{t('loading')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showSuccessBanner && order.status === 'paid' && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-5 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">{t('successBannerTitle')}</p>
            <p className="text-sm text-green-800 mt-1">
              {t('successBannerBody')}
            </p>
          </div>
        </div>
      )}

      {order.status === 'pending' && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 flex gap-3">
          <Loader2 className="w-5 h-5 text-amber-600 animate-spin shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">{t('pendingTitle')}</p>
            <p className="text-sm text-amber-800 mt-1">
              {t('pendingBody')}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('orderHeading')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t('orderId', { id: order.id.slice(0, 8) })}</p>
          </div>
          <div className="text-sm font-semibold text-foreground">
            {formatPrice(order.total_cents)}
          </div>
        </div>

        <ul className="divide-y divide-gray-100">
          {order.items.map((item, idx) => {
            const isPhysical = item.productId !== 'download'
            const png = exports.find((e) => e.item_index === idx && e.file_type === 'png')
            const pdf = exports.find((e) => e.item_index === idx && e.file_type === 'pdf')
            const isPreparing = preparing[idx]
            return (
              <li key={idx} className="p-5 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      {item.posterType === 'star-map'
                        ? t('starPoster')
                        : item.posterType === 'photo'
                        ? t('photoPoster')
                        : t('cityPoster')}
                    </p>
                    <h3 className="text-sm font-semibold text-foreground truncate mt-0.5">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {productLabel(item.productId)} · {formatLabel(item.format)} · {formatPrice(item.priceCents)}
                    </p>
                  </div>

                  {order.status === 'paid' && (
                    <div className="flex gap-2 shrink-0">
                      {isPreparing && (!png || !pdf) ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('preparing')}
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!png}
                            onClick={() => png && handleDownload(png.id)}
                          >
                            <FileImage className="w-4 h-4 mr-1.5" />
                            PNG
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!pdf}
                            onClick={() => pdf && handleDownload(pdf.id)}
                          >
                            <FileText className="w-4 h-4 mr-1.5" />
                            PDF
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {order.status === 'paid' && isPhysical && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                    <Package className="w-4 h-4" />
                    {t('shippingNote')}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
