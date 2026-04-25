'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, LayoutTemplate, Pencil, Eye, EyeOff, Trash2, Plus, Link as LinkIcon, Copy, Globe, X as XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useStarMapStore } from '@/hooks/useStarMapStore'
import { LocaleMultiSelect } from '@/components/admin/LocaleMultiSelect'
import { locales as ALL_LOCALES, localeNames, type Locale } from '@/i18n/config'
import { cn } from '@/lib/utils'

type PosterType = 'map' | 'star-map'
type Status = 'draft' | 'published'

interface Preset {
  id: string
  name: string
  description: string | null
  poster_type: PosterType
  preview_image_url: string | null
  status: Status
  display_order: number
  target_locales: string[]
  created_at: string
  updated_at: string
  published_at: string | null
}

type BulkAction = 'set' | 'add' | 'remove'

const BULK_ACTION_LABELS: Record<BulkAction, string> = {
  set: 'Sprachen setzen (überschreibt)',
  add: 'Sprachen hinzufügen',
  remove: 'Sprachen entfernen',
}

const FILTER_LABELS: Record<string, string> = {
  all: 'Alle',
  draft: 'Draft',
  published: 'Veröffentlicht',
}

const TYPE_LABELS: Record<string, string> = {
  all: 'Alle Typen',
  map: 'Stadtposter',
  'star-map': 'Sternenposter',
}

