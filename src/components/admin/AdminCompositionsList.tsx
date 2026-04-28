'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Plus, Trash2, RefreshCw, Image as ImageIcon, AlertCircle, CheckCircle2, Clock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type RenderStatus = 'pending' | 'rendering' | 'done' | 'failed' | 'stale'

interface Composition {
  id: string
  name: string
  description: string | null
  mockup_set_id: string
  slot_preset_ids: string[]
  target_locales: string[]
  render_status: RenderStatus
  render_error: string | null
  desktop_image_url: string | null
  mobile_image_url: string | null
  status: 'draft' | 'published'
}

interface MockupSetMeta {
  id: string
  name: string
  slug: string
  desktop_slot_uuids: string[]
  mobile_slot_uuids: string[]
  is_active: boolean
}

interface PresetMeta {
  id: string
  name: string
  status: string
}

const RENDER_STATUS_CONFIG: Record<RenderStatus, { label: string; className: string; icon: typeof Loader2 }> = {
  pending: { label: 'In Queue', className: 'bg-yellow-100 text-yellow-900 border-yellow-300', icon: Clock },
  rendering: { label: 'Rendert…', className: 'bg-blue-100 text-blue-900 border-blue-300', icon: Loader2 },
  done: { label: 'Fertig', className: 'bg-green-100 text-green-900 border-green-300', icon: CheckCircle2 },
  failed: { label: 'Fehler', className: 'bg-red-100 text-red-900 border-red-300', icon: AlertCircle },
  stale: { label: 'Veraltet', className: 'bg-orange-100 text-orange-900 border-orange-300', icon: AlertCircle },
}

function StatusBadge({ status }: { status: RenderStatus }) {
  const cfg = RENDER_STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${cfg.className}`}>
      <Icon className={`w-3 h-3 ${status === 'rendering' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  )
}

