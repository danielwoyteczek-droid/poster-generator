'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import { Loader2, LayoutTemplate, Pencil, Eye, EyeOff, Trash2, Plus, Link as LinkIcon, Copy, Globe, Tag, X as XIcon, LayoutGrid, List, RefreshCw, AlertCircle, Clock, CheckCircle2, Image as ImageIcon, Rocket } from 'lucide-react'
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
import { applyPreset } from '@/lib/apply-preset'
import { LocaleMultiSelect } from '@/components/admin/LocaleMultiSelect'
import { OccasionMultiSelect } from '@/components/admin/OccasionMultiSelect'
import { locales as ALL_LOCALES, localeNames, type Locale } from '@/i18n/config'
import { occasionLabels, type OccasionCode } from '@/lib/occasions'
import { cn } from '@/lib/utils'

type PosterType = 'map' | 'star-map'
type Status = 'draft' | 'published'

type RenderStatus = 'pending' | 'rendering' | 'done' | 'failed' | 'stale'

interface Preset {
  id: string
  name: string
  description: string | null
  poster_type: PosterType
  preview_image_url: string | null
  status: Status
  display_order: number
  target_locales: string[]
  occasions: string[]
  show_in_editor: boolean
  created_at: string
  updated_at: string
  published_at: string | null
  render_status: RenderStatus
  render_error: string | null
  render_completed_at: string | null
  mockup_set_ids: string[]
}

interface RenderListItem {
  mockup_set_id: string
  variant: 'desktop' | 'mobile'
  image_url: string
  image_width: number | null
  image_height: number | null
  rendered_at: string
  mockup_set: { id: string; name: string; slug: string } | null
}

type BulkAction = 'set' | 'add' | 'remove'
type BulkField = 'locales' | 'occasions'

