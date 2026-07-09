'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight, ChevronUp, Upload, X, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'

type PosterType = 'map' | 'star-map' | 'photo'
type Orientation = 'portrait' | 'landscape'

interface ListingImageSet {
  id: string
  slug: string
  name: string
  description: string | null
  poster_type: PosterType | null
  is_active: boolean
  items_count: number
}

type PaletteMode = 'main' | 'all' | 'compare'

interface ListingImageSetItem {
  id: string
  listing_image_set_id: string
  mockup_set_id: string
  annotation_portrait_url: string | null
  annotation_landscape_url: string | null
  label: string
  display_name: string
  display_order: number
  palette_mode: PaletteMode
}

interface MockupSetOption {
  id: string
  slug: string
  name: string
  provider: 'dynamic_mockups' | 'local'
}

const POSTER_TYPE_LABELS: Record<PosterType, string> = {
  map: 'Karten-Poster',
  'star-map': 'Sternenkarte',
  photo: 'Foto-Poster',
}

export function AdminListingImageSetsList() {
  const [sets, setSets] = useState<ListingImageSet[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null)
  const [itemsBySet, setItemsBySet] = useState<Record<string, ListingImageSetItem[]>>({})
  const [mockupSets, setMockupSets] = useState<MockupSetOption[]>([])

  // Create-Set form
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPosterType, setNewPosterType] = useState<PosterType | ''>('')
  const [creating, setCreating] = useState(false)

  const fetchSets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/listing-image-sets')
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Laden fehlgeschlagen')
        return
      }
      setSets(data.listing_image_sets ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMockupSets = useCallback(async () => {
    const res = await fetch('/api/admin/mockup-sets')
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      // PROJ-54 B: lokale UND DM-Mockups. Lokale werden direkt mit sharp
      // komponiert; DM-Mockups werden vom PROJ-53-Worker pro Palette
      // vorgerendert und dann aus preset_renders geladen.
      setMockupSets(data.mockup_sets ?? [])
    }
  }, [])

  useEffect(() => {
    fetchSets()
    fetchMockupSets()
  }, [fetchSets, fetchMockupSets])

  const fetchItems = useCallback(async (setId: string) => {
    const res = await fetch(`/api/admin/listing-image-sets/${setId}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? 'Items laden fehlgeschlagen')
      return
    }
    setItemsBySet((prev) => ({ ...prev, [setId]: data.items ?? [] }))
  }, [])

  const toggleExpand = (setId: string) => {
    if (expandedSetId === setId) {
      setExpandedSetId(null)
    } else {
      setExpandedSetId(setId)
      if (!itemsBySet[setId]) fetchItems(setId)
    }
  }

  const createSet = async () => {
    if (!newName.trim() || !newSlug.trim()) {
      toast.error('Name und Slug sind Pflicht')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/listing-image-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim(),
          description: newDescription.trim() || null,
          poster_type: newPosterType || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Anlegen fehlgeschlagen')
        return
      }
      toast.success('Set angelegt')
      setNewName('')
      setNewSlug('')
      setNewDescription('')
      setNewPosterType('')
      await fetchSets()
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (set: ListingImageSet) => {
    const res = await fetch(`/api/admin/listing-image-sets/${set.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !set.is_active }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Update fehlgeschlagen')
      return
    }
    setSets((prev) => prev.map((s) => (s.id === set.id ? { ...s, is_active: !s.is_active } : s)))
  }

  const deleteSet = async (setId: string) => {
    const res = await fetch(`/api/admin/listing-image-sets/${setId}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? 'Löschen fehlgeschlagen')
      return
    }
    toast.success('Set gelöscht')
    setExpandedSetId(null)
    await fetchSets()
  }

  return (
    <div className="space-y-6">
      {/* Create-Set form */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <h2 className="font-medium text-sm">Neues Listing-Image-Set</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="new-name" className="text-xs">Name *</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                if (!newSlug) setNewSlug(toSlug(e.target.value))
              }}
              placeholder="z. B. Stadtkarte Standard"
            />
          </div>
          <div>
            <Label htmlFor="new-slug" className="text-xs">Slug *</Label>
            <Input
              id="new-slug"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="stadtkarte-standard"
            />
          </div>
          <div>
            <Label htmlFor="new-type" className="text-xs">Produkttyp</Label>
            <select
              id="new-type"
              value={newPosterType}
              onChange={(e) => setNewPosterType(e.target.value as PosterType | '')}
              className="block w-full h-9 px-2 rounded-md border border-border bg-background text-sm"
            >
              <option value="">— universell —</option>
              <option value="map">Karten-Poster</option>
              <option value="star-map">Sternenkarte</option>
              <option value="photo">Foto-Poster</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="new-desc" className="text-xs">Beschreibung</Label>
            <Input
              id="new-desc"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="optional"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={createSet} disabled={creating} size="sm">
            {creating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            Anlegen
          </Button>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          Lade…
        </div>
      )}

      {!loading && sets.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground border rounded-lg bg-white">
          Noch keine Listing-Image-Sets. Leg oben das erste an.
        </div>
      )}

      {!loading && sets.length > 0 && (
        <ul className="space-y-2">
          {sets.map((set) => (
            <li key={set.id} className="bg-white rounded-lg border overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => toggleExpand(set.id)}
                  className="flex-1 flex items-center gap-3 text-left"
                  aria-expanded={expandedSetId === set.id}
                >
                  {expandedSetId === set.id ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium truncate">{set.name}</span>
                      <span className="text-xs text-muted-foreground">{set.slug}</span>
                      {set.poster_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{POSTER_TYPE_LABELS[set.poster_type]}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {set.items_count} Item{set.items_count === 1 ? '' : 's'}
                      {set.description ? ` · ${set.description}` : ''}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Switch checked={set.is_active} onCheckedChange={() => toggleActive(set)} aria-label="Aktiv-Status" />
                    <span className="text-xs text-muted-foreground">{set.is_active ? 'Aktiv' : 'Inaktiv'}</span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground/70 hover:text-red-600" title="Löschen">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Listing-Image-Set löschen?</AlertDialogTitle>
                        <AlertDialogDescription>„{set.name}" und alle {set.items_count} Items werden dauerhaft gelöscht.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSet(set.id)} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {expandedSetId === set.id && (
                <SetItemsEditor
                  set={set}
                  items={itemsBySet[set.id] ?? []}
                  mockupSets={mockupSets}
                  onRefresh={() => fetchItems(set.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Items-Editor (innerhalb eines aufgeklappten Sets) ────────────────────

interface ItemsEditorProps {
  set: ListingImageSet
  items: ListingImageSetItem[]
  mockupSets: MockupSetOption[]
  onRefresh: () => Promise<void>
}

function SetItemsEditor({ set, items, mockupSets, onRefresh }: ItemsEditorProps) {
  const [newMockupSetId, setNewMockupSetId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [adding, setAdding] = useState(false)

  const addItem = async () => {
    if (!newMockupSetId || !newLabel.trim() || !newDisplayName.trim()) {
      toast.error('Mockup-Set, Label und Display-Name sind Pflicht')
      return
    }
    setAdding(true)
    try {
      const res = await fetch(`/api/admin/listing-image-sets/${set.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockup_set_id: newMockupSetId,
          label: newLabel.trim(),
          display_name: newDisplayName.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Hinzufügen fehlgeschlagen')
        return
      }
      toast.success('Item hinzugefügt')
      setNewMockupSetId('')
      setNewLabel('')
      setNewDisplayName('')
      await onRefresh()
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="border-t bg-muted/30 p-4 space-y-4">
      {mockupSets.length === 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Es gibt aktuell keine Mockup-Sets. Bitte erst in Admin → Mockup-Sets welche anlegen.
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">Noch keine Items.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <SetItemRow
              key={item.id}
              setId={set.id}
              item={item}
              mockupSets={mockupSets}
              onRefresh={onRefresh}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
              onMove={async (dir) => {
                const targetIdx = dir === 'up' ? idx - 1 : idx + 1
                if (targetIdx < 0 || targetIdx >= items.length) return
                const target = items[targetIdx]
                const [r1, r2] = await Promise.all([
                  fetch(`/api/admin/listing-image-sets/${set.id}/items/${item.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ display_order: target.display_order }),
                  }),
                  fetch(`/api/admin/listing-image-sets/${set.id}/items/${target.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ display_order: item.display_order }),
                  }),
                ])
                if (!r1.ok || !r2.ok) {
                  toast.error('Reihenfolge konnte nicht geändert werden')
                  return
                }
                await onRefresh()
              }}
            />
          ))}
        </ul>
      )}

      {/* Add-item form */}
      {mockupSets.length > 0 && (
        <div className="bg-white rounded-md border p-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Neues Item hinzufügen</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              value={newMockupSetId}
              onChange={(e) => setNewMockupSetId(e.target.value)}
              className="block w-full h-9 px-2 rounded-md border border-border bg-background text-sm"
            >
              <option value="">— Mockup-Set wählen —</option>
              {mockupSets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.provider === 'dynamic_mockups' ? '[DM] ' : '[local] '}
                  {m.name} ({m.slug})
                </option>
              ))}
            </select>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (z. B. 01-hero)"
            />
            <Input
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder='Anzeige (z. B. "Hero ohne Pfeile")'
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={addItem} disabled={adding} size="sm" variant="outline">
              {adding ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              Item hinzufügen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Einzel-Item-Zeile inkl. Annotation-Upload ─────────────────────────────

interface SetItemRowProps {
  setId: string
  item: ListingImageSetItem
  mockupSets: MockupSetOption[]
  onRefresh: () => Promise<void>
  isFirst: boolean
  isLast: boolean
  onMove: (direction: 'up' | 'down') => Promise<void>
}

function SetItemRow({ setId, item, mockupSets, onRefresh, isFirst, isLast, onMove }: SetItemRowProps) {
  const mockupSet = mockupSets.find((m) => m.id === item.mockup_set_id)

  const removeItem = async () => {
    const res = await fetch(`/api/admin/listing-image-sets/${setId}/items/${item.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Löschen fehlgeschlagen')
      return
    }
    toast.success('Item entfernt')
    await onRefresh()
  }

  return (
    <li className="bg-white rounded-md border p-3 flex items-start gap-3">
      <div className="flex flex-col gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-foreground disabled:opacity-30"
          disabled={isFirst}
          onClick={() => onMove('up')}
          title="Nach oben"
          aria-label="Item nach oben verschieben"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-foreground disabled:opacity-30"
          disabled={isLast}
          onClick={() => onMove('down')}
          title="Nach unten"
          aria-label="Item nach unten verschieben"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      </div>
      <GripVertical className="w-4 h-4 mt-1 text-muted-foreground/30 hidden" aria-hidden />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <InlineEditableField
            value={item.label}
            placeholder="label"
            className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted"
            title="Label (Dateiname). Nur Kleinbuchstaben/Zahlen/Bindestriche."
            onSave={async (next) => {
              const res = await fetch(`/api/admin/listing-image-sets/${setId}/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: next }),
              })
              const d = await res.json().catch(() => ({}))
              if (!res.ok) {
                toast.error(d.error ?? 'Label-Update fehlgeschlagen')
                return false
              }
              toast.success('Label gespeichert')
              await onRefresh()
              return true
            }}
          />
          <InlineEditableField
            value={item.display_name}
            placeholder="Anzeige-Name"
            className="text-sm font-medium"
            title="Anzeige-Name für die Vorschau"
            onSave={async (next) => {
              const res = await fetch(`/api/admin/listing-image-sets/${setId}/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ display_name: next }),
              })
              const d = await res.json().catch(() => ({}))
              if (!res.ok) {
                toast.error(d.error ?? 'Name-Update fehlgeschlagen')
                return false
              }
              toast.success('Name gespeichert')
              await onRefresh()
              return true
            }}
          />
          <span className="text-xs text-muted-foreground">→ {mockupSet?.name ?? item.mockup_set_id}</span>
          <span className="text-[10px] text-muted-foreground/70">order: {item.display_order}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-[11px] text-muted-foreground" htmlFor={`pmode-${item.id}`}>Palette-Modus:</Label>
          <select
            id={`pmode-${item.id}`}
            value={item.palette_mode}
            onChange={async (e) => {
              const next = e.target.value as PaletteMode
              const res = await fetch(`/api/admin/listing-image-sets/${setId}/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ palette_mode: next }),
              })
              if (!res.ok) {
                const d = await res.json().catch(() => ({}))
                toast.error(d.error ?? 'Speichern fehlgeschlagen')
                return
              }
              toast.success(`Palette-Modus: ${next}`)
              await onRefresh()
            }}
            className="h-7 px-1.5 rounded-md border border-border bg-background text-xs"
            title="'main' = 1× in Haupt-Palette (Hero/Annotations); 'all' = 1× pro Palette (Variant-Bilder); 'compare' = 1× alle Paletten getilt"
          >
            <option value="main">Main (fixe Haupt-Palette)</option>
            <option value="all">Pro Palette (Variant-Bilder)</option>
            <option value="compare">Compare-Grid (alle Paletten in einem Bild)</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <AnnotationSlot
            setId={setId}
            itemId={item.id}
            itemLabel={item.label}
            orientation="portrait"
            currentUrl={item.annotation_portrait_url}
            onRefresh={onRefresh}
          />
          <AnnotationSlot
            setId={setId}
            itemId={item.id}
            itemLabel={item.label}
            orientation="landscape"
            currentUrl={item.annotation_landscape_url}
            onRefresh={onRefresh}
          />
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0 text-muted-foreground/70 hover:text-red-600" title="Item entfernen">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Item entfernen?</AlertDialogTitle>
            <AlertDialogDescription>„{item.display_name}" ({item.label}) wird aus diesem Listing-Image-Set entfernt.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={removeItem} className="bg-red-600 hover:bg-red-700">Entfernen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