export function AdminPresetsList() {
  const router = useRouter()
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<BulkAction>('set')
  const [bulkLocales, setBulkLocales] = useState<string[]>([])
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [copySource, setCopySource] = useState<Preset | null>(null)
  const [copyTarget, setCopyTarget] = useState<Locale | ''>('')
  const [copySubmitting, setCopySubmitting] = useState(false)

  const fetchPresets = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (typeFilter !== 'all') params.set('poster_type', typeFilter)
    const res = await fetch(`/api/admin/presets?${params}`)
    const data = await res.json()
    if (res.ok) setPresets(data.presets ?? [])
    setLoading(false)
  }, [statusFilter, typeFilter])

  useEffect(() => { fetchPresets() }, [fetchPresets])

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const updateLocales = async (preset: Preset, target_locales: string[]) => {
    const res = await fetch(`/api/admin/presets/${preset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_locales }),
    })
    if (res.ok) {
      setPresets((prev) => prev.map((p) => (p.id === preset.id ? { ...p, target_locales } : p)))
      toast.success('Sprachen aktualisiert')
    } else {
      toast.error('Aktualisierung fehlgeschlagen')
    }
  }

  const runBulk = async () => {
    if (selectedIds.size === 0 || bulkLocales.length === 0) return
    setBulkSubmitting(true)
    try {
      const res = await fetch('/api/admin/presets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: bulkAction,
          locales: bulkLocales,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Bulk-Aktion fehlgeschlagen')
        return
      }
      toast.success(`${data.updated} Preset${data.updated === 1 ? '' : 's'} aktualisiert`)
      clearSelection()
      setBulkLocales([])
      fetchPresets()
    } finally {
      setBulkSubmitting(false)
    }
  }

  const runCopy = async () => {
    if (!copySource || !copyTarget) return
    setCopySubmitting(true)
    try {
      const res = await fetch(`/api/admin/presets/${copySource.id}/copy-to-locale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_locale: copyTarget }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Kopieren fehlgeschlagen')
        return
      }
      toast.success(`Kopie als „${data.preset.name}" angelegt`, {
        description: 'Du kannst sie jetzt im Editor bearbeiten und Texte übersetzen.',
      })
      setCopySource(null)
      setCopyTarget('')
      fetchPresets()
    } finally {
      setCopySubmitting(false)
    }
  }

  const updateStatus = async (preset: Preset, status: Status) => {
    const res = await fetch(`/api/admin/presets/${preset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.success(status === 'published' ? 'Preset veröffentlicht' : 'Preset zurückgezogen')
      fetchPresets()
    } else {
      toast.error('Status-Änderung fehlgeschlagen')
    }
  }

  const copyPresetUrl = async (preset: Preset) => {
    const path = preset.poster_type === 'star-map' ? '/star-map' : '/map'
    const url = `${window.location.origin}${path}?preset=${preset.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link kopiert', { description: url })
    } catch {
      toast.error('Konnte Link nicht kopieren')
    }
  }

  const deletePreset = async (id: string) => {
    const res = await fetch(`/api/admin/presets/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Preset gelöscht')
      setPresets((prev) => prev.filter((p) => p.id !== id))
    } else {
      toast.error('Löschen fehlgeschlagen')
    }
  }

  const editPreset = async (preset: Preset) => {
    const res = await fetch(`/api/admin/presets/${preset.id}`)
    const data = await res.json()
    if (!res.ok || !data.preset) {
      toast.error('Laden fehlgeschlagen')
      return
    }
    const config = data.preset.config_json as Record<string, unknown>

    // Apply the preset's config to the respective editor store
    if (preset.poster_type === 'star-map') {
      const s = config as {
        posterBgColor?: string; skyBgColor?: string; starColor?: string
        showConstellations?: boolean; showMilkyWay?: boolean
        showSun?: boolean; showMoon?: boolean; showPlanets?: boolean
        frameConfig?: {
          outer?: Partial<{ mode: 'none' | 'opacity' | 'full'; opacity: number; margin: number }>
          innerFrame?: Partial<{ enabled: boolean; color: string; thickness: number }>
          outerFrame?: Partial<{ enabled: boolean; color: string; thickness: number; style: 'single' | 'double'; gap: number }>
        }
        textBlocks?: unknown
      }
      const starMap = useStarMapStore.getState()
      if (s.posterBgColor) starMap.setPosterBgColor(s.posterBgColor)
      if (s.skyBgColor) starMap.setSkyBgColor(s.skyBgColor)
      if (s.starColor) starMap.setStarColor(s.starColor)
      if (s.showConstellations !== undefined) starMap.setShowConstellations(s.showConstellations)
      if (s.showMilkyWay !== undefined) starMap.setShowMilkyWay(s.showMilkyWay)
      if (s.showSun !== undefined) starMap.setShowSun(s.showSun)
      if (s.showMoon !== undefined) starMap.setShowMoon(s.showMoon)
      if (s.showPlanets !== undefined) starMap.setShowPlanets(s.showPlanets)
      if (s.frameConfig?.outer) starMap.setOuter(s.frameConfig.outer)
      if (s.frameConfig?.innerFrame) starMap.setInnerFrame(s.frameConfig.innerFrame)
      if (s.frameConfig?.outerFrame) starMap.setOuterFrame(s.frameConfig.outerFrame)
      if (s.textBlocks) {
        useEditorStore.setState({ textBlocks: s.textBlocks as never })
      }
      useEditorStore.getState().setEditingPreset({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        posterType: 'star-map',
      })
      router.push('/star-map')
    } else {
      // Map preset: apply to editor store
      useEditorStore.setState((state) => ({
        ...state,
        ...(config as Partial<typeof state>),
        // Important: keep the user's current viewState/location, not the preset's
        viewState: state.viewState,
        locationName: state.locationName,
        projectId: null, // Don't associate with a locked project
        editingPreset: {
          id: preset.id,
          name: preset.name,
          description: preset.description,
          posterType: 'map',
        },
      }))
      router.push('/map')
    }
    toast.success(`Preset "${preset.name}" geladen — Editor wird geöffnet`)
  }

  const availableTargetsForCopy = copySource
    ? ALL_LOCALES.filter((l) => !copySource.target_locales.includes(l))
    : []

  return (
    <div className="space-y-6">
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b border-border flex flex-wrap items-center gap-3">
          <div className="text-sm font-medium text-foreground">
            {selectedIds.size} ausgewählt
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as BulkAction)}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm"
            >
              {(Object.keys(BULK_ACTION_LABELS) as BulkAction[]).map((a) => (
                <option key={a} value={a}>{BULK_ACTION_LABELS[a]}</option>
              ))}
            </select>
            <LocaleMultiSelect
              value={bulkLocales}
              onChange={setBulkLocales}
              placeholder="Sprachen wählen…"
              buttonClassName="min-w-[180px]"
            />
            <Button
              size="sm"
              onClick={runBulk}
              disabled={bulkLocales.length === 0 || bulkSubmitting}
            >
              {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Anwenden
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <XIcon className="w-4 h-4 mr-1" />
              Auswahl aufheben
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 bg-white rounded-md border border-border p-0.5">
            {Object.entries(FILTER_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  statusFilter === key ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-white rounded-md border border-border p-0.5">
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  typeFilter === key ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/map">
              <Plus className="w-4 h-4 mr-1.5" />
              Neues Stadtposter-Preset
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/star-map">
              <Plus className="w-4 h-4 mr-1.5" />
              Neues Sternenposter-Preset
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white border border-border p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground/70" />
        </div>
      ) : presets.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
          <LayoutTemplate className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          Noch keine Presets. Designe im Editor ein Poster und klick auf „Als Preset" in der oberen Navigation.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={cn(
                'rounded-xl bg-white border overflow-hidden transition-colors',
                selectedIds.has(preset.id) ? 'border-primary ring-2 ring-primary/20' : 'border-border',
              )}
            >
              <div className="aspect-[2/3] bg-muted relative">
                {preset.preview_image_url ? (
                  <Image
                    src={preset.preview_image_url}
                    alt={preset.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                    <LayoutTemplate className="w-12 h-12" />
                  </div>
                )}
                <label className="absolute top-2 left-2 w-7 h-7 rounded-md bg-white/90 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white transition-colors">
                  <Checkbox
                    checked={selectedIds.has(preset.id)}
                    onCheckedChange={() => toggleSelected(preset.id)}
                    aria-label={`${preset.name} für Bulk-Aktion auswählen`}
                  />
                </label>
                <span className={cn(
                  'absolute top-2 left-12 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                  preset.status === 'published'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800',
                )}>
                  {preset.status === 'published' ? 'Live' : 'Draft'}
                </span>
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/90 text-foreground/70 backdrop-blur">
                  {preset.poster_type === 'star-map' ? 'Sternenposter' : 'Stadtposter'}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm text-foreground truncate">{preset.name}</h3>
                  {preset.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preset.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                  {preset.target_locales.length === 0 ? (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      Keine Sprache
                    </span>
                  ) : (
                    preset.target_locales.map((loc) => (
                      <span
                        key={loc}
                        className="text-[10px] font-mono uppercase bg-muted text-foreground/80 px-1.5 py-0.5 rounded"
                        title={localeNames[loc as Locale] ?? loc}
                      >
                        {loc}
                      </span>
                    ))
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-auto text-muted-foreground/70 hover:text-foreground"
                        title="Sprachen bearbeiten"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-60 p-3 space-y-2">
                      <div className="text-xs font-medium text-foreground">Sichtbar in Sprachen</div>
                      <LocaleMultiSelect
                        value={preset.target_locales}
                        onChange={(next) => updateLocales(preset, next)}
                      />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Auswahl wird sofort gespeichert. Leere Auswahl = im Editor unsichtbar.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => editPreset(preset)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Bearbeiten
                  </Button>
                  {preset.status === 'draft' ? (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => updateStatus(preset, 'published')}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Veröffentlichen
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => updateStatus(preset, 'draft')}
                    >
                      <EyeOff className="w-3.5 h-3.5 mr-1" />
                      Zurückziehen
                    </Button>
                  )}
                  {preset.status === 'published' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-foreground"
                      onClick={() => copyPresetUrl(preset)}
                      title="Deep-Link zum Preset kopieren"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-foreground"
                    onClick={() => {
                      setCopySource(preset)
                      setCopyTarget('')
                    }}
                    title="In andere Sprache kopieren"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Preset löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          „{preset.name}" wird dauerhaft gelöscht.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePreset(preset.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={copySource !== null} onOpenChange={(open) => { if (!open) { setCopySource(null); setCopyTarget('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>In andere Sprache kopieren</DialogTitle>
            <DialogDescription>
              {copySource && (
                <>Erstellt eine Kopie von <strong>„{copySource.name}"</strong> als Draft in der gewählten Sprache. Im Anschluss kannst du Texte übersetzen.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-xs font-medium text-foreground">Zielsprache</div>
            {availableTargetsForCopy.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Dieser Preset ist bereits in allen verfügbaren Sprachen markiert.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableTargetsForCopy.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setCopyTarget(loc)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-left transition-colors',
                      copyTarget === loc
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground bg-background',
                    )}
                  >
                    <span className="font-mono text-xs uppercase w-6 text-muted-foreground">{loc}</span>
                    <span className="text-foreground">{localeNames[loc as Locale]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCopySource(null); setCopyTarget('') }}>
              Abbrechen
            </Button>
            <Button onClick={runCopy} disabled={!copyTarget || copySubmitting}>
              {copySubmitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Kopie als Draft anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
