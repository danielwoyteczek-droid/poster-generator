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

interface MockupSet {
  id: string
  slug: string
  name: string
  description: string | null
  desktop_template_uuid: string
  desktop_smart_object_uuid: string
  mobile_template_uuid: string
  mobile_smart_object_uuid: string
  desktop_thumbnail_url: string | null
  mobile_thumbnail_url: string | null
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
  desktop_template_uuid: string
  desktop_smart_object_uuid: string
  mobile_template_uuid: string
  mobile_smart_object_uuid: string
}

const EMPTY_FORM: FormState = {
  slug: '',
  name: '',
  description: '',
  desktop_template_uuid: '',
  desktop_smart_object_uuid: '',
  mobile_template_uuid: '',
  mobile_smart_object_uuid: '',
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
      desktop_template_uuid: m.desktop_template_uuid,
      desktop_smart_object_uuid: m.desktop_smart_object_uuid,
      mobile_template_uuid: m.mobile_template_uuid,
      mobile_smart_object_uuid: m.mobile_smart_object_uuid,
    })
    setEditTarget(m)
    setCreating(false)
  }

  const validateForm = (): string | null => {
    if (!form.slug.trim()) return 'Slug fehlt'
    if (!/^[a-z0-9-]+$/.test(form.slug)) return 'Slug: nur Kleinbuchstaben, Zahlen, Bindestriche'
    if (!form.name.trim()) return 'Name fehlt'
    // Nur Desktop-Felder sind Pflicht; Mobile fällt auf Desktop zurück
    for (const field of ['desktop_template_uuid', 'desktop_smart_object_uuid'] as const) {
      const v = form[field]
      if (!v.trim()) return `${field}: Pflichtfeld`
      if (!UUID_REGEX.test(v.trim())) return `${field}: ungültiges UUID-Format`
    }
    // Mobile-Felder optional — falls eingetragen, müssen sie valide UUIDs sein
    for (const field of ['mobile_template_uuid', 'mobile_smart_object_uuid'] as const) {
      const v = form[field].trim()
      if (v && !UUID_REGEX.test(v)) return `${field}: ungültiges UUID-Format`
    }
    return null
  }

  const submit = async () => {
    const err = validateForm()
    if (err) { toast.error(err); return }
    setSubmitting(true)
    try {
      // Mobile-Felder werden aktuell nicht gerendert (siehe render-worker:
      // nur Desktop-Variante aktiv). Trotzdem gespeichert für späteres
      // Re-Aktivieren — fallback auf Desktop-UUIDs wenn nicht eingetragen.
      const mobileTpl = form.mobile_template_uuid.trim() || form.desktop_template_uuid.trim()
      const mobileSO = form.mobile_smart_object_uuid.trim() || form.desktop_smart_object_uuid.trim()
      const payload = {
        slug: form.slug.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        desktop_template_uuid: form.desktop_template_uuid.trim(),
        desktop_smart_object_uuid: form.desktop_smart_object_uuid.trim(),
        mobile_template_uuid: mobileTpl,
        mobile_smart_object_uuid: mobileSO,
      }
      const url = editTarget ? `/api/admin/mockup-sets/${editTarget.id}` : '/api/admin/mockup-sets'
      const method = editTarget ? 'PATCH' : 'POST'
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

  const runTestRender = async (m: MockupSet) => {
    setTestRendering(m.id)
    try {
      const res = await fetch(`/api/admin/mockup-sets/${m.id}/test-render`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Test-Render fehlgeschlagen', {
          description: data.failures?.map((f: { variant: string; message: string }) => `${f.variant}: ${f.message}`).join('\n'),
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
                <h3 className="font-semibold text-sm truncate">{m.name}</h3>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Mockup-Set bearbeiten' : 'Neues Mockup-Set'}</DialogTitle>
            <DialogDescription>
              UUIDs aus dem „Use API"-Snippet im Dynamic-Mockups-Dashboard kopieren.
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