// ─── Annotation-Upload-Slot (portrait/landscape pro Item) ──────────────────

interface AnnotationSlotProps {
  setId: string
  itemId: string
  itemLabel: string
  orientation: Orientation
  currentUrl: string | null
  onRefresh: () => Promise<void>
}

function AnnotationSlot({ setId, itemId, itemLabel, orientation, currentUrl, onRefresh }: AnnotationSlotProps) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      // 1. PNG hochladen → URL zurück
      const fd = new FormData()
      fd.append('file', file)
      fd.append('listing_image_set_id', setId)
      fd.append('item_label', itemLabel)
      fd.append('orientation', orientation)
      const upRes = await fetch('/api/admin/listing-image-sets/upload-annotation', {
        method: 'POST',
        body: fd,
      })
      const upData = await upRes.json()
      if (!upRes.ok) {
        toast.error(upData.error ?? 'Upload fehlgeschlagen')
        return
      }

      // 2. URL ins Item patchen
      const patchRes = await fetch(`/api/admin/listing-image-sets/${setId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [`annotation_${orientation}_url`]: upData.url,
        }),
      })
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}))
        toast.error(data.error ?? 'Verknüpfung fehlgeschlagen')
        return
      }
      toast.success(`Annotation (${orientation}) hochgeladen`)
      await onRefresh()
    } finally {
      setUploading(false)
    }
  }

  const handleClear = async () => {
    const res = await fetch(`/api/admin/listing-image-sets/${setId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [`annotation_${orientation}_url`]: null }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Entfernen fehlgeschlagen')
      return
    }
    toast.success(`Annotation (${orientation}) entfernt`)
    await onRefresh()
  }

  return (
    <div className="border rounded-md p-2 bg-muted/40">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{orientation}</span>
        {currentUrl && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-red-600" onClick={handleClear} title="Annotation entfernen">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      {currentUrl ? (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUrl} alt={`${itemLabel} ${orientation}`} className="w-12 h-16 object-contain bg-white border rounded" />
          <a href={currentUrl} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:underline truncate">
            Vorschau
          </a>
        </div>
      ) : (
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading ? 'Lade hoch…' : 'PNG hochladen'}
          <input
            type="file"
            accept="image/png"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleUpload(f)
              e.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}

// ─── Inline-Edit-Feld (klick zum bearbeiten, Enter/Blur speichert) ─────────

interface InlineEditableFieldProps {
  value: string
  placeholder?: string
  className?: string
  title?: string
  onSave: (next: string) => Promise<boolean>  // true = success, false = revert
}

function InlineEditableField({ value, placeholder, className, title, onSave }: InlineEditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  // Sync external value when not editing (e.g., refresh nach Save)
  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  const commit = async () => {
    const trimmed = draft.trim()
    if (trimmed === value || trimmed.length === 0) {
      setDraft(value)
      setEditing(false)
      return
    }
    const ok = await onSave(trimmed)
    if (!ok) setDraft(value)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title={title}
        className={`${className ?? ''} cursor-text hover:ring-1 hover:ring-border text-left`}
      >
        {value}
      </button>
    )
  }
  return (
    <input
      autoFocus
      type="text"
      value={draft}
      placeholder={placeholder}
      title={title}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      }}
      className={`${className ?? ''} ring-1 ring-border bg-white outline-none focus:ring-foreground/40`}
      style={{ minWidth: `${Math.max(8, draft.length + 1)}ch` }}
    />
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
