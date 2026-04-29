'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTranslatedLabel } from '@/lib/i18n-catalog'
import {
  Loader2,
  FileImage,
  FileText,
  Download,
  Image,
  Frame,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/hooks/useEditorStore'
import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import { usePhotoExport } from '@/hooks/usePhotoExport'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/hooks/useCartStore'
import { PRINT_FORMAT_OPTIONS, type PrintFormat } from '@/lib/print-formats'
import { PRODUCTS, formatPrice, type ProductId } from '@/lib/products'
import { cn } from '@/lib/utils'
import { downsizeDataURL } from '@/lib/image-utils'
import { trackAddToCart } from '@/lib/analytics'
import { priceFromCatalog, useProductCatalog } from '@/hooks/useProductCatalog'
import { DiscountBadge } from '@/components/ui/discount-badge'

const PRODUCT_ICONS: Record<string, React.ReactNode> = {
  download: <Download className="w-5 h-5" />,
  poster: <Image className="w-5 h-5" />,
  frame: <Frame className="w-5 h-5" />,
}

// ─── Format selector ──────────────────────────────────────────────────────────

function FormatSelector({
  printFormat,
  setPrintFormat,
}: {
  printFormat: string
  setPrintFormat: (id: PrintFormat) => void
}) {
  const t = useTranslations('editor')
  const fmt = PRINT_FORMAT_OPTIONS.find((f) => f.id === printFormat)!
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('paperFormat')}
        </Label>
        <div className="grid grid-cols-3 gap-1.5">
          {PRINT_FORMAT_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setPrintFormat(f.id)}
              className={cn(
                'h-9 rounded-md border-2 text-sm font-medium transition-colors',
                printFormat === f.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground/70 hover:border-muted-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-md bg-muted border border-border px-3 py-2.5 space-y-0.5">
        <p className="text-xs font-medium text-foreground/70">
          {t('paperFormatPixels', {
            w: fmt.widthPx.toLocaleString(),
            h: fmt.heightPx.toLocaleString(),
          })}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {t('paperFormatPrintHint', { w: fmt.widthMm, h: fmt.heightMm })}
        </p>
      </div>
    </>
  )
}

// ─── Admin: direct PNG/PDF download ───────────────────────────────────────────

function AdminExportView({ printFormat }: { printFormat: string }) {
  const t = useTranslations('editor')
  const { exportPNG, exportPDF, isExporting, error } = usePhotoExport()
  const [activeAction, setActiveAction] = useState<'png' | 'pdf' | null>(null)

  const handleExport = async (type: 'png' | 'pdf') => {
    setActiveAction(type)
    if (type === 'png') await exportPNG(printFormat as PrintFormat)
    else await exportPDF(printFormat as PrintFormat)
    setActiveAction(null)
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        {t('downloadHeading')}
      </Label>

      <button
        type="button"
        onClick={() => handleExport('png')}
        disabled={isExporting}
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting && activeAction === 'png' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileImage className="w-4 h-4" />
        )}
        {isExporting && activeAction === 'png' ? t('exporting') : t('downloadPng')}
      </button>

      <button
        type="button"
        onClick={() => handleExport('pdf')}
        disabled={isExporting}
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md border border-primary text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting && activeAction === 'pdf' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        {isExporting && activeAction === 'pdf' ? t('exporting') : t('downloadPdf')}
      </button>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground/70 leading-relaxed">
        {t('exportHintPrintRes')}
      </p>
    </div>
  )
}

// ─── Customer: product selection + Add-to-Cart ────────────────────────────────

