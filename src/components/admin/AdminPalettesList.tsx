'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { invalidateMapPalettesCache } from '@/hooks/useMapPalettes'
import type { MapPaletteColors } from '@/lib/map-palettes'

interface PaletteRow {
  id: string
  name: string
  description: string | null
  colors: MapPaletteColors
  status: 'draft' | 'published'
  display_order: number
  created_at: string
  updated_at: string
  published_at: string | null
}

const DEFAULT_COLORS: MapPaletteColors = {
  background: '#ffffff',
  land: '#eeeeee',
  water: '#a3c9e8',
  road: '#ffffff',
  building: '#d5d5d5',
  border: '#808080',
  label: '#2a2a2a',
  labelHalo: '#ffffff',
}

const COLOR_LABELS: { key: keyof MapPaletteColors; label: string }[] = [
  { key: 'background', label: 'Background' },
  { key: 'land', label: 'Land' },
  { key: 'water', label: 'Water' },
  { key: 'road', label: 'Road' },
  { key: 'building', label: 'Building' },
  { key: 'border', label: 'Border' },
  { key: 'label', label: 'Label' },
  { key: 'labelHalo', label: 'Label Halo' },
]

const HEX = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/
const SLUG = /^[a-z][a-z0-9-]*$/

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function AdminPalettesList() {
  const [palettes, setPalettes] = useState<PaletteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // form state
  const [formId, setFormId] = useState('')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formColors, setFormColors] = useState<MapPaletteColors>(DEFAULT_COLORS)
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(100)
  const [saving, setSaving] = useState(false)

  // delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<PaletteRow | null>(null)
  const [deleteReferencedBy, setDeleteReferencedBy] = useState<{ id: string; name: string }[] | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchPalettes = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/palettes')
    const data = await res.json()
    if (res.ok) setPalettes(data.palettes ?? [])
    else toast.error(data.error ?? 'Laden fehlgeschlagen')
    setLoading(false)
  }, [])

  useEffect(() => { fetchPalettes() }, [fetchPalettes])

  const openCreate = () => {
    setEditingId(null)
    setFormId('')
    setFormName('')
    setFormDescription('')
    setFormColors(DEFAULT_COLORS)
    setFormDisplayOrder(Math.max(0, ...palettes.map((p) => p.display_order)) + 1)
    setEditorOpen(true)
  }

  const openEdit = (p: PaletteRow) => {
    setEditingId(p.id)
    setFormId(p.id)
    setFormName(p.name)
    setFormDescription(p.description ?? '')
    setFormColors({ ...DEFAULT_COLORS, ...p.colors })
    setFormDisplayOrder(p.display_order)
    setEditorOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Name ist erforderlich')
      return
    }
    if (!editingId && !SLUG.test(formId)) {
      toast.error('ID muss mit Kleinbuchstaben beginnen, nur a–z, 0–9 und Bindestriche')
      return
    }
    for (const { key, label } of COLOR_LABELS) {
      if (!HEX.test(formColors[key])) {
        toast.error(`${label}: ungültiger Hex-Wert (${formColors[key]})`)
        return
      }
    }

    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/palettes/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || null,
            colors: formColors,
            display_order: formDisplayOrder,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Speichern fehlgeschlagen')
        toast.success('Palette aktualisiert')
      } else {
        const res = await fetch('/api/admin/palettes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: formId,
            name: formName.trim(),
            description: formDescription.trim() || undefined,
            colors: formColors,
            display_order: formDisplayOrder,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Anlegen fehlgeschlagen')
        toast.success('Palette als Draft angelegt')
      }
      invalidateMapPalettesCache()
      setEditorOpen(false)
      await fetchPalettes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (p: PaletteRow) => {
    const nextStatus = p.status === 'published' ? 'draft' : 'published'
    const res = await fetch(`/api/admin/palettes/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Statuswechsel fehlgeschlagen')
      return
    }
    toast.success(nextStatus === 'published' ? 'Veröffentlicht' : 'Zurückgezogen')
    invalidateMapPalettesCache()
    fetchPalettes()
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/palettes/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.status === 409) {
        const data = await res.json()
        setDeleteReferencedBy(data.referenced_by ?? [])
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Löschen fehlgeschlagen')
      }
      toast.success('Palette gelöscht')
      invalidateMapPalettesCache()
      setDeleteTarget(null)
      setDeleteReferencedBy(null)
      await fetchPalettes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Lade…' : `${palettes.length} Palette${palettes.length === 1 ? '' : 'n'}`}
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Neue Palette
        </Button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-muted-foreground/70">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : palettes.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Noch keine Paletten angelegt.</p>
      ) : (
        <div className="space-y-2">
          {palettes.map((p) => (
            <div key={p.id} className="bg-white border border-border rounded-md px-4 py-3 flex items-center gap-4">
              <div className="flex gap-1 flex-none">
                {COLOR_LABELS.map(({ key }) => (
                  <span
                    key={key}
                    className="w-5 h-5 rounded border border-black/10"
                    style={{ background: p.colors[key] }}
                    title={`${key}: ${p.colors[key]}`}
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{p.name}</span>
                  <Badge variant={p.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">
                    {p.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground/70">#{p.id}</span>
                </div>
                {p.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>}
              </div>
              <div className="flex gap-1 flex-none">
                <Button size="sm" variant="ghost" onClick={() => togglePublish(p)} title={p.status === 'published' ? 'Zurückziehen' : 'Veröffentlichen'}>
                  {p.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(p)} title="Bearbeiten">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(p)} title="Löschen">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Palette bearbeiten' : 'Neue Palette'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'ID ist fest und nicht änderbar.' : 'Nach Anlegen bleibt die ID unveränderlich.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pal-id">ID (Slug)</Label>
                <Input
                  id="pal-id"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  disabled={!!editingId || saving}
                  placeholder="z.B. herbst-rot"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pal-name">Name</Label>
                <Input
                  id="pal-name"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value)
                    if (!editingId && !formId) setFormId(slugify(e.target.value))
                  }}
                  disabled={saving}
                  placeholder="z.B. Herbstrot"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pal-description">Beschreibung</Label>
              <Textarea
                id="pal-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                disabled={saving}
                placeholder="Optional, für Admin-Tooltip"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pal-order">Reihenfolge</Label>
              <Input
                id="pal-order"
                type="number"
                value={formDisplayOrder}
                onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                disabled={saving}
              />
            </div>
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Farben (alle 8 erforderlich)</Label>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_LABELS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formColors[key]}
                      onChange={(e) => setFormColors((c) => ({ ...c, [key]: e.target.value }))}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                      disabled={saving}
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={`col-${key}`} className="text-[10px] text-muted-foreground">{label}</Label>
                      <Input
                        id={`col-${key}`}
                        value={formColors[key]}
                        onChange={(e) => setFormColors((c) => ({ ...c, [key]: e.target.value }))}
                        disabled={saving}
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              {saving ? 'Speichere…' : editingId ? 'Speichern' : 'Als Draft anlegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) { setDeleteTarget(null); setDeleteReferencedBy(null) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Palette löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteReferencedBy && deleteReferencedBy.length > 0 ? (
                <>
                  Diese Palette wird noch in {deleteReferencedBy.length} Preset{deleteReferencedBy.length === 1 ? '' : 's'} verwendet:
                  <ul className="mt-2 list-disc list-inside text-xs">
                    {deleteReferencedBy.map((p) => <li key={p.id}>{p.name}</li>)}
                  </ul>
                  Bitte zuerst die Presets auf eine andere Palette umstellen.
                </>
              ) : (
                <>
                  <strong>{deleteTarget?.name}</strong> wird endgültig entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            {(!deleteReferencedBy || deleteReferencedBy.length === 0) && (
              <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                {deleting ? 'Lösche…' : 'Löschen'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