const BULK_ACTION_LABELS: Record<BulkField, Record<BulkAction, string>> = {
  locales: {
    set: 'Sprachen setzen (überschreibt)',
    add: 'Sprachen hinzufügen',
    remove: 'Sprachen entfernen',
  },
  occasions: {
    set: 'Anlässe setzen (überschreibt)',
    add: 'Anlässe hinzufügen',
    remove: 'Anlässe entfernen',
  },
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

const RENDER_STATUS_CONFIG: Record<RenderStatus, { label: string; className: string; icon: typeof Loader2 }> = {
  pending: { label: 'In Queue', className: 'bg-yellow-100 text-yellow-900 border-yellow-300', icon: Clock },
  rendering: { label: 'Rendert…', className: 'bg-blue-100 text-blue-900 border-blue-300', icon: Loader2 },
  done: { label: 'Fertig', className: 'bg-green-100 text-green-900 border-green-300', icon: CheckCircle2 },
  failed: { label: 'Fehler', className: 'bg-red-100 text-red-900 border-red-300', icon: AlertCircle },
  stale: { label: 'Veraltet', className: 'bg-orange-100 text-orange-900 border-orange-300', icon: AlertCircle },
}

function RenderStatusBadge({ status }: { status: RenderStatus }) {
  const cfg = RENDER_STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium leading-tight ${cfg.className}`}
      title={`Render-Status: ${cfg.label}`}
    >
      <Icon className={`w-3 h-3 ${status === 'rendering' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  )
}

export function AdminPresetsList() {
  const router = useRouter()
  const currentLocale = useLocale()
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [localeFilter, setLocaleFilter] = useState<'all' | 'none' | Locale>('all')
  const [occasionFilter, setOccasionFilter] = useState<'all' | 'none' | OccasionCode>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [previewModalSrc, setPreviewModalSrc] = useState<{ url: string; alt: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<BulkAction>('set')
  const [bulkField, setBulkField] = useState<BulkField>('locales')
  const [bulkLocales, setBulkLocales] = useState<string[]>([])
  const [bulkOccasions, setBulkOccasions] = useState<string[]>([])
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [copySource, setCopySource] = useState<Preset | null>(null)
  const [copyTarget, setCopyTarget] = useState<Locale | ''>('')
  const [copySubmitting, setCopySubmitting] = useState(false)
  const [metaEditTarget, setMetaEditTarget] = useState<Preset | null>(null)
  const [metaEditName, setMetaEditName] = useState('')
  const [metaEditDescription, setMetaEditDescription] = useState('')
  const [metaEditSubmitting, setMetaEditSubmitting] = useState(false)
  const [rendersFor, setRendersFor] = useState<Preset | null>(null)
  const [renders, setRenders] = useState<RenderListItem[] | null>(null)
  const [rendersLoading, setRendersLoading] = useState(false)
  const [renderTarget, setRenderTarget] = useState<Preset | null>(null)
  const [availableMockupSets, setAvailableMockupSets] = useState<{ id: string; name: string; slug: string; is_active: boolean }[]>([])
  const [selectedMockupSetIds, setSelectedMockupSetIds] = useState<string[]>([])
  const [renderTriggering, setRenderTriggering] = useState(false)
  const [workerStarting, setWorkerStarting] = useState(false)

  const fetchPresets = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (typeFilter !== 'all') params.set('poster_type', typeFilter)
    // Locale + occasion filters: concrete value uses API filter (@>);
    // 'none' is handled client-side because the API has no "empty array" filter.
    if (localeFilter !== 'all' && localeFilter !== 'none') {
      params.set('locale', localeFilter)
    }
    if (occasionFilter !== 'all' && occasionFilter !== 'none') {
      params.set('occasion', occasionFilter)
    }
    const res = await fetch(`/api/admin/presets?${params}`)
    const data = await res.json()
    if (res.ok) {
      let result = (data.presets ?? []) as Preset[]
      if (localeFilter === 'none') {
        result = result.filter((p) => !p.target_locales || p.target_locales.length === 0)
      }
      if (occasionFilter === 'none') {
        result = result.filter((p) => !p.occasions || p.occasions.length === 0)
      }
      setPresets(result)
    }
    if (!opts?.silent) setLoading(false)
  }, [statusFilter, typeFilter, localeFilter, occasionFilter])

  useEffect(() => { fetchPresets() }, [fetchPresets])

  // Live-Polling: solange mind. ein Preset gerade rendert oder pending ist,
  // alle 3s neu laden — silent (kein Loading-Spinner), damit's nicht
  // wie ein Page-Reload aussieht.
  useEffect(() => {
    const hasActive = presets.some(
      (p) => p.render_status === 'pending' || p.render_status === 'rendering',
    )
    if (!hasActive) return
    const interval = setInterval(() => { fetchPresets({ silent: true }) }, 3000)
    return () => clearInterval(interval)
  }, [presets, fetchPresets])

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const openMetadataEditor = (preset: Preset) => {
    setMetaEditTarget(preset)
    setMetaEditName(preset.name)
    setMetaEditDescription(preset.description ?? '')
  }

  const closeMetadataEditor = () => {
    setMetaEditTarget(null)
    setMetaEditName('')
    setMetaEditDescription('')
  }

  const submitMetadataEdit = async () => {
    if (!metaEditTarget) return
    if (!metaEditName.trim()) {
      toast.error('Name darf nicht leer sein')
      return
    }
    setMetaEditSubmitting(true)
    try {
      const res = await fetch(`/api/admin/presets/${metaEditTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metaEditName.trim(),
          description: metaEditDescription.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Speichern fehlgeschlagen')
        return
      }
      setPresets((prev) =>
        prev.map((p) =>
          p.id === metaEditTarget.id
            ? { ...p, name: metaEditName.trim(), description: metaEditDescription.trim() || null }
            : p,
        ),
      )
      toast.success('Name aktualisiert')
      closeMetadataEditor()
    } finally {
      setMetaEditSubmitting(false)
    }
  }

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

  const updateOccasions = async (preset: Preset, occasions: string[]) => {
    const res = await fetch(`/api/admin/presets/${preset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occasions }),
    })
    if (res.ok) {
      setPresets((prev) => prev.map((p) => (p.id === preset.id ? { ...p, occasions } : p)))
      toast.success('Anlässe aktualisiert')
    } else {
      toast.error('Aktualisierung fehlgeschlagen')
    }
  }

  const updateShowInEditor = async (preset: Preset, show_in_editor: boolean) => {
    const res = await fetch(`/api/admin/presets/${preset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_in_editor }),
    })
    if (res.ok) {
      setPresets((prev) => prev.map((p) => (p.id === preset.id ? { ...p, show_in_editor } : p)))
      toast.success(show_in_editor ? 'Im Editor sichtbar' : 'Nur in Galerie sichtbar')
    } else {
      toast.error('Aktualisierung fehlgeschlagen')
    }
  }

  const runBulk = async () => {
    if (selectedIds.size === 0) return
    const values = bulkField === 'locales' ? bulkLocales : bulkOccasions
    if (values.length === 0) return
    setBulkSubmitting(true)
    try {
      const res = await fetch('/api/admin/presets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: bulkAction,
          ...(bulkField === 'locales' ? { locales: values } : { occasions: values }),
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
      setBulkOccasions([])
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

  const openRenderDialog = async (preset: Preset) => {
    setRenderTarget(preset)
    setSelectedMockupSetIds(preset.mockup_set_ids ?? [])
    // Mockup-Set-Liste nachladen falls noch nicht da
    if (availableMockupSets.length === 0) {
      try {
        const res = await fetch('/api/admin/mockup-sets')
        const data = await res.json()
        if (res.ok) setAvailableMockupSets(data.mockup_sets ?? [])
      } catch {
        toast.error('Konnte Mockup-Sets nicht laden')
      }
    }
  }

  const confirmRender = async () => {
    if (!renderTarget) return
    setRenderTriggering(true)
    try {
      const res = await fetch(`/api/admin/presets/${renderTarget.id}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockup_set_ids: selectedMockupSetIds }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Render-Trigger fehlgeschlagen')
        return
      }
      toast.success(`„${renderTarget.name}" in Render-Queue`, {
        description: 'Worker pickt es im nächsten Poll-Zyklus auf (max 5s).',
      })
      setPresets((prev) =>
        prev.map((p) =>
          p.id === renderTarget.id
            ? { ...p, render_status: 'pending' as RenderStatus, render_error: null, mockup_set_ids: selectedMockupSetIds }
            : p,
        ),
      )
      setRenderTarget(null)
    } finally {
      setRenderTriggering(false)
    }
  }

  const openRendersFor = async (preset: Preset) => {
    setRendersFor(preset)
    setRenders(null)
    setRendersLoading(true)
    try {
      const res = await fetch(`/api/admin/presets/${preset.id}/renders`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Konnte Renders nicht laden')
        return
      }
      setRenders(data.renders ?? [])
    } finally {
      setRendersLoading(false)
    }
  }

  const triggerWorker = async () => {
    setWorkerStarting(true)
    try {
      const res = await fetch('/api/admin/render-worker/trigger', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Worker-Start fehlgeschlagen', {
          description: data.detail,
        })
        return
      }
      toast.success('Worker gestartet — läuft ~5–25 Min', {
        description: data.runUrl ? 'Klick für Live-Logs auf GitHub' : undefined,
        action: data.runUrl
          ? { label: 'Run öffnen', onClick: () => window.open(data.runUrl, '_blank', 'noopener') }
          : undefined,
      })
    } finally {
      setWorkerStarting(false)
    }
  }

  const triggerBulkRender = async () => {
    if (selectedIds.size === 0) return
    const res = await fetch('/api/admin/presets/bulk-render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Bulk-Render fehlgeschlagen')
      return
    }
    toast.success(`${data.count} Preset${data.count === 1 ? '' : 's'} in Render-Queue`)
    clearSelection()
    fetchPresets()
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

  /**
   * Picks the best locale prefix for a deep-link:
   *  • single-locale preset → that locale
   *  • multi-locale preset that includes the admin's current UI locale → current
   *  • multi-locale preset without current → first locale in the list
   *  • no locale assigned → admin's current locale (so the link at least works)
   */
  const deepLinkLocale = (targetLocales: string[]): string => {
    if (targetLocales.length === 0) return currentLocale
    if (targetLocales.includes(currentLocale)) return currentLocale
    return targetLocales[0]
  }

  const copyPresetUrl = async (preset: Preset) => {
    const path = preset.poster_type === 'star-map' ? '/star-map' : '/map'
    const linkLocale = deepLinkLocale(preset.target_locales)
    const url = `${window.location.origin}/${linkLocale}${path}?preset=${preset.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success(`Link kopiert (${linkLocale.toUpperCase()})`, { description: url })
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

    applyPreset({ poster_type: preset.poster_type, config_json: config })

    useEditorStore.getState().setEditingPreset({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      posterType: preset.poster_type,
    })
    router.push(preset.poster_type === 'star-map' ? '/star-map' : '/map')
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
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            onClick={triggerBulkRender}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Markierte rendern
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-white rounded-md border border-border p-0.5">
              {(['locales', 'occasions'] as const).map((field) => (
                <button
                  key={field}
                  onClick={() => setBulkField(field)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5',
                    bulkField === field ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted',
                  )}
                >
                  {field === 'locales' ? <Globe className="w-3.5 h-3.5" /> : <Tag className="w-3.5 h-3.5" />}
                  {field === 'locales' ? 'Sprachen' : 'Anlässe'}
                </button>
              ))}
            </div>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as BulkAction)}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm"
            >
              {(Object.keys(BULK_ACTION_LABELS[bulkField]) as BulkAction[]).map((a) => (
                <option key={a} value={a}>{BULK_ACTION_LABELS[bulkField][a]}</option>
              ))}
            </select>
            {bulkField === 'locales' ? (
              <LocaleMultiSelect
                value={bulkLocales}
                onChange={setBulkLocales}
                placeholder="Sprachen wählen…"
                buttonClassName="min-w-[180px]"
              />
            ) : (
              <OccasionMultiSelect
                value={bulkOccasions}
                onChange={setBulkOccasions}
                placeholder="Anlässe wählen…"
                buttonClassName="min-w-[180px]"
              />
            )}
            <Button
              size="sm"
              onClick={runBulk}
              disabled={
                (bulkField === 'locales' ? bulkLocales.length : bulkOccasions.length) === 0 ||
                bulkSubmitting
              }
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
          <div className="flex gap-1 bg-white rounded-md border border-border p-0.5">
            {(['all', ...ALL_LOCALES, 'none'] as const).map((key) => {
              const label = key === 'all' ? 'Alle Sprachen' : key === 'none' ? 'Keine' : key.toUpperCase()
              return (
                <button
                  key={key}
                  onClick={() => setLocaleFilter(key as typeof localeFilter)}
                  className={cn(
                    'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                    localeFilter === key
                      ? key === 'none'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-primary text-primary-foreground'
                      : 'text-foreground/70 hover:bg-muted',
                  )}
                  title={key === 'none' ? 'Presets ohne zugewiesene Sprache (= im Editor unsichtbar)' : undefined}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="flex gap-1 bg-white rounded-md border border-border p-0.5">
            <button
              onClick={() => setOccasionFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                occasionFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted',
              )}
            >
              Alle Anlässe
            </button>
            <button
              onClick={() => setOccasionFilter('none')}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                occasionFilter === 'none' ? 'bg-amber-100 text-amber-800' : 'text-foreground/70 hover:bg-muted',
              )}
              title="Presets ohne Anlass-Tag (= nicht in Galerie sichtbar)"
            >
              Kein Tag
            </button>
            <select
              value={occasionFilter !== 'all' && occasionFilter !== 'none' ? occasionFilter : ''}
              onChange={(e) => {
                const v = e.target.value
                setOccasionFilter(v ? (v as OccasionCode) : 'all')
              }}
              className={cn(
                'h-7 px-2 rounded text-xs font-medium border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                occasionFilter !== 'all' && occasionFilter !== 'none'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/70 hover:bg-muted',
              )}
            >
              <option value="">Anlass …</option>
              {(Object.keys(occasionLabels) as OccasionCode[]).map((code) => (
                <option key={code} value={code}>
                  {occasionLabels[code].de}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex gap-1 bg-white rounded-md border border-border p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted',
              )}
              title="Kachel-Ansicht"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted',
              )}
              title="Listen-Ansicht"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
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
          {(() => {
            const pendingCount = presets.filter((p) => p.render_status === 'pending').length
            const renderingCount = presets.filter((p) => p.render_status === 'rendering').length
            const queueCount = pendingCount + renderingCount
            return (
              <Button
                size="sm"
                variant="default"
                onClick={triggerWorker}
                disabled={workerStarting || queueCount === 0}
                title={
                  queueCount === 0
                    ? 'Keine Presets in der Queue. Erst „Rendern" klicken, dann hier den Worker starten.'
                    : `${queueCount} Preset${queueCount === 1 ? '' : 's'} in der Queue — Worker auf GitHub-Actions starten`
                }
              >
                {workerStarting ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4 mr-1.5" />
                )}
                Worker starten
                {queueCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-semibold">
                    {queueCount}
                  </span>
                )}
              </Button>
            )
          })()}
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
      ) : viewMode === 'grid' ? (
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
                <div className="absolute bottom-2 left-2">
                  <RenderStatusBadge status={preset.render_status} />
                </div>
                {!preset.show_in_editor && (
                  <span
                    className="absolute top-9 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800 backdrop-blur"
                    title="Erscheint nur in der Galerie, nicht im Editor-Picker"
                  >
                    Nur Galerie
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-start gap-1">
                    <h3 className="flex-1 font-semibold text-sm text-foreground truncate">{preset.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-foreground -mr-1"
                      onClick={() => openMetadataEditor(preset)}
                      title="Name und Beschreibung bearbeiten"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                  {preset.occasions.length === 0 ? (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      Kein Anlass
                    </span>
                  ) : (
                    preset.occasions.map((code) => (
                      <span
                        key={code}
                        className="text-[10px] font-medium bg-muted text-foreground/80 px-1.5 py-0.5 rounded"
                        title={occasionLabels[code as OccasionCode]?.de ?? code}
                      >
                        {occasionLabels[code as OccasionCode]?.de ?? code}
                      </span>
                    ))
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-auto text-muted-foreground/70 hover:text-foreground"
                        title="Anlässe bearbeiten"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 p-3 space-y-2">
                      <div className="text-xs font-medium text-foreground">Anlass-Tags für Galerie</div>
                      <OccasionMultiSelect
                        value={preset.occasions}
                        onChange={(next) => updateOccasions(preset, next)}
                      />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Wird sofort gespeichert. Leer = nicht in der Galerie sichtbar.
                      </p>
                      <div className="pt-2 mt-1 border-t border-border">
                        <label className="flex items-start gap-2 cursor-pointer text-xs text-foreground">
                          <Checkbox
                            checked={preset.show_in_editor}
                            onCheckedChange={(checked) => updateShowInEditor(preset, checked === true)}
                            className="mt-0.5"
                          />
                          <span className="flex-1">
                            <span className="font-medium">Auch im Editor anzeigen</span>
                            <span className="block text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                              Aus = Preset erscheint nur in der Galerie, nicht im „Von Vorlage starten"-Picker.
                            </span>
                          </span>
                        </label>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-1.5 flex-wrap">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => openRenderDialog(preset)}
                    disabled={
                      preset.status !== 'published' ||
                      preset.render_status === 'pending' ||
                      preset.render_status === 'rendering'
                    }
                    title={
                      preset.status !== 'published'
                        ? 'Erst veröffentlichen, dann rendern'
                        : preset.render_error
                          ? `Letzter Fehler: ${preset.render_error}`
                          : 'Mockup-Render anstoßen'
                    }
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${preset.render_status === 'rendering' ? 'animate-spin' : ''}`} />
                    Rendern
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => openRendersFor(preset)}
                    title="Gerenderte Mockup-Bilder anzeigen"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </Button>
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
      ) : (
        <div className="rounded-xl bg-white border border-border overflow-hidden">
          <ul className="divide-y divide-border">
            {presets.map((preset) => (
              <li
                key={preset.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 transition-colors',
                  selectedIds.has(preset.id) ? 'bg-primary/5' : 'hover:bg-muted/40',
                )}
              >
                <Checkbox
                  checked={selectedIds.has(preset.id)}
                  onCheckedChange={() => toggleSelected(preset.id)}
                  aria-label={`${preset.name} für Bulk-Aktion auswählen`}
                />
                <button
                  type="button"
                  onClick={() => preset.preview_image_url && setPreviewModalSrc({ url: preset.preview_image_url, alt: preset.name })}
                  className="shrink-0 w-9 h-12 rounded bg-muted overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-all"
                  title={preset.preview_image_url ? 'Vorschau vergrößern' : 'Kein Vorschaubild'}
                  disabled={!preset.preview_image_url}
                >
                  {preset.preview_image_url ? (
                    <Image
                      src={preset.preview_image_url}
                      alt={preset.name}
                      width={36}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <LayoutTemplate className="w-5 h-5 m-auto text-muted-foreground/40" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm text-foreground truncate">{preset.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-foreground"
                      onClick={() => openMetadataEditor(preset)}
                      title="Name und Beschreibung bearbeiten"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                  {preset.description && (
                    <p className="text-xs text-muted-foreground truncate">{preset.description}</p>
                  )}
                </div>
                <span className={cn(
                  'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                  preset.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800',
                )}>
                  {preset.status === 'published' ? 'Live' : 'Draft'}
                </span>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-foreground/70 hidden md:inline">
                  {preset.poster_type === 'star-map' ? 'Sternenposter' : 'Stadtposter'}
                </span>
                {!preset.show_in_editor && (
                  <span
                    className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800 hidden md:inline"
                    title="Nur in Galerie sichtbar"
                  >
                    Nur Galerie
                  </span>
                )}
                <div className="shrink-0 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground/70" />
                  {preset.target_locales.length === 0 ? (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      Keine
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
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-foreground" title="Sprachen bearbeiten">
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-60 p-3 space-y-2">
                      <div className="text-xs font-medium text-foreground">Sichtbar in Sprachen</div>
                      <LocaleMultiSelect value={preset.target_locales} onChange={(next) => updateLocales(preset, next)} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="shrink-0 hidden lg:flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground/70" />
                  {preset.occasions.length === 0 ? (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      Kein Tag
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium bg-muted text-foreground/80 px-1.5 py-0.5 rounded" title={preset.occasions.map((c) => occasionLabels[c as OccasionCode]?.de ?? c).join(', ')}>
                      {preset.occasions.length} {preset.occasions.length === 1 ? 'Anlass' : 'Anlässe'}
                    </span>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-foreground" title="Anlässe bearbeiten">
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 p-3 space-y-2">
                      <div className="text-xs font-medium text-foreground">Anlass-Tags für Galerie</div>
                      <OccasionMultiSelect value={preset.occasions} onChange={(next) => updateOccasions(preset, next)} />
                      <div className="pt-2 mt-1 border-t border-border">
                        <label className="flex items-start gap-2 cursor-pointer text-xs text-foreground">
                          <Checkbox
                            checked={preset.show_in_editor}
                            onCheckedChange={(checked) => updateShowInEditor(preset, checked === true)}
                            className="mt-0.5"
                          />
                          <span className="flex-1">
                            <span className="font-medium">Auch im Editor anzeigen</span>
                            <span className="block text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                              Aus = nur in Galerie sichtbar.
                            </span>
                          </span>
                        </label>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="shrink-0 flex gap-0.5">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-foreground" onClick={() => editPreset(preset)} title="Im Editor bearbeiten">
                    <LayoutTemplate className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-foreground"
                    onClick={() => updateStatus(preset, preset.status === 'published' ? 'draft' : 'published')}
                    title={preset.status === 'published' ? 'Zurückziehen' : 'Veröffentlichen'}
                  >
                    {preset.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  {preset.status === 'published' && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-foreground" onClick={() => copyPresetUrl(preset)} title="Deep-Link kopieren">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-foreground"
                    onClick={() => { setCopySource(preset); setCopyTarget('') }}
                    title="In andere Sprache kopieren"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-red-600" title="Löschen">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Preset löschen?</AlertDialogTitle>
                        <AlertDialogDescription>„{preset.name}" wird dauerhaft gelöscht.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePreset(preset.id)} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
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

      <Dialog open={metaEditTarget !== null} onOpenChange={(open) => { if (!open) closeMetadataEditor() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preset bearbeiten</DialogTitle>
            <DialogDescription>
              Name und Beschreibung anpassen. Andere Einstellungen (Layout, Farben, Sprachen) bleiben unverändert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label htmlFor="meta-edit-name" className="text-sm font-medium text-foreground">Name</label>
              <input
                id="meta-edit-name"
                type="text"
                value={metaEditName}
                onChange={(e) => setMetaEditName(e.target.value)}
                disabled={metaEditSubmitting}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="meta-edit-description" className="text-sm font-medium text-foreground">Beschreibung (optional)</label>
              <textarea
                id="meta-edit-description"
                value={metaEditDescription}
                onChange={(e) => setMetaEditDescription(e.target.value)}
                disabled={metaEditSubmitting}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeMetadataEditor} disabled={metaEditSubmitting}>
              Abbrechen
            </Button>
            <Button onClick={submitMetadataEdit} disabled={metaEditSubmitting || !metaEditName.trim()}>
              {metaEditSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewModalSrc !== null} onOpenChange={(open) => { if (!open) setPreviewModalSrc(null) }}>
        <DialogContent className="max-w-2xl p-2 bg-transparent border-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Vorschau</DialogTitle>
          </DialogHeader>
          {previewModalSrc && (
            <div className="relative w-full" style={{ aspectRatio: '2/3' }}>
              <Image
                src={previewModalSrc.url}
                alt={previewModalSrc.alt}
                fill
                sizes="(max-width: 768px) 100vw, 700px"
                className="object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={renderTarget !== null} onOpenChange={(open) => { if (!open) setRenderTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mockups auswählen</DialogTitle>
            <DialogDescription>
              In welchen Mockup-Sets soll „{renderTarget?.name}" gerendert werden?
              Pro Set werden Desktop + Mobile erstellt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto py-2">
            {availableMockupSets.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Noch keine Mockup-Sets angelegt. Erstelle eines in <code>/private/admin/mockup-sets</code> oder direkt in der DB.
              </p>
            )}
            {availableMockupSets.filter((m) => m.is_active).map((m) => (
              <label key={m.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer">
                <Checkbox
                  checked={selectedMockupSetIds.includes(m.id)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedMockupSetIds((prev) => [...prev, m.id])
                    else setSelectedMockupSetIds((prev) => prev.filter((x) => x !== m.id))
                  }}
                />
                <div className="text-sm">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.slug}</div>
                </div>
              </label>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              Tipp: Wenn keine ausgewählt, rendert der Worker den nackten Poster (ohne Mockup-Frame).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenderTarget(null)}>Abbrechen</Button>
            <Button onClick={confirmRender} disabled={renderTriggering}>
              {renderTriggering && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Rendern starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rendersFor !== null} onOpenChange={(open) => { if (!open) { setRendersFor(null); setRenders(null) } }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Mockup-Renders: {rendersFor?.name}</DialogTitle>
            <DialogDescription>
              Alle gerenderten Composite-Bilder dieses Presets — pro Mockup-Set + Variante (Desktop + Mobile).
            </DialogDescription>
          </DialogHeader>
          {rendersLoading && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Lade Renders…
            </div>
          )}
          {!rendersLoading && renders !== null && renders.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Noch keine Renders vorhanden. Klick „Rendern" am Preset, um den Worker anzustoßen.
            </div>
          )}
          {!rendersLoading && renders !== null && renders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto">
              {renders.map((r) => (
                <a
                  key={`${r.mockup_set_id}-${r.variant}`}
                  href={r.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.image_url}
                    alt={`${r.mockup_set?.name ?? 'Mockup'} (${r.variant})`}
                    className="w-full aspect-square object-contain rounded-md border border-border bg-muted"
                  />
                  <div className="mt-1.5 text-xs">
                    <div className="font-medium truncate">{r.mockup_set?.name ?? 'Unbekanntes Set'}</div>
                    <div className="text-muted-foreground capitalize">{r.variant}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
