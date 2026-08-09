'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2, RefreshCw, Image as ImageIcon, AlertTriangle, Download, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

interface SlotRect {
  x: number
  y: number
  width: number
  height: number
  canvasWidth: number
  canvasHeight: number
}

interface MockupSet {
  id: string
  slug: string
  name: string
  description: string | null
  provider: 'dynamic_mockups' | 'local'
  desktop_template_uuid: string | null
  desktop_smart_object_uuid: string | null
  mobile_template_uuid: string | null
  mobile_smart_object_uuid: string | null
  desktop_thumbnail_url: string | null
  mobile_thumbnail_url: string | null
  local_portrait_overlay_url: string | null
  local_portrait_slot: SlotRect | null
  local_landscape_overlay_url: string | null
  local_landscape_slot: SlotRect | null
  is_active: boolean
  version: number
}

interface DmMockupItem {
  uuid: string
  name: string
  thumbnail?: string
  smart_objects: { uuid: string; name?: string }[]
  already_imported: boolean
}

interface FormState {
  slug: string
  name: string
  description: string
  provider: 'dynamic_mockups' | 'local'
  // Dynamic-Mockups-Felder (nur bei provider='dynamic_mockups' relevant)
  desktop_template_uuid: string
  desktop_smart_object_uuid: string
  mobile_template_uuid: string
  mobile_smart_object_uuid: string
  // Local-Felder (nur bei provider='local' relevant)
  // Overlay-URLs werden vom upload-overlay-Endpoint zurückgegeben (Magenta-Auto
  // oder manuelles Slot-Rect). Im Edit-Mode kommen sie aus dem MockupSet.
  local_portrait_overlay_url: string
  local_portrait_slot: SlotRect | null
  local_landscape_overlay_url: string
  local_landscape_slot: SlotRect | null
}

