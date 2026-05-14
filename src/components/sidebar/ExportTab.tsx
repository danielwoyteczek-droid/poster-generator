'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, FileImage, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useMapExport } from '@/hooks/useMapExport'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/hooks/useCartStore'
import { type PrintFormat } from '@/lib/print-formats'
import { trackAddToCart } from '@/lib/analytics'
import { downsizeDataURL } from '@/lib/image-utils'
import { ProductTierPicker, type TierSelection } from '@/components/cart/ProductTierPicker'
import { B2BExportSection } from '@/components/business/B2BExportSection'

// Page-Setup (Format + Ausrichtung) lebt jetzt im Karte-Tab — Customer
// trifft diese Entscheidung am Anfang, nicht beim Export. Hier nur noch
// Produkt-Auswahl + Buy-Flow.

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
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        Herunterladen
      </Label>

      <button
        type="button"
        onClick={() => handleExport('png')}
        disabled={isExporting}
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting && activeAction === 'png' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />}
        {isExporting && activeAction === 'png' ? 'Wird erstellt…' : 'PNG herunterladen'}
      </button>

      <button
        type="button"
        onClick={() => handleExport('pdf')}
        disabled={isExporting}
        className="w-full h-10 flex items-center justify-center gap-2 rounded-md border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting && activeAction === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {isExporting && activeAction === 'pdf' ? 'Wird erstellt…' : 'PDF herunterladen'}
      </button>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground/70 leading-relaxed">
        Der Export rendert die Karte in voller Druckauflösung. Dies kann einige Sekunden dauern.
      </p>
    </div>
  )
}

// ─── Customer product selection ───────────────────────────────────────────────

function CustomerProductView({ printFormat }: { printFormat: PrintFormat }) {
  const t = useTranslations('editor')
  const [isAdding, setIsAdding] = useState(false)
  const { renderPreview } = useMapExport()
  const addItem = useCartStore((s) => s.addItem)
  const editor = useEditorStore()
  // PROJ-50: B2B-Direct-Download-Section oben dran — Subscribers + Free-User
  // exportieren ueber Credits, Visitor sieht nur den klassischen Cart-Flow.
  const b2bSection = (
    <B2BExportSection
      posterType="map"
      format={printFormat}
      projectId={editor.projectId ?? null}
      renderPreview={renderPreview}
      title={editor.locationName}
    />
  )

  const handleAddToCart = async (selection: TierSelection) => {
    setIsAdding(true)
    try {
      const fullDataUrl = await renderPreview(printFormat)
      const previewDataUrl = await downsizeDataURL(fullDataUrl, 600)
      const title = editor.locationName || t('exportDefaultPosterTitle')
      addItem({
        productId: selection.productId,
        withFrame: selection.withFrame,
        format: printFormat,
        posterType: 'map',
        title,
        priceCents: selection.priceCents,
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
          orientation: editor.orientation,
        },
      })
      trackAddToCart({
        id: `${selection.productId}-${printFormat}-${Date.now()}`,
        title,
        productId: selection.productId,
        format: printFormat,
        priceCents: selection.priceCents,
        posterType: 'map',
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
      {b2bSection}
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

export function ExportTab() {
  const { printFormat } = useEditorStore()
  const { isAdmin, loading } = useAuth()

  return (
    <div className="space-y-5 p-4">
      {/* PROJ-37: Format-Selector lebt jetzt im MapTab (am Top), weil das
          Format den Editor-Map-Viewport beeinflusst. Hier nur noch
          Produkt-Auswahl + Buy-Flow. */}

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
