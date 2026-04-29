'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, FileImage, FileText } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/hooks/useEditorStore'
import { usePhotoExport } from '@/hooks/usePhotoExport'
import { PRINT_FORMAT_OPTIONS, type PrintFormat } from '@/lib/print-formats'
import { cn } from '@/lib/utils'

/**
 * Sidebar-Tab für den Foto-Editor: Format-Auswahl + PNG/PDF-Download.
 *
 * V1 deckt nur den Direkt-Download ab (Admin-Workflow + Designer-Vorschau).
 * Warenkorb/Bestellung folgt in einem späteren Commit, sobald das
 * Snapshot-Schema und der server-seitige Re-Render der Bestellung für den
 * Foto-Poster definiert sind.
 */
export function PhotoExportTab() {
  const t = useTranslations('editor')
  const { printFormat, setPrintFormat } = useEditorStore()
  const { exportPNG, exportPDF, isExporting, error } = usePhotoExport()
  const [activeAction, setActiveAction] = useState<'png' | 'pdf' | null>(null)

  const fmt = PRINT_FORMAT_OPTIONS.find((f) => f.id === printFormat)!

  const handleExport = async (type: 'png' | 'pdf') => {
    setActiveAction(type)
    if (type === 'png') await exportPNG(printFormat as PrintFormat)
    else await exportPDF(printFormat as PrintFormat)
    setActiveAction(null)
  }

  return (
    <div className="space-y-5 p-4">
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

      <Separator />

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
    </div>
  )
}
