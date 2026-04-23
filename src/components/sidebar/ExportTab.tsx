'use client'

import { useState } from 'react'
import { Loader2, FileImage, FileText, Download, Image, Frame, ShoppingCart, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useMapExport } from '@/hooks/useMapExport'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/hooks/useCartStore'
import { PRINT_FORMAT_OPTIONS, type PrintFormat } from '@/lib/print-formats'
import { PRODUCTS, formatPrice, type ProductId } from '@/lib/products'
import { cn } from '@/lib/utils'
import { PosterFrameModal } from '@/components/editor/PosterFrameModal'
import { trackAddToCart } from '@/lib/analytics'
import { priceFromCatalog, useProductCatalog } from '@/hooks/useProductCatalog'
import { DiscountBadge } from '@/components/ui/discount-badge'
import { downsizeDataURL } from '@/lib/image-utils'

// ExportTab adds icons on top of the shared product catalogue
const PRODUCT_ICONS: Record<string, React.ReactNode> = {
  download: <Download className="w-5 h-5" />,
  poster: <Image className="w-5 h-5" />,
  frame: <Frame className="w-5 h-5" />,
}

// ─── Format selector (shared) ─────────────────────────────────────────────────

function FormatSelector({ printFormat, setPrintFormat, fmt }: {
  printFormat: string
  setPrintFormat: (id: PrintFormat) => void
  fmt: typeof PRINT_FORMAT_OPTIONS[number]
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Papierformat
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
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 text-gray-700 hover:border-gray-400',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-0.5">
        <p className="text-xs font-medium text-gray-700">
          {fmt.widthPx.toLocaleString()} × {fmt.heightPx.toLocaleString()} Pixel
        </p>
        <p className="text-xs text-gray-400">
          {fmt.widthMm} × {fmt.heightMm} mm · 300 DPI · Druckqualität
        </p>
      </div>
    </>
  )
}

// ─── Admin view ───────────────────────────────────────────────────────────────

function AdminExportView({ printFormat }: { printFormat: string }) {
  const { exportPNG, exportPDF, isExporting, error } = useMapExport()
  const [activeAction, setActiveAction] = useState<'png' | 'pdf' | null>(null)

  const handleExport = async (type: 'png' | 'pdf') => {
    setActiveAction(type)
    if (type === 'png') await exportPNG(printFormat as PrintFormat)
    else await exportPDF(printFormat as PrintFormat)
    setActiveAction(null)
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Herunterladen
      </Label>

      <button
        type="button"
        onClick={() => handleExport('png')}
        disabled={isExporting}
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting && activeAction === 'png' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />}
        {isExporting && activeAction === 'png' ? 'Wird erstellt…' : 'PNG herunterladen'}
      </button>

      <button
        type="button"
        onClick={() => handleExport('pdf')}
        disabled={isExporting}
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md border border-gray-900 text-gray-900 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting && activeAction === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {isExporting && activeAction === 'pdf' ? 'Wird erstellt…' : 'PDF herunterladen'}
      </button>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <p className="text-xs text-gray-400 leading-relaxed">
        Der Export rendert die Karte in voller Druckauflösung. Dies kann einige Sekunden dauern.
      </p>
    </div>
  )
}

// ─── Customer product selection ───────────────────────────────────────────────

