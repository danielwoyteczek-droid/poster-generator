'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { imageGeneratorApi, type PresetListItem } from '@/lib/image-generator/api'
import { POSTER_TYPE_LABELS } from './labels'

type TypeFilter = 'all' | PresetListItem['poster_type']

interface PresetPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (presetId: string) => void
}

export function PresetPickerDialog({ open, onOpenChange, onSelect }: PresetPickerDialogProps) {
  const [presets, setPresets] = useState<PresetListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  useEffect(() => {
    if (!open || presets) return
    imageGeneratorApi.listPresets().then(setPresets).catch((e: Error) => setError(e.message))
  }, [open, presets])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (presets ?? []).filter((p) =>
      (typeFilter === 'all' || p.poster_type === typeFilter) &&
      (!q || p.name.toLowerCase().includes(q)),
    )
  }, [presets, query, typeFilter])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Preset wählen</DialogTitle>
          <DialogDescription>Für welches Preset sollen Bilder entstehen?</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Preset suchen …"
              className="pl-8"
              aria-label="Preset suchen"
            />
          </div>
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="map">Karte</TabsTrigger>
              <TabsTrigger value="star-map">Sterne</TabsTrigger>
              <TabsTrigger value="photo">Foto</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-y-auto -mx-1 px-1 min-h-[200px]">
          {error ? (
            <p className="text-sm text-destructive py-10 text-center">{error}</p>
          ) : !presets ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Lade Presets …
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Keine Presets gefunden.</p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((p) => {
                const thumb = p.preview_image_url_a4 ?? p.preview_image_url
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => { onSelect(p.id); onOpenChange(false) }}
                      className="w-full text-left rounded-lg border bg-background hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden"
                    >
                      <div className="aspect-[3/4] bg-muted flex items-center justify-center">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" loading="lazy" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Kein Vorschaubild</span>
                        )}
                      </div>
                      <div className="p-2 space-y-1">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">{POSTER_TYPE_LABELS[p.poster_type]}</Badge>
                          {p.status !== 'published' && <Badge variant="outline" className="text-[10px]">Entwurf</Badge>}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
