'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useMapExport } from '@/hooks/useMapExport'
import { PosterFrameModal } from './PosterFrameModal'
import type { PrintFormat } from '@/lib/print-formats'

interface Props {
  /** Override classes for the floating button. Default: round 40 px button
   *  in the top-left corner with a white shadowed look. The component is
   *  designed to live inside a `relative` wrapper around the live preview. */
  className?: string
  /** Optional override for the preview-rendering function. Defaults to the
   *  map exporter so existing callers in PosterCanvas keep working. The
   *  star-map editor passes useStarMapExport().renderPreview here. */
  renderPreview?: (format: PrintFormat) => Promise<string>
}

export function PreviewTriggerButton({ className, renderPreview: renderPreviewProp }: Props) {
  const t = useTranslations('editor')
  const { printFormat } = useEditorStore()
  const mapExport = useMapExport()
  const renderPreview = renderPreviewProp ?? mapExport.renderPreview
  const [open, setOpen] = useState(false)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = async () => {
    setOpen(true)
    setIsLoading(true)
    setImageDataUrl(null)
    setError(null)
    try {
      const url = await renderPreview(printFormat as PrintFormat)
      setImageDataUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('exportPreviewFailed'))
    }
    finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t('previewAriaLabel')}
        title={t('previewTooltip')}
        className={
          className ??
          'absolute top-3 left-3 w-10 h-10 rounded-full bg-white shadow-lg border border-border flex items-center justify-center text-foreground hover:bg-muted active:bg-muted z-50 touch-manipulation transition-colors'
        }
      >
        <Eye className="w-5 h-5" />
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
