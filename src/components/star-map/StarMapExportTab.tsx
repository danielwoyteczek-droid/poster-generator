'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, FileImage, FileText, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useStarMapStore } from '@/hooks/useStarMapStore'
import { useStarMapExport } from '@/hooks/useStarMapExport'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/hooks/useCartStore'
import { type PrintFormat } from '@/lib/print-formats'
import { PosterFrameModal } from '@/components/editor/PosterFrameModal'
import { downsizeDataURL } from '@/lib/image-utils'
import { trackAddToCart } from '@/lib/analytics'
import { ProductTierPicker, type TierSelection } from '@/components/cart/ProductTierPicker'
import { B2BExportSection } from '@/components/business/B2BExportSection'

// PROJ-37: Format selector moved to the Sternkarte sidebar tab so the
// customer locks in the canvas shape before designing. This tab now only
// handles preview + product selection + download.

// ─── Admin view ───────────────────────────────────────────────────────────────

function AdminExportView({ printFormat }: { printFormat: string }) {
  const { exportPNG, exportPDF, isExporting, error } = useStarMapExport()
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
        Herunterladen
      </Label>

      <button
        type="button"
        onClick={() => handleExport('png')}
        disabled={isExporting}
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting && activeAction === 'png'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <FileImage className="w-4 h-4" />}
        {isExporting && activeAction === 'png' ? 'Wird erstellt…' : 'PNG herunterladen'}
      </button>

      <button
        type="button"
        onClick={() => handleExport('pdf')}
        disabled={isExporting}
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md border border-primary text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting && activeAction === 'pdf'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <FileText className="w-4 h-4" />}
        {isExporting && activeAction === 'pdf' ? 'Wird erstellt…' : 'PDF herunterladen'}
      </button>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground/70 leading-relaxed">
        Der Export rendert die Sternkarte in voller Druckauflösung. Dies kann einige Sekunden dauern.
      </p>
    </div>
  )
}

// ─── Customer product selection ───────────────────────────────────────────────

function CustomerProductView({ printFormat }: { printFormat: PrintFormat }) {
  const t = useTranslations('editor')
  const [isAdding, setIsAdding] = useState(false)
  const { renderPreview } = useStarMapExport()
  const addItem = useCartStore((s) => s.addItem)
  const starMap = useStarMapStore()
  const editor = useEditorStore()

  const handleAddToCart = async (selection: TierSelection) => {
    setIsAdding(true)
    try {
      const fullDataUrl = await renderPreview(printFormat)
      const previewDataUrl = await downsizeDataURL(fullDataUrl, 600)
      const title = starMap.locationName || t('exportDefaultStarTitle')
      addItem({
        productId: selection.productId,
        withFrame: selection.withFrame,
        format: printFormat,
        posterType: 'star-map',
        title,
        priceCents: selection.priceCents,
        previewDataUrl,
        projectId: editor.projectId ?? null,
        snapshot: {
          lat: starMap.lat,
          lng: starMap.lng,
          datetime: starMap.datetime,
          locationName: starMap.locationName,
          posterBgColor: starMap.posterBgColor,
          skyBgColor: starMap.skyBgColor,
          starColor: starMap.starColor,
          showConstellations: starMap.showConstellations,
          showMilkyWay: starMap.showMilkyWay,
          showSun: starMap.showSun,
          showMoon: starMap.showMoon,
          showPlanets: starMap.showPlanets,
          showCompass: starMap.showCompass,
          showGrid: starMap.showGrid,
          gridOpacity: starMap.gridOpacity,
          starDensity: starMap.starDensity,
          textureKey: starMap.textureKey,
          textureOpacity: starMap.textureOpacity,
          frameConfig: starMap.frameConfig,
          textBlocks: editor.textBlocks,
        },
      })
      trackAddToCart({
        id: `${selection.productId}-${printFormat}-${Date.now()}`,
        title,
        productId: selection.productId,
        format: printFormat,
        priceCents: selection.priceCents,
        posterType: 'star-map',
      })
      toast.success(t('exportAddedToCart'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('exportAddFailed'))
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <B2BExportSection
        posterType="star-map"
        format={printFormat}
        projectId={editor.projectId ?? null}
        renderPreview={renderPreview}
        title={starMap.locationName}
      />
      <div className="relative">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-xs uppercase tracking-wider text-muted-foreground">
            Oder Einzelkauf
          </span>
        </div>
      </div>
      <ProductTierPicker
        printFormat={printFormat}
        isAdding={isAdding}
        onAddToCart={handleAddToCart}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function PreviewButton({ printFormat }: { printFormat: string }) {
  const t = useTranslations('editor')
  const { renderPreview } = useStarMapExport()
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
      setError(err instanceof Error ? err.message : t('exportPreviewFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md border border-border text-foreground/70 text-sm font-medium hover:bg-muted transition-colors"
      >
        <Eye className="w-4 h-4" />
        {t('exportPreviewCta')}
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

export function StarMapExportTab() {
  const { printFormat } = useEditorStore()
  const { isAdmin, loading } = useAuth()

  return (
    <div className="space-y-5 p-4">
      <PreviewButton printFormat={printFormat} />

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
        <CustomerProductView printFormat={printFormat as PrintFormat} />
      )}
    </div>
  )
}
