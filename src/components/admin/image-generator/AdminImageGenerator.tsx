'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useImageGeneratorState } from '@/hooks/useImageGeneratorState'
import { imageGeneratorApi } from '@/lib/image-generator/api'
import {
  LARGE_RUN_THRESHOLD, countImages, findDuplicateEntries, supportsExtraColors,
} from '@/lib/image-generator/helpers'
import type {
  GeneratorTemplate, MockupSetOption, OverlayAsset, PaletteOption, SelectionItem,
} from '@/lib/image-generator/types'
import { PresetPickerDialog } from './PresetPickerDialog'
import { MockupSelection, entryProblem, newSelectionKey } from './MockupSelection'
import { OverlayPickerDialog } from './OverlayPickerDialog'
import { TemplateBar } from './TemplateBar'
import { ExtraColorsSection } from './ExtraColorsSection'
import { GeneratorGallery } from './GeneratorGallery'
import { ORIENTATION_LABELS, POSTER_TYPE_LABELS } from './labels'

function StepCard({ step, title, children, action }: { step: number; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-background p-4 sm:p-5 space-y-4" aria-labelledby={`step-${step}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 id={`step-${step}`} className="flex items-center gap-2 font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">{step}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function AdminImageGenerator() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const presetId = searchParams.get('preset')

  const [pickerOpen, setPickerOpen] = useState(!presetId)
  const { state, setState, loading, error, refresh, polling } = useImageGeneratorState(presetId)

  const [mockups, setMockups] = useState<MockupSetOption[]>([])
  const [palettes, setPalettes] = useState<PaletteOption[]>([])
  const [overlays, setOverlays] = useState<OverlayAsset[]>([])
  const [templates, setTemplates] = useState<GeneratorTemplate[]>([])
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryErrors, setLibraryErrors] = useState<string[]>([])

  const [items, setItems] = useState<SelectionItem[]>([])
  const [extraColorIds, setExtraColorIds] = useState<string[]>([])
  const [overlayTargetKey, setOverlayTargetKey] = useState<string | null>(null)
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null)
  const [confirmLarge, setConfirmLarge] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const labels = ['Mockups', 'Farben', 'Overlays', 'Vorlagen']
    Promise.allSettled([
      imageGeneratorApi.listMockupSets(),
      imageGeneratorApi.listPalettes(),
      imageGeneratorApi.listOverlays(),
      imageGeneratorApi.listTemplates(),
    ]).then(([m, p, o, t]) => {
      if (m.status === 'fulfilled') setMockups(m.value)
      if (p.status === 'fulfilled') setPalettes(p.value)
      if (o.status === 'fulfilled') setOverlays(o.value)
      if (t.status === 'fulfilled') setTemplates(t.value)
      setLibraryErrors(
        [m, p, o, t].flatMap((r, i) => (r.status === 'rejected' ? [`${labels[i]}: ${(r.reason as Error).message}`] : [])),
      )
      setLibraryLoading(false)
    })
  }, [])

  const preset = state?.preset ?? null
  const orientation = preset?.orientation ?? 'portrait'
  const colorsSupported = preset ? supportsExtraColors(preset.poster_type) : false

  // Zusatzfarben gehören zum Preset, nicht zur Auswahl → beim Preset-Wechsel leeren.
  useEffect(() => { setExtraColorIds([]) }, [presetId])

  const selectPreset = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('preset', id)
    router.replace(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams])

  const mockupsById = useMemo(() => new Map(mockups.map((m) => [m.id, m])), [mockups])
  const overlaysById = useMemo(() => new Map(overlays.map((o) => [o.id, o])), [overlays])

  const validItems = useMemo(() => {
    const dupes = new Set(findDuplicateEntries(items).map((i) => i.key))
    return items.filter((i) => !dupes.has(i.key) && !entryProblem(i, mockupsById, overlaysById, orientation))
  }, [items, mockupsById, overlaysById, orientation])

  const effectiveColorIds = colorsSupported ? extraColorIds : []
  const total = countImages(validItems.length, effectiveColorIds.length)
  const skipped = items.length - validItems.length

  const loadTemplate = (t: GeneratorTemplate) => {
    const next = t.entries.map((e) => ({ ...e, key: newSelectionKey() }))
    setItems(next)
    setLoadedTemplateId(t.id)
    const problems = next.filter((i) => entryProblem(i, mockupsById, overlaysById, orientation)).length
    if (problems > 0) toast.warning(`${problems} Eintrag/Einträge der Vorlage passen nicht zu diesem Preset`)
  }

  const generate = async () => {
    if (!preset || validItems.length === 0) return
    setConfirmLarge(false)
    setGenerating(true)
    try {
      const res = await imageGeneratorApi.generate(preset.id, {
        entries: validItems.map(({ mockup_set_id, overlay_id }) => ({ mockup_set_id, overlay_id })),
        palette_ids: effectiveColorIds,
      })
      const open = res.images.filter((i) => i.status === 'pending' || i.status === 'rendering').length
      toast.success(`${res.completed_now} Bild${res.completed_now === 1 ? '' : 'er'} sofort fertig`, {
        description: open > 0
          ? `${open} weitere laufen${res.worker_triggered ? ' – Render-Worker wurde gestartet' : ''}`
          : undefined,
      })
      if (res.worker_error) toast.error('Render-Worker konnte nicht gestartet werden', { description: res.worker_error })
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erstellen fehlgeschlagen')
    } finally {
      setGenerating(false)
    }
  }

  const onGenerateClick = () => (total > LARGE_RUN_THRESHOLD ? setConfirmLarge(true) : generate())

  return (
    <div className="space-y-4 pb-28">
      <PresetPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={selectPreset} />

      {libraryErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            Nicht alles konnte geladen werden: {libraryErrors.join(' · ')}
          </AlertDescription>
        </Alert>
      )}

      {/* 1 · Preset */}
      <StepCard
        step={1}
        title="Preset"
        action={preset && <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>Ändern</Button>}
      >
        {!presetId ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">Wähle das Preset, für das Bilder entstehen sollen.</p>
            <Button onClick={() => setPickerOpen(true)}>Preset wählen</Button>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Lade Preset …
          </div>
        ) : error || !preset ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-destructive flex-1">{error ?? 'Preset nicht gefunden'}</p>
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>Anderes Preset wählen</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-16 h-20 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
              {preset.preview_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preset.preview_image_url} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[10px] text-muted-foreground text-center px-1">kein Bild</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{preset.name}</div>
              <div className="flex gap-1 flex-wrap mt-1">
                <Badge variant="secondary">{POSTER_TYPE_LABELS[preset.poster_type]}</Badge>
                <Badge variant="outline">{ORIENTATION_LABELS[preset.orientation]}</Badge>
              </div>
            </div>
          </div>
        )}
      </StepCard>

      {preset && (
        <>
          {/* 2 · Mockups */}
          <StepCard
            step={2}
            title="Mockups"
            action={
              <TemplateBar
                templates={templates}
                onTemplatesChange={setTemplates}
                loadedTemplateId={loadedTemplateId}
                onLoadedTemplateIdChange={setLoadedTemplateId}
                onLoad={loadTemplate}
                currentEntries={items.map(({ mockup_set_id, overlay_id }) => ({ mockup_set_id, overlay_id }))}
              />
            }
          >
            {libraryLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Lade Mockups …
              </div>
            ) : (
              <MockupSelection
                orientation={orientation}
                mockups={mockups}
                overlays={overlays}
                items={items}
                onChange={setItems}
                onPickOverlay={setOverlayTargetKey}
              />
            )}
          </StepCard>

          {/* 3 · Weitere Farben (nur Karten) */}
          {colorsSupported && (
            <section className="rounded-lg border bg-background p-4 sm:p-5">
              <ExtraColorsSection
                palettes={palettes}
                selectedIds={extraColorIds}
                onChange={setExtraColorIds}
                mockupCount={validItems.length}
              />
            </section>
          )}

          <GeneratorGallery
            preset={preset}
            images={state?.images ?? []}
            mockups={mockups}
            overlays={overlays}
            palettes={palettes}
            onImagesChange={(images) => setState((s) => (s ? { ...s, images } : s))}
            onRefresh={refresh}
          />

          {/* Erstellen-Leiste */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0 text-sm">
                <div className="font-medium">
                  {total} Bild{total === 1 ? '' : 'er'} werden erzeugt
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {validItems.length} Mockup{validItems.length === 1 ? '' : 's'}
                  {effectiveColorIds.length > 0 && ` × ${1 + effectiveColorIds.length} Farben`}
                  {skipped > 0 && ` · ${skipped} übersprungen`}
                  {polling && ' · Erstellung läuft'}
                </div>
              </div>
              <Button onClick={onGenerateClick} disabled={validItems.length === 0 || generating} size="lg">
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Erstellen
              </Button>
            </div>
          </div>
        </>
      )}

      <OverlayPickerDialog
        open={overlayTargetKey !== null}
        onOpenChange={(o) => { if (!o) setOverlayTargetKey(null) }}
        orientation={orientation}
        overlays={overlays}
        onSelect={(overlay) => {
          if (overlayTargetKey) setItems((prev) => prev.map((i) => (i.key === overlayTargetKey ? { ...i, overlay_id: overlay.id } : i)))
        }}
        onUploaded={(overlay) => setOverlays((prev) => [overlay, ...prev])}
      />

      <AlertDialog open={confirmLarge} onOpenChange={setConfirmLarge}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{total} Bilder erzeugen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das ist ein großer Lauf. Zusatzfarben brauchen den Render-Worker, Dynamic-Mockups-Bilder verbrauchen Kontingent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={generate}>Ja, erzeugen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