export function AdminCompositionsList() {
  const [compositions, setCompositions] = useState<Composition[]>([])
  const [mockupSets, setMockupSets] = useState<MockupSetMeta[]>([])
  const [presets, setPresets] = useState<PresetMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Composition | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formMockupSetId, setFormMockupSetId] = useState('')
  const [formSlotPresetIds, setFormSlotPresetIds] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [compRes, msRes, prRes] = await Promise.all([
        fetch('/api/admin/compositions'),
        fetch('/api/admin/mockup-sets'),
        fetch('/api/admin/presets'),
      ])
      const [compData, msData, prData] = await Promise.all([
        compRes.json(),
        msRes.json(),
        prRes.json(),
      ])
      if (compRes.ok) setCompositions(compData.compositions ?? [])
      if (msRes.ok) setMockupSets(msData.mockup_sets ?? [])
      if (prRes.ok) setPresets((prData.presets ?? []).filter((p: PresetMeta) => p.status === 'published'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Live-Polling solange ein Render aktiv
  useEffect(() => {
    const hasActive = compositions.some((c) => c.render_status === 'pending' || c.render_status === 'rendering')
    if (!hasActive) return
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [compositions, load])

  const openCreate = () => {
    setFormName('')
    setFormDescription('')
    setFormMockupSetId('')
    setFormSlotPresetIds([])
    setCreateOpen(true)
  }

  const selectedMockupSet = mockupSets.find((m) => m.id === formMockupSetId)
  const slotCount = selectedMockupSet?.desktop_slot_uuids.length ?? 0

  const onMockupSetChange = (id: string) => {
    setFormMockupSetId(id)
    const ms = mockupSets.find((m) => m.id === id)
    setFormSlotPresetIds(Array((ms?.desktop_slot_uuids ?? []).length).fill(''))
  }

  const onSlotPresetChange = (slotIdx: number, presetId: string) => {
    setFormSlotPresetIds((prev) => prev.map((v, i) => (i === slotIdx ? presetId : v)))
  }

  const submit = async () => {
    if (!formName.trim()) { toast.error('Name fehlt'); return }
    if (!formMockupSetId) { toast.error('Mockup-Set wählen'); return }
    if (formSlotPresetIds.some((id) => !id)) { toast.error('Alle Slots benötigen ein Preset'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/compositions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          mockup_set_id: formMockupSetId,
          slot_preset_ids: formSlotPresetIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Speichern fehlgeschlagen')
        return
      }
      toast.success('Composition angelegt')
      setCreateOpen(false)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const triggerRender = async (c: Composition) => {
    const res = await fetch(`/api/admin/compositions/${c.id}/render`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Render-Trigger fehlgeschlagen')
      return
    }
    toast.success(`„${c.name}" in Render-Queue`)
    setCompositions((prev) => prev.map((x) => x.id === c.id ? { ...x, render_status: 'pending' as RenderStatus, render_error: null } : x))
  }

  const togglePublish = async (c: Composition) => {
    const newStatus = c.status === 'published' ? 'draft' : 'published'
    const res = await fetch(`/api/admin/compositions/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      toast.error('Status-Wechsel fehlgeschlagen')
      return
    }
    toast.success(newStatus === 'published' ? 'Veröffentlicht' : 'Zurückgezogen')
    load()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/compositions/${deleteTarget.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Löschen fehlgeschlagen')
      return
    }
    toast.success('Composition gelöscht')
    setDeleteTarget(null)
    load()
  }

  const presetMap = Object.fromEntries(presets.map((p) => [p.id, p]))
  const mockupSetMap = Object.fromEntries(mockupSets.map((m) => [m.id, m]))

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          Neue Composition
        </Button>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          Lade…
        </div>
      )}

      {!loading && compositions.length === 0 && (
        <div className="py-16 text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Noch keine Compositions. Voraussetzung: ein Mockup-Set mit mind. 2 Smart Objects in der PSD.
          </p>
        </div>
      )}

      {!loading && compositions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {compositions.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border p-4 space-y-3">
              <div className="aspect-square bg-muted rounded-md overflow-hidden flex items-center justify-center">
                {c.desktop_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={c.desktop_image_url} alt={c.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-xs text-muted-foreground p-4 text-center">
                    Noch nicht gerendert
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm flex-1 truncate">{c.name}</h3>
                  <StatusBadge status={c.render_status} />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {mockupSetMap[c.mockup_set_id]?.name ?? '?'} · {c.slot_preset_ids.length} Slots
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                  {c.slot_preset_ids.map((id) => presetMap[id]?.name ?? id.slice(0, 8)).join(' + ')}
                </p>
                {c.render_error && (
                  <p className="text-[10px] text-red-700 mt-1">{c.render_error}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => triggerRender(c)}
                  disabled={c.render_status === 'pending' || c.render_status === 'rendering'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${c.render_status === 'rendering' ? 'animate-spin' : ''}`} />
                  Rendern
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => togglePublish(c)}
                  disabled={c.render_status !== 'done'}
                  title={c.render_status !== 'done' ? 'Erst rendern, dann veröffentlichen' : undefined}
                >
                  {c.status === 'published' ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                  {c.status === 'published' ? 'Zurück' : 'Veröffentlichen'}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => setDeleteTarget(c)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Composition</DialogTitle>
            <DialogDescription>
              Mockup-Set wählen → pro Slot ein Preset zuweisen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div>
              <Label htmlFor="comp-name">Name</Label>
              <Input
                id="comp-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Diptychon Berlin & Hamburg"
              />
            </div>
            <div>
              <Label htmlFor="comp-desc">Beschreibung (optional)</Label>
              <Textarea
                id="comp-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="comp-ms">Mockup-Set</Label>
              <select
                id="comp-ms"
                value={formMockupSetId}
                onChange={(e) => onMockupSetChange(e.target.value)}
                className="block w-full h-9 px-2 rounded-md border border-border bg-background text-sm"
              >
                <option value="">Bitte wählen…</option>
                {mockupSets.filter((m) => m.is_active).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({(m.desktop_slot_uuids ?? []).length} Slot{(m.desktop_slot_uuids ?? []).length === 1 ? '' : 's'})
                  </option>
                ))}
              </select>
              {selectedMockupSet && slotCount === 1 && (
                <p className="text-[10px] text-amber-700 mt-1">
                  Nur 1 Slot — bei Single-Slot-Mockups solltest du eher direkt das Preset rendern, nicht via Composition.
                </p>
              )}
            </div>
            {selectedMockupSet && slotCount > 0 && (
              <div className="space-y-2 p-3 rounded-md bg-muted">
                <p className="text-xs font-medium uppercase text-muted-foreground">Slot-Belegung</p>
                {Array.from({ length: slotCount }).map((_, idx) => (
                  <div key={idx}>
                    <Label htmlFor={`slot-${idx}`}>Slot {idx + 1}</Label>
                    <select
                      id={`slot-${idx}`}
                      value={formSlotPresetIds[idx] ?? ''}
                      onChange={(e) => onSlotPresetChange(idx, e.target.value)}
                      className="block w-full h-9 px-2 rounded-md border border-border bg-background text-sm"
                    >
                      <option value="">Preset wählen…</option>
                      {presets.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Composition löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteTarget?.name}" wird endgültig gelöscht. Bereits gerenderte Bilder bleiben in Storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