function CustomerProductView({ printFormat }: { printFormat: string }) {
  const t = useTranslations('editor')
  const productLabel = useTranslatedLabel('products')
  const [selectedProduct, setSelectedProduct] = useState<ProductId | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const { renderPreview } = usePhotoExport()
  const addItem = useCartStore((s) => s.addItem)
  const photo = usePhotoEditorStore()
  const editor = useEditorStore()
  const { products: catalog, loading: catalogLoading } = useProductCatalog()

  const catalogPrice = selectedProduct
    ? priceFromCatalog(catalog, selectedProduct, printFormat as PrintFormat)
    : null
  const priceCents = catalogPrice?.unitAmount ?? null

  const handleAddToCart = async () => {
    if (!selectedProduct || priceCents == null) return
    setIsAdding(true)
    try {
      const fullDataUrl = await renderPreview(printFormat as PrintFormat)
      const previewDataUrl = await downsizeDataURL(fullDataUrl, 600)
      const title = photo.word || t('exportDefaultPhotoTitle')
      addItem({
        productId: selectedProduct,
        format: printFormat as PrintFormat,
        posterType: 'photo',
        title,
        priceCents,
        previewDataUrl,
        projectId: editor.projectId ?? null,
        snapshot: {
          word: photo.word,
          slots: photo.slots,
          wordWidth: photo.wordWidth,
          wordX: photo.wordX,
          wordY: photo.wordY,
          orientation: photo.orientation,
          maskFontKey: photo.maskFontKey,
          defaultSlotColor: photo.defaultSlotColor,
          textBlocks: editor.textBlocks,
        },
      })
      trackAddToCart({
        id: `${selectedProduct}-${printFormat}-${Date.now()}`,
        title,
        productId: selectedProduct,
        format: printFormat,
        priceCents,
        posterType: 'photo',
      })
      toast.success(t('exportAddedToCart'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('exportAddFailed'))
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        {t('exportProductLabel')}
      </Label>

      <div className="space-y-2">
        {PRODUCTS.map((product) => {
          const rowPrice = priceFromCatalog(catalog, product.id, printFormat as PrintFormat)
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => setSelectedProduct(product.id)}
              disabled={!rowPrice}
              className={cn(
                'w-full text-left rounded-lg border-2 px-3 py-2.5 transition-colors',
                selectedProduct === product.id
                  ? 'border-primary bg-muted'
                  : 'border-border hover:border-border bg-white',
                !rowPrice && 'opacity-50 cursor-not-allowed',
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 shrink-0',
                    selectedProduct === product.id
                      ? 'text-foreground'
                      : 'text-muted-foreground/70',
                  )}
                >
                  {PRODUCT_ICONS[product.id]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {productLabel(`${product.id}Label`, product.label)}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {rowPrice && (
                        <DiscountBadge
                          unitAmount={rowPrice.unitAmount}
                          compareAtCents={rowPrice.compareAtCents}
                        />
                      )}
                      {rowPrice?.compareAtCents &&
                        rowPrice.compareAtCents > rowPrice.unitAmount && (
                          <span className="text-xs text-muted-foreground/70 line-through">
                            {formatPrice(rowPrice.compareAtCents)}
                          </span>
                        )}
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          selectedProduct === product.id
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        {rowPrice
                          ? formatPrice(rowPrice.unitAmount)
                          : catalogLoading
                          ? '…'
                          : '–'}
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-0.5 leading-snug">
                    {productLabel(`${product.id}Description`, product.description)}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!selectedProduct || priceCents == null || isAdding}
        onClick={handleAddToCart}
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
      >
        {isAdding ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShoppingCart className="w-4 h-4" />
        )}
        {isAdding
          ? t('exportAddingToCart')
          : priceCents != null
          ? t('exportInCart', { price: formatPrice(priceCents) })
          : t('exportSelectProduct')}
      </button>

      <p className="text-xs text-muted-foreground/70 leading-relaxed">
        {t('exportSecureNote')}
      </p>
    </div>
  )
}

// ─── Tab entry ────────────────────────────────────────────────────────────────

export function PhotoExportTab() {
  const { printFormat, setPrintFormat } = useEditorStore()
  const { isAdmin, loading } = useAuth()

  return (
    <div className="space-y-5 p-4">
      <FormatSelector printFormat={printFormat} setPrintFormat={setPrintFormat} />

      <Separator />

      {loading ? (
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-24" />
          <div className="h-16 bg-muted rounded animate-pulse" />
          <div className="h-16 bg-muted rounded animate-pulse" />
        </div>
      ) : isAdmin ? (
        <AdminExportView printFormat={printFormat} />
      ) : (
        <CustomerProductView printFormat={printFormat} />
      )}
    </div>
  )
}