const EMPTY_FORM: FormState = {
  slug: '',
  name: '',
  description: '',
  provider: 'dynamic_mockups',
  desktop_template_uuid: '',
  desktop_smart_object_uuid: '',
  mobile_template_uuid: '',
  mobile_smart_object_uuid: '',
  local_portrait_overlay_url: '',
  local_portrait_slot: null,
  local_landscape_overlay_url: '',
  local_landscape_slot: null,
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function AdminMockupSetsList() {
  const [mockupSets, setMockupSets] = useState<MockupSet[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<MockupSet | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MockupSet | null>(null)
  const [testRendering, setTestRendering] = useState<string | null>(null)
  const [uploadingOrientation, setUploadingOrientation] = useState<'portrait' | 'landscape' | null>(null)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [dmMockups, setDmMockups] = useState<DmMockupItem[] | null>(null)
  const [dmSelection, setDmSelection] = useState<Map<string, { name: string; slug: string; smart_object_uuid: string }>>(new Map())
  const [dmImporting, setDmImporting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/mockup-sets')
      const data = await res.json()
      if (res.ok) setMockupSets(data.mockup_sets ?? [])
      else toast.error(data.error ?? 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setCreating(true)
  }

  const openEdit = (m: MockupSet) => {
    setForm({
      slug: m.slug,
      name: m.name,
      description: m.description ?? '',
      provider: m.provider,
      desktop_template_uuid: m.desktop_template_uuid ?? '',
      desktop_smart_object_uuid: m.desktop_smart_object_uuid ?? '',
      mobile_template_uuid: m.mobile_template_uuid ?? '',
      mobile_smart_object_uuid: m.mobile_smart_object_uuid ?? '',
      local_portrait_overlay_url: m.local_portrait_overlay_url ?? '',
      local_portrait_slot: m.local_portrait_slot,
      local_landscape_overlay_url: m.local_landscape_overlay_url ?? '',
      local_landscape_slot: m.local_landscape_slot,
    })
    setEditTarget(m)
    setCreating(false)
  }

  const validateSlot = (orientation: 'Hochformat' | 'Querformat', slot: SlotRect): string | null => {
    const { x, y, width, height, canvasWidth, canvasHeight } = slot
    if ([x, y, width, height, canvasWidth, canvasHeight].some((n) => !Number.isInteger(n))) {
      return `${orientation}-Slot: alle Werte müssen Ganzzahlen sein`
    }
    if (x < 0 || y < 0) return `${orientation}-Slot: x/y dürfen nicht negativ sein`
    if (width <= 0 || height <= 0) return `${orientation}-Slot: width/height müssen > 0 sein`
    if (canvasWidth <= 0 || canvasHeight <= 0) return `${orientation}-Slot: canvas-Maße müssen > 0 sein`
    if (x + width > canvasWidth) return `${orientation}-Slot: ragt rechts aus dem Canvas`
    if (y + height > canvasHeight) return `${orientation}-Slot: ragt unten aus dem Canvas`
    return null
  }

  const validateForm = (): string | null => {
    if (!form.slug.trim()) return 'Slug fehlt'
    if (!/^[a-z0-9-]+$/.test(form.slug)) return 'Slug: nur Kleinbuchstaben, Zahlen, Bindestriche'
    if (!form.name.trim()) return 'Name fehlt'

    if (form.provider === 'dynamic_mockups') {
      // Desktop-Felder Pflicht; Mobile fällt auf Desktop zurück
      for (const field of ['desktop_template_uuid', 'desktop_smart_object_uuid'] as const) {
        const v = form[field]
        if (!v.trim()) return `${field}: Pflichtfeld`
        if (!UUID_REGEX.test(v.trim())) return `${field}: ungültiges UUID-Format`
      }
      for (const field of ['mobile_template_uuid', 'mobile_smart_object_uuid'] as const) {
        const v = form[field].trim()
        if (v && !UUID_REGEX.test(v)) return `${field}: ungültiges UUID-Format`
      }
      return null
    }

    // provider === 'local'
    const hasPortrait = form.local_portrait_overlay_url.trim() !== '' || form.local_portrait_slot !== null
    const hasLandscape = form.local_landscape_overlay_url.trim() !== '' || form.local_landscape_slot !== null
    if (!hasPortrait && !hasLandscape) {
      return 'Mindestens eine Orientierung (Hochformat oder Querformat) muss hochgeladen sein'
    }
    // Symmetrie: URL und Slot müssen je Orientierung beide gesetzt oder beide leer sein
    if (form.local_portrait_overlay_url.trim() !== '' && form.local_portrait_slot === null) {
      return 'Hochformat: Slot fehlt (Magenta-Auto fehlgeschlagen? Manuell eintragen)'
    }
    if (form.local_portrait_slot !== null && form.local_portrait_overlay_url.trim() === '') {
      return 'Hochformat: Overlay-PNG fehlt'
    }
    if (form.local_landscape_overlay_url.trim() !== '' && form.local_landscape_slot === null) {
      return 'Querformat: Slot fehlt (Magenta-Auto fehlgeschlagen? Manuell eintragen)'
    }
    if (form.local_landscape_slot !== null && form.local_landscape_overlay_url.trim() === '') {
      return 'Querformat: Overlay-PNG fehlt'
    }
    if (form.local_portrait_slot) {
      const err = validateSlot('Hochformat', form.local_portrait_slot)
      if (err) return err
    }
    if (form.local_landscape_slot) {
      const err = validateSlot('Querformat', form.local_landscape_slot)
      if (err) return err
    }
    return null
  }

  const submit = async () => {
    const err = validateForm()
    if (err) { toast.error(err); return }
    setSubmitting(true)
    try {
      const base = {
        slug: form.slug.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
      }
      let payload: Record<string, unknown>
      if (form.provider === 'dynamic_mockups') {
        // Mobile-Felder werden aktuell nicht gerendert (siehe render-worker:
        // nur Desktop-Variante aktiv). Trotzdem gespeichert für späteres
        // Re-Aktivieren — fallback auf Desktop-UUIDs wenn nicht eingetragen.
        const mobileTpl = form.mobile_template_uuid.trim() || form.desktop_template_uuid.trim()
        const mobileSO = form.mobile_smart_object_uuid.trim() || form.desktop_smart_object_uuid.trim()
        payload = {
          ...base,
          provider: 'dynamic_mockups',
          desktop_template_uuid: form.desktop_template_uuid.trim(),
          desktop_smart_object_uuid: form.desktop_smart_object_uuid.trim(),
          mobile_template_uuid: mobileTpl,
          mobile_smart_object_uuid: mobileSO,
        }
      } else {
        // Local: Overlays sind beim Save bereits in Storage (upload-overlay hat
        // sie hochgeladen, sobald der Admin die Datei ausgewählt hat). Hier
        // referenzieren wir nur die zurückgelieferten URLs + Slot-JSONs.
        payload = {
          ...base,
          provider: 'local',
          local_portrait_overlay_url: form.local_portrait_overlay_url.trim() || null,
          local_portrait_slot: form.local_portrait_slot,
          local_landscape_overlay_url: form.local_landscape_overlay_url.trim() || null,
          local_landscape_slot: form.local_landscape_slot,
        }
      }
      const url = editTarget ? `/api/admin/mockup-sets/${editTarget.id}` : '/api/admin/mockup-sets'
      const method = editTarget ? 'PATCH' : 'POST'
      // PATCH lehnt `provider` ab (Spec: Provider-Wechsel verboten). Im Edit-Mode
      // schicken wir nur die Felder mit, die für den jeweiligen Provider relevant
      // sind — `provider` selbst nicht.
      if (editTarget) delete (payload as { provider?: unknown }).provider
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Speichern fehlgeschlagen')
        return
      }
      toast.success(editTarget ? 'Mockup-Set aktualisiert' : 'Mockup-Set angelegt')
      setEditTarget(null)
      setCreating(false)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (m: MockupSet) => {
    const res = await fetch(`/api/admin/mockup-sets/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !m.is_active }),
    })
    if (res.ok) {
      toast.success(m.is_active ? 'Deaktiviert' : 'Aktiviert')
      load()
    } else {
      toast.error('Status-Wechsel fehlgeschlagen')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/mockup-sets/${deleteTarget.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? 'Löschen fehlgeschlagen')
      setDeleteTarget(null)
      return
    }
    toast.success('Mockup-Set gelöscht')
    setDeleteTarget(null)
    load()
  }

  const openDiscover = async () => {
    setDiscoverOpen(true)
    setDmMockups(null)
    setDmSelection(new Map())
    setDiscoverLoading(true)
    try {
      const res = await fetch('/api/admin/mockup-sets/discover')
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Konnte Mockups nicht abrufen')
        return
      }
      setDmMockups(data.mockups ?? [])
    } finally {
      setDiscoverLoading(false)
    }
  }

  const slugify = (s: string) =>
    s.toLowerCase()
      .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c] || c)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const toggleDmSelection = (m: DmMockupItem) => {
    setDmSelection((prev) => {
      const next = new Map(prev)
      if (next.has(m.uuid)) {
        next.delete(m.uuid)
      } else {
        next.set(m.uuid, {
          name: m.name,
          slug: slugify(m.name) || m.uuid.slice(0, 8),
          smart_object_uuid: m.smart_objects[0]?.uuid ?? '',
        })
      }
      return next
    })
  }

  const updateDmSelectionField = (uuid: string, field: 'name' | 'slug' | 'smart_object_uuid', value: string) => {
    setDmSelection((prev) => {
      const next = new Map(prev)
      const current = next.get(uuid)
      if (current) next.set(uuid, { ...current, [field]: value })
      return next
    })
  }

  const importDiscovered = async () => {
    if (dmSelection.size === 0) return
    setDmImporting(true)
    try {
      const imports = Array.from(dmSelection.entries()).map(([mockup_uuid, sel]) => {
        const dmItem = (dmMockups ?? []).find((m) => m.uuid === mockup_uuid)
        return {
          mockup_uuid,
          smart_object_uuid: sel.smart_object_uuid,
          // Alle Smart-Objects in der PSD als Slot-Liste mitschicken
          // (für Composition-Support bei Multi-Frame-Mockups)
          all_smart_object_uuids: dmItem?.smart_objects.map((so) => so.uuid) ?? [sel.smart_object_uuid],
          name: sel.name,
          slug: sel.slug,
        }
      })
      const res = await fetch('/api/admin/mockup-sets/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imports }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Import fehlgeschlagen')
        return
      }
      toast.success(`${data.created_count} Mockup-Set${data.created_count === 1 ? '' : 's'} importiert`)
      setDiscoverOpen(false)
      setDmSelection(new Map())
      load()
    } finally {
      setDmImporting(false)
    }
  }

  /**
   * Lädt ein Overlay-PNG zum upload-overlay-Endpoint hoch, der die Datei in
   * Supabase Storage ablegt und die Slot-Koordinaten zurückliefert.
   * Magenta-Marker wird serverseitig automatisch erkannt; ein optionales
   * slot_override wird mitgeschickt, wenn der Admin manuell überschrieben hat.
   */
  const handleOverlayUpload = async (
    orientation: 'portrait' | 'landscape',
    file: File | null | undefined,
    slotOverride?: { x: number; y: number; width: number; height: number },
  ) => {
    if (!file) return
    const slug = form.slug.trim()
    if (!slug) {
      toast.error('Slug muss vor dem Upload eingetragen sein')
      return
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error('Slug ungültig — nur Kleinbuchstaben, Zahlen, Bindestriche')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Overlay max. 5 MB')
      return
    }
    setUploadingOrientation(orientation)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slug', slug)
      fd.append('orientation', orientation)
      if (slotOverride) fd.append('slot_override', JSON.stringify(slotOverride))
      const res = await fetch('/api/admin/mockup-sets/upload-overlay', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Upload fehlgeschlagen')
        return
      }
      const urlKey = orientation === 'portrait' ? 'local_portrait_overlay_url' : 'local_landscape_overlay_url'
      const slotKey = orientation === 'portrait' ? 'local_portrait_slot' : 'local_landscape_slot'
      setForm((prev) => ({ ...prev, [urlKey]: data.url, [slotKey]: data.slot }))
      toast.success(`${orientation === 'portrait' ? 'Hochformat' : 'Querformat'} hochgeladen`)
    } catch (err) {
      toast.error('Upload-Fehler: ' + (err as Error).message)
    } finally {
      setUploadingOrientation(null)
    }
  }

  const clearOverlay = (orientation: 'portrait' | 'landscape') => {
    if (orientation === 'portrait') {
      setForm((prev) => ({ ...prev, local_portrait_overlay_url: '', local_portrait_slot: null }))
    } else {
      setForm((prev) => ({ ...prev, local_landscape_overlay_url: '', local_landscape_slot: null }))
    }
  }

  const runTestRender = async (m: MockupSet) => {
    setTestRendering(m.id)
    try {
      const res = await fetch(`/api/admin/mockup-sets/${m.id}/test-render`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Test-Render fehlgeschlagen', {
          description: data.failures?.map((f: { variant?: string; orientation?: string; message: string }) => `${f.variant ?? f.orientation}: ${f.message}`).join('\n'),
        })
        return
      }
      toast.success('Test-Render erfolgreich — Thumbnails aktualisiert')
      load()
    } finally {
      setTestRendering(null)
    }
  }

  const formOpen = creating || editTarget !== null

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={openDiscover}>
          <Download className="w-4 h-4 mr-1.5" />
          Aus Dynamic Mockups importieren
        </Button>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          Neues Mockup-Set
        </Button>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          Lade…
        </div>
      )}

      {!loading && mockupSets.length === 0 && (
        <div className="py-16 text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Noch keine Mockup-Sets angelegt.</p>
        </div>
      )}

      {!loading && mockupSets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockupSets.map((m) => (
            <div key={m.id} className={`rounded-lg border bg-white p-4 space-y-3 ${m.is_active ? '' : 'opacity-60'}`}>
              <div className="aspect-square bg-muted rounded-md overflow-hidden flex items-center justify-center">
                {m.desktop_thumbnail_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={m.desktop_thumbnail_url} alt={m.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-xs text-muted-foreground p-4">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                    Kein Thumbnail. Klick „Test-Render" um zu validieren.
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">{m.name}</h3>
                  <span
                    className={`shrink-0 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      m.provider === 'local'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                    title={m.provider === 'local' ? 'Lokal (sharp)' : 'Dynamic Mockups API'}
                  >
                    {m.provider === 'local' ? 'Lokal' : 'DM'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{m.slug} · v{m.version}</p>
                {m.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.description}</p>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openEdit(m)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Bearbeiten
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => runTestRender(m)} disabled={testRendering === m.id}>
                  {testRendering === m.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                  Test-Render
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toggleActive(m)}>
                  {m.is_active ? 'Deaktivieren' : 'Aktivieren'}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => setDeleteTarget(m)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setCreating(false); setEditTarget(null) } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Mockup-Set bearbeiten' : 'Neues Mockup-Set'}</DialogTitle>
            <DialogDescription>
              {form.provider === 'local'
                ? 'Lokales Overlay-PNG hochladen — Slot wird per Magenta-Marker automatisch erkannt.'
                : 'UUIDs aus dem „Use API"-Snippet im Dynamic-Mockups-Dashboard kopieren.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ms-slug">Slug</Label>
                <Input
                  id="ms-slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="wohnzimmer-holz"
                />
              </div>
              <div>
                <Label htmlFor="ms-name">Name</Label>
                <Input
                  id="ms-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Wohnzimmer Holzrahmen"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ms-desc">Beschreibung (optional)</Label>
              <Textarea
                id="ms-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Frontaler Holzrahmen über Sideboard…"
              />
            </div>

            <div>
              <Label className="text-xs">Provider</Label>
              <div className="flex gap-2 mt-1">
                {(['dynamic_mockups', 'local'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, provider: p })}
                    disabled={editTarget !== null && editTarget.provider !== p}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                      form.provider === p
                        ? p === 'local'
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                          : 'bg-sky-100 border-sky-400 text-sky-900'
                        : 'bg-white border-border text-muted-foreground hover:bg-muted'
                    } ${editTarget !== null && editTarget.provider !== p ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title={editTarget !== null && editTarget.provider !== p ? 'Provider-Wechsel verboten — Set löschen und neu anlegen' : undefined}
                  >
                    {p === 'local' ? 'Lokal (Overlay-PNG)' : 'Dynamic Mockups (API)'}
                  </button>
                ))}
              </div>
            </div>

            {form.provider === 'dynamic_mockups' && (
              <>
                <div className="space-y-2 p-3 rounded-md bg-muted">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Desktop-Variante</p>
                  <div>
                    <Label htmlFor="ms-d-tpl">mockup_uuid</Label>
                    <Input id="ms-d-tpl" value={form.desktop_template_uuid} onChange={(e) => setForm({ ...form, desktop_template_uuid: e.target.value })} className="font-mono text-xs" />
                  </div>
                  <div>
                    <Label htmlFor="ms-d-so">smart_objects[0].uuid</Label>
                    <Input id="ms-d-so" value={form.desktop_smart_object_uuid} onChange={(e) => setForm({ ...form, desktop_smart_object_uuid: e.target.value })} className="font-mono text-xs" />
                  </div>
                </div>
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground select-none">
                    Mobile-Variante (optional, aktuell nicht gerendert)
                  </summary>
                  <div className="space-y-2 p-3 mt-2 rounded-md bg-muted">
                    <p className="text-[10px] text-muted-foreground">
                      Aktuell rendert der Worker nur die Desktop-Variante (Mobile war redundant).
                      Felder bleiben für späteres Re-Aktivieren — leer lassen falls nicht benötigt,
                      fallback ist dann die Desktop-PSD.
                    </p>
                    <div>
                      <Label htmlFor="ms-m-tpl">mockup_uuid</Label>
                      <Input id="ms-m-tpl" value={form.mobile_template_uuid} onChange={(e) => setForm({ ...form, mobile_template_uuid: e.target.value })} className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label htmlFor="ms-m-so">smart_objects[0].uuid</Label>
                      <Input id="ms-m-so" value={form.mobile_smart_object_uuid} onChange={(e) => setForm({ ...form, mobile_smart_object_uuid: e.target.value })} className="font-mono text-xs" />
                    </div>
                  </div>
                </details>
              </>
            )}

            {form.provider === 'local' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['portrait', 'landscape'] as const).map((orientation) => {
                  const url = orientation === 'portrait' ? form.local_portrait_overlay_url : form.local_landscape_overlay_url
                  const slot = orientation === 'portrait' ? form.local_portrait_slot : form.local_landscape_slot
                  const isUploading = uploadingOrientation === orientation
                  const label = orientation === 'portrait' ? 'Hochformat' : 'Querformat'
                  return (
                    <div key={orientation} className="space-y-2 p-3 rounded-md bg-muted">
                      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
                      {url ? (
                        <div className="space-y-2">
                          <div className="aspect-square bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] rounded border border-border overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`${label}-Overlay`} className="w-full h-full object-contain" />
                          </div>
                          {slot && (
                            <p className="text-[10px] font-mono text-muted-foreground leading-tight">
                              Slot: {slot.x}/{slot.y} · {slot.width}×{slot.height}
                              <br />Canvas: {slot.canvasWidth}×{slot.canvasHeight}
                            </p>
                          )}
                          <div className="flex gap-1.5">
                            <label className="flex-1 cursor-pointer">
                              <input
                                type="file"
                                accept="image/png"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                  handleOverlayUpload(orientation, e.target.files?.[0])
                                  e.target.value = ''
                                }}
                              />
                              <span className="block text-center text-xs px-2 py-1.5 rounded border border-border bg-white hover:bg-muted/50">
                                {isUploading ? <Loader2 className="w-3 h-3 inline animate-spin" /> : 'Ersetzen'}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => clearOverlay(orientation)}
                              disabled={isUploading}
                              className="text-xs px-2 py-1.5 rounded text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="block cursor-pointer">
                          <input
                            type="file"
                            accept="image/png"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              handleOverlayUpload(orientation, e.target.files?.[0])
                              e.target.value = ''
                            }}
                          />
                          <div className={`aspect-square rounded border-2 border-dashed flex flex-col items-center justify-center p-3 text-center border-muted-foreground/40 hover:border-emerald-400 hover:bg-emerald-50/30`}>
                            {isUploading ? (
                              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                            ) : (
                              <>
                                <ImageIcon className="w-6 h-6 text-muted-foreground/50 mb-1" />
                                <p className="text-xs text-muted-foreground">PNG hochladen</p>
                                <p className="text-[10px] text-muted-foreground/70">max 5 MB · Magenta-Marker für Slot</p>
                                {!form.slug.trim() && (
                                  <p className="text-[10px] text-amber-700 mt-1">Erst Slug eintragen</p>
                                )}
                              </>
                            )}
                          </div>
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreating(false); setEditTarget(null) }}>Abbrechen</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editTarget ? 'Aktualisieren' : 'Anlegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discoverOpen} onOpenChange={(open) => { if (!open) { setDiscoverOpen(false); setDmSelection(new Map()) } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mockups aus Dynamic Mockups importieren</DialogTitle>
            <DialogDescription>
              Wähle Mockups aus deinem DM-Account, die als Mockup-Sets angelegt werden sollen.
              Bereits importierte sind ausgegraut.
            </DialogDescription>
          </DialogHeader>
          {discoverLoading && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Lade Mockups aus Dynamic Mockups…
            </div>
          )}
          {!discoverLoading && dmMockups !== null && dmMockups.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Keine Mockups im DM-Account gefunden. Lade zuerst eine PSD im DM-Dashboard hoch.
            </div>
          )}
          {!discoverLoading && dmMockups !== null && dmMockups.length > 0 && (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {dmMockups.map((m) => {
                const isSelected = dmSelection.has(m.uuid)
                const sel = dmSelection.get(m.uuid)
                const isDisabled = m.already_imported
                return (
                  <div
                    key={m.uuid}
                    className={`flex flex-col gap-2 p-3 rounded-md border ${isDisabled ? 'bg-muted opacity-60' : isSelected ? 'border-primary bg-primary/5' : 'bg-white hover:bg-muted/30'}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        onCheckedChange={() => !isDisabled && toggleDmSelection(m)}
                      />
                      {m.thumbnail && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={m.thumbnail} alt={m.name} className="w-16 h-16 object-cover rounded border border-border" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate flex items-center gap-2">
                          {m.name}
                          {isDisabled && <Check className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate">{m.uuid}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.smart_objects.length} Smart Object{m.smart_objects.length === 1 ? '' : 's'}
                          {isDisabled && ' · Bereits importiert'}
                        </div>
                      </div>
                    </div>
                    {isSelected && sel && (
                      <div className="grid grid-cols-2 gap-2 ml-7 mt-1">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={sel.name}
                            onChange={(e) => updateDmSelectionField(m.uuid, 'name', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Slug</Label>
                          <Input
                            value={sel.slug}
                            onChange={(e) => updateDmSelectionField(m.uuid, 'slug', e.target.value)}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        {m.smart_objects.length > 1 && (
                          <div className="col-span-2">
                            <Label className="text-xs">Smart Object</Label>
                            <select
                              value={sel.smart_object_uuid}
                              onChange={(e) => updateDmSelectionField(m.uuid, 'smart_object_uuid', e.target.value)}
                              className="block w-full h-8 text-xs px-2 rounded border border-border bg-background"
                            >
                              {m.smart_objects.map((so) => (
                                <option key={so.uuid} value={so.uuid}>
                                  {so.name ?? 'Unbenannt'} · {so.uuid.slice(0, 8)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscoverOpen(false)}>Abbrechen</Button>
            <Button onClick={importDiscovered} disabled={dmImporting || dmSelection.size === 0}>
              {dmImporting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {dmSelection.size} Mockup{dmSelection.size === 1 ? '' : 's'} importieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mockup-Set löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteTarget?.name}" wird endgültig entfernt. Bereits gerenderte Bilder bleiben in Storage,
              aber neue Renders mit diesem Set sind dann nicht mehr möglich.
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