function CustomerProductView({ printFormat }: { printFormat: string }) {
  const [selectedProduct, setSelectedProduct] = useState<ProductId | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const { renderPreview } = useMapExport()
  const addItem = useCartStore((s) => s.addItem)
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
      const title = editor.locationName || 'Karten-Poster'
      addItem({
        productId: selectedProduct,
        format: printFormat as PrintFormat,
        posterType: 'map',
        title,
        priceCents,
        previewDataUrl,
        projectId: editor.projectId ?? null,
        snapshot: {
          viewState: editor.viewState,
          styleId: editor.styleId,
          paletteId: editor.paletteId,
          customPaletteBase: editor.customPaletteBase,
          customPalette: editor.customPalette,
          streetLabelsVisible: editor.streetLabelsVisible,
          maskKey: editor.maskKey,
          marker: editor.marker,
          secondMarker: editor.secondMarker,
          secondMap: editor.secondMap,
          shapeConfig: editor.shapeConfig,
          textBlocks: editor.textBlocks,
          locationName: editor.locationName,
          photos: editor.photos,
          splitMode: editor.splitMode,
          splitPhoto: editor.splitPhoto,
          splitPhotoZone: editor.splitPhotoZone,
        },
      })
      trackAddToCart({
        id: `${selectedProduct}-${printFormat}-${Date.now()}`,
        title,
        productId: selectedProduct,
        format: printFormat,
        priceCents,
        posterType: 'map',
      })
      toast.success('Zum Warenkorb hinzugefügt')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Hinzufügen fehlgeschlagen')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Produkt wählen
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
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white',
                !rowPrice && 'opacity-50 cursor-not-allowed',
              )}
            >
              <div className="flex items-start gap-2.5">
                <span className={cn(
                  'mt-0.5 shrink-0',
                  selectedProduct === product.id ? 'text-gray-900' : 'text-gray-400',
                )}>
                  {PRODUCT_ICONS[product.id]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{product.label}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {rowPrice && (
                        <DiscountBadge unitAmount={rowPrice.unitAmount} compareAtCents={rowPrice.compareAtCents} />
                      )}
                      {rowPrice?.compareAtCents && rowPrice.compareAtCents > rowPrice.unitAmount && (
                        <span className="text-xs text-gray-400 line-through">
                          {formatPrice(rowPrice.compareAtCents)}
                        </span>
                      )}
                      <span className={cn(
                        'text-sm font-semibold',
                        selectedProduct === product.id ? 'text-gray-900' : 'text-gray-500',
                      )}>
                        {rowPrice ? formatPrice(rowPrice.unitAmount) : catalogLoading ? '…' : '–'}
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{product.description}</p>
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
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
      >
        {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
        {isAdding
          ? 'Wird hinzugefügt…'
          : priceCents != null ? `In den Warenkorb · ${formatPrice(priceCents)}` : 'Produkt wählen'}
      </button>

      <p className="text-xs text-gray-400 leading-relaxed">
        Sichere Zahlung via Stripe. Physische Produkte werden innerhalb von 3–5 Werktagen geliefert.
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function PreviewButton({ printFormat }: { printFormat: string }) {
  const { renderPreview } = useMapExport()
  const [open, setOpen] = useState(false)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setOpen(true)
    setIsLoading(true)
    setImageDataUrl(null)
    setError(null)
    try {
      const url = await renderPreview(printFormat as PrintFormat)
      setImageDataUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vorschau fehlgeschlagen')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        <Eye className="w-4 h-4" />
        In Zimmeransicht ansehen
      </button>
      <PosterFrameModal
        open={open}
        onOpenChange={setOpen}
        imageDataUrl={imageDataUrl}
        isLoading={isLoading}
        error={error}
      />
    </>
  )
}

export function ExportTab() {
  const { printFormat, setPrintFormat } = useEditorStore()
  const { isAdmin, loading } = useAuth()

  const fmt = PRINT_FORMAT_OPTIONS.find((f) => f.id === printFormat)!

  return (
    <div className="space-y-5 p-4">
      <FormatSelector printFormat={printFormat} setPrintFormat={setPrintFormat} fmt={fmt} />

      <Separator />

      <PreviewButton printFormat={printFormat} />

      <Separator />

      {loading ? (
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
          <div className="h-16 bg-gray-100 rounded animate-pulse" />
          <div className="h-16 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : isAdmin ? (
        <AdminExportView printFormat={printFormat} />
      ) : (
        <CustomerProductView printFormat={printFormat} />
      )}
    </div>
  )
}
