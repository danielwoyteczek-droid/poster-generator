'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Copy, ExternalLink, Search, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { useOccasions } from '@/hooks/useOccasions'
import { locales as LOCALES } from '@/i18n/config'

const LOCALE_LABELS: Record<string, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
  es: 'Español',
}

interface RenderItem {
  id: string
  preset_id: string
  mockup_set_id: string
  variant: 'desktop' | 'mobile'
  image_url: string
  rendered_at: string
  preset: {
    id: string
    name: string
    status: string
    target_locales: string[]
    occasions: string[]
    poster_type: 'map' | 'star-map'
  }
  mockup_set: { id: string; name: string; slug: string } | null
}

interface MockupSetMeta { id: string; name: string; slug: string }

export function AdminRenderLibrary() {
  const { occasions: occasionsList } = useOccasions()
  const [renders, setRenders] = useState<RenderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [mockupSetsMeta, setMockupSetsMeta] = useState<MockupSetMeta[]>([])

  const [filterMockupSet, setFilterMockupSet] = useState<string>('all')
  const [filterVariant, setFilterVariant] = useState<'all' | 'desktop' | 'mobile'>('all')
  const [filterOccasion, setFilterOccasion] = useState<string>('all')
  const [filterLocale, setFilterLocale] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [lightbox, setLightbox] = useState<RenderItem | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const fetchRenders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterMockupSet !== 'all') params.set('mockup_set_id', filterMockupSet)
      if (filterVariant !== 'all') params.set('variant', filterVariant)
      if (filterOccasion !== 'all') params.set('occasion', filterOccasion)
      if (filterLocale !== 'all') params.set('locale', filterLocale)
      if (searchQuery.trim()) params.set('q', searchQuery.trim())

      const res = await fetch(`/api/admin/renders?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Laden fehlgeschlagen')
        return
      }
      setRenders(data.renders ?? [])
      setMockupSetsMeta(data.filters_meta?.mockup_sets ?? [])
    } finally {
      setLoading(false)
    }
  }, [filterMockupSet, filterVariant, filterOccasion, filterLocale, searchQuery])

  useEffect(() => { fetchRenders() }, [fetchRenders])

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success('URL in Zwischenablage'),
      () => toast.error('Konnte nicht kopieren'),
    )
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const deleteRenders = async (ids: string[]) => {
    if (ids.length === 0) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/renders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Löschen fehlgeschlagen')
        return
      }
      const n = data.deleted ?? ids.length
      toast.success(`${n} Render${n === 1 ? '' : 's'} gelöscht`)
      setSelected(new Set())
      setLightbox(null)
      await fetchRenders()
    } finally {
      setDeleting(false)
    }
  }

  const resetFilters = () => {
    setFilterMockupSet('all')
    setFilterVariant('all')
    setFilterOccasion('all')
    setFilterLocale('all')
    setSearchQuery('')
  }

  const hasActiveFilters =
    filterMockupSet !== 'all' || filterVariant !== 'all' ||
    filterOccasion !== 'all' || filterLocale !== 'all' || searchQuery.trim() !== ''

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Suche</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Preset-Name…"
                className="pl-8"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Mockup-Set</label>
            <select
              value={filterMockupSet}
              onChange={(e) => setFilterMockupSet(e.target.value)}
              className="block w-full h-9 px-2 rounded-md border border-border bg-background text-sm"
            >
              <option value="all">Alle</option>
              {mockupSetsMeta.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Variante</label>
            <select
              value={filterVariant}
              onChange={(e) => setFilterVariant(e.target.value as 'all' | 'desktop' | 'mobile')}
              className="block w-full h-9 px-2 rounded-md border border-border bg-background text-sm"
            >
              <option value="all">Alle</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Anlass</label>
            <select
              value={filterOccasion}
              onChange={(e) => setFilterOccasion(e.target.value)}
              className="block w-full h-9 px-2 rounded-md border border-border bg-background text-sm"
            >
              <option value="all">Alle</option>
              {occasionsList.map((o) => <option key={o.code} value={o.code}>{o.title}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mr-2">Locale</label>
              <select
                value={filterLocale}
                onChange={(e) => setFilterLocale(e.target.value)}
                className="h-8 px-2 rounded-md border border-border bg-background text-sm"
              >
                <option value="all">Alle</option>
                {LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l] ?? l}</option>)}
              </select>
            </div>
            <span className="text-sm text-muted-foreground">{renders.length} Render{renders.length === 1 ? '' : 's'}</span>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="w-3.5 h-3.5 mr-1" />
              Filter zurücksetzen
            </Button>
          )}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 bg-white rounded-lg border px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} ausgewählt</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Auswahl aufheben
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  {deleting
                    ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                  Löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {selected.size} Render{selected.size === 1 ? '' : 's'} löschen?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Die gerenderten Bilder werden dauerhaft aus der Library und dem Storage
                    entfernt. Die Presets selbst bleiben unverändert und können jederzeit neu
                    gerendert werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteRenders([...selected])}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          Lade…
        </div>
      )}

      {!loading && renders.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Keine Renders mit diesen Filtern.
        </div>
      )}

      {!loading && renders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {renders.map((r) => (
            <div
              key={r.id}
              className={`bg-white rounded-lg border overflow-hidden flex flex-col ${
                selected.has(r.id) ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <div className="relative">
                <button
                  onClick={() => setLightbox(r)}
                  className="relative aspect-square w-full bg-muted hover:opacity-80 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.image_url}
                    alt={`${r.preset.name} – ${r.mockup_set?.name ?? 'Mockup'} ${r.variant}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/90 backdrop-blur capitalize">
                    {r.variant}
                  </span>
                </button>
                <div className="absolute top-1.5 left-1.5">
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggleSelect(r.id)}
                    className="bg-white/90 border-muted-foreground/50 shadow-sm"
                    aria-label={`${r.preset.name} auswählen`}
                  />
                </div>
              </div>
              <div className="p-2 space-y-1.5 flex-1 flex flex-col">
                <div className="text-xs font-medium truncate" title={r.preset.name}>{r.preset.name}</div>
                <div className="text-[10px] text-muted-foreground truncate" title={r.mockup_set?.name ?? ''}>
                  {r.mockup_set?.name ?? '?'}
                </div>
                <div className="flex gap-1 mt-auto pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-7 text-[10px]"
                    onClick={() => copyUrl(r.image_url)}
                    title="Image-URL kopieren"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    URL
                  </Button>
                  <a
                    href={r.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:bg-muted"
                    title="In neuem Tab öffnen"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={lightbox !== null} onOpenChange={(open) => { if (!open) setLightbox(null) }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {lightbox?.preset.name} — {lightbox?.mockup_set?.name} ({lightbox?.variant})
            </DialogTitle>
          </DialogHeader>
          {lightbox && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.image_url}
                alt=""
                className="w-full max-h-[70vh] object-contain rounded-md bg-muted"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <code className="flex-1 px-2 py-1 bg-muted rounded font-mono break-all">{lightbox.image_url}</code>
                <Button size="sm" variant="outline" onClick={() => copyUrl(lightbox.image_url)}>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Kopieren
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" disabled={deleting}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Render löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dieses gerenderte Bild wird dauerhaft aus der Library und dem Storage
                        entfernt. Das Preset bleibt unverändert.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteRenders([lightbox.id])}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
