'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  DTF_MAX_UPLOAD_BYTES,
  DTF_MIN_DPI_WARNING,
  DTF_TARGET_DPI,
} from '@/lib/dtf-constants'
import { useDtfStore, elementHeightMm, elementDpi, type DtfMotif } from '@/hooks/useDtfStore'
import { uploadDtfMotif, listDtfUploads, deleteDtfUpload } from '@/lib/dtf-upload'
import { cn } from '@/lib/utils'

/**
 * PROJ-55: Motive hochladen, ablegen, platzieren und einstellen.
 *
 * Die Ablage ist bewusst getrennt vom Bogen: Ein einmal hochgeladenes Motiv
 * lässt sich mehrfach platzieren, ohne es erneut zu übertragen. Bei
 * Druckdaten von bis zu 50 MB ist jeder vermiedene Upload spürbar.
 */
export function DtfMotifsTab() {
  const t = useTranslations('dtfEditor')
  const fileRef = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [jpegNotice, setJpegNotice] = useState(false)

  const motifs = useDtfStore((s) => s.motifs)
  const setMotifs = useDtfStore((s) => s.setMotifs)
  const addMotif = useDtfStore((s) => s.addMotif)
  const removeMotif = useDtfStore((s) => s.removeMotif)
  const placeMotif = useDtfStore((s) => s.placeMotif)

  const elements = useDtfStore((s) => s.elements)
  const selectedId = useDtfStore((s) => s.selectedId)
  const updateElement = useDtfStore((s) => s.updateElement)
  const duplicateElement = useDtfStore((s) => s.duplicateElement)
  const removeElement = useDtfStore((s) => s.removeElement)

  const selected = elements.find((e) => e.id === selectedId) ?? null

  // Ablage beim ersten Rendern laden. Bei Gästen liefert die Route eine
  // leere Liste, solange noch nichts hochgeladen wurde — das Cookie wird
  // erst beim ersten Upload gesetzt.
  useEffect(() => {
    let cancelled = false
    listDtfUploads()
      .then((list) => {
        if (!cancelled) setMotifs(list)
      })
      .catch(() => {
        /* leere Ablage ist kein Fehlerfall für den Kunden */
      })
    return () => {
      cancelled = true
    }
  }, [setMotifs])

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      setError(null)
      setBusy(true)

      for (const file of Array.from(files)) {
        try {
          if (file.type === 'image/jpeg') setJpegNotice(true)
          const uploaded = await uploadDtfMotif(file, { onProgress: setProgress })
          // Die Vorschau-URL kommt aus der Ablage-Abfrage; direkt nach dem
          // Upload holen wir sie einmal nach, damit das Motiv sofort
          // sichtbar ist.
          const refreshed = await listDtfUploads()
          const match = refreshed.find((m) => m.id === uploaded.id)
          if (match) addMotif(match as DtfMotif)
        } catch (err) {
          setError(err instanceof Error ? err.message : t('uploadFailed'))
        }
      }

      setBusy(false)
      setProgress(0)
      if (fileRef.current) fileRef.current.value = ''
    },
    [addMotif, t],
  )

  const maxMb = Math.round(DTF_MAX_UPLOAD_BYTES / 1024 / 1024)

  return (
    <div className="p-4 space-y-6">
      {/* ── Upload ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('uploadHeading')}
        </Label>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void handleFiles(e.dataTransfer.files)
          }}
          className="rounded-md border-2 border-dashed border-border p-4 text-center"
        >
          <p className="text-xs text-muted-foreground mb-2">{t('uploadDropHint')}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? t('uploading') : t('uploadButton')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            hidden
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <p className="text-[11px] text-muted-foreground mt-2">
            {t('uploadFormats', { maxMb })}
          </p>
        </div>

        {busy && progress > 0 && <Progress value={progress} className="h-1" />}

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {jpegNotice && (
          <Alert>
            <AlertDescription className="text-xs">{t('jpegWarning')}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* ── Ablage ─────────────────────────────────────────────── */}
      {motifs.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t('libraryHeading')}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {motifs.map((m) => (
              <div key={m.id} className="relative group">
                <button
                  type="button"
                  onClick={() => placeMotif(m)}
                  title={t('placeMotif')}
                  className="w-full aspect-square rounded border border-border bg-[length:12px_12px] hover:border-primary transition-colors overflow-hidden"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)',
                    backgroundPosition: '0 0,0 6px,6px -6px,-6px 0',
                  }}
                >
                  {m.previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.previewUrl}
                      alt={m.filename ?? ''}
                      className="w-full h-full object-contain"
                    />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={t('deleteMotif')}
                  onClick={async () => {
                    try {
                      await deleteDtfUpload(m.id)
                      removeMotif(m.id)
                    } catch (err) {
                      setError(err instanceof Error ? err.message : t('deleteFailed'))
                    }
                  }}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs leading-none opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{t('libraryHint')}</p>
        </div>
      )}

      {/* ── Ausgewähltes Motiv ─────────────────────────────────── */}
      {selected && (
        <div className="space-y-3 pt-2 border-t border-border">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t('selectedHeading')}
          </Label>

          <div className="space-y-1.5">
            <Label htmlFor="dtf-width" className="text-xs">
              {t('widthCm')}
            </Label>
            <Input
              id="dtf-width"
              type="number"
              step="0.1"
              min="1"
              value={(selected.widthMm / 10).toFixed(1)}
              onChange={(e) => {
                const cm = Number(e.target.value)
                if (Number.isFinite(cm) && cm > 0) {
                  updateElement(selected.id, { widthMm: cm * 10 })
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              {t('heightCm', { value: (elementHeightMm(selected) / 10).toFixed(1) })}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dtf-rotation" className="text-xs">
              {t('rotation')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="dtf-rotation"
                type="number"
                step="1"
                value={Math.round(selected.rotationDeg)}
                onChange={(e) => {
                  const deg = Number(e.target.value)
                  if (Number.isFinite(deg)) {
                    updateElement(selected.id, { rotationDeg: ((deg % 360) + 360) % 360 })
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateElement(selected.id, { rotationDeg: 0 })}
              >
                {t('rotationReset')}
              </Button>
            </div>
          </div>

          {/* dpi: immer neutral sichtbar, damit der Kunde entscheiden kann.
              Genau EINE Warnung unterhalb der Schwelle — eine Ampel mit
              mehreren Stufen würde ständig anspringen und ignoriert. */}
          <div
            className={cn(
              'rounded-md px-3 py-2 text-xs',
              elementDpi(selected) < DTF_MIN_DPI_WARNING
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <div className="font-medium">
              {t('dpiValue', { dpi: elementDpi(selected) })}
            </div>
            {elementDpi(selected) < DTF_MIN_DPI_WARNING ? (
              <p className="mt-1">{t('dpiWarning', { min: DTF_MIN_DPI_WARNING })}</p>
            ) : (
              <p className="mt-1 opacity-80">{t('dpiTarget', { target: DTF_TARGET_DPI })}</p>
            )}
          </div>

          {/* Kein „ragt über den Rand hinaus"-Hinweis mehr: Ziehen,
              Skalieren, Drehen und Formatwechsel laufen alle durch
              clampElementToSheet, das Motiv KANN den bedruckbaren Bereich
              nicht verlassen. Ein Hinweis, der zum Verschieben rät, wäre
              hier nur verwirrend. */}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => duplicateElement(selected.id)}
            >
              {t('duplicate')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={() => removeElement(selected.id)}
            >
              {t('remove')}
            </Button>
          </div>
        </div>
      )}

      {!selected && elements.length > 0 && (
        <p className="text-xs text-muted-foreground">{t('selectHint')}</p>
      )}
    </div>
  )
}
