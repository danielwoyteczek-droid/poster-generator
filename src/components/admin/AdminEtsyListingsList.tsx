'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, Loader2, Plus, Rocket, Download, Trash2, RefreshCw, MapPin, Play, Eye, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

type TemplateKey = 'stadtkarte' | 'herz' | 'sternenkarte'
const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  stadtkarte: 'Stadtkarte',
  herz: 'Herz-Stadtkarte',
  sternenkarte: 'Sternenkarte',
}

interface ListingDef {
  id: string
  name: string
  template_key: TemplateKey
  base_preset_id: string
  palette_ids: string[]
  mockup_set_ids: string[]
  status: 'draft' | 'published'
  created_at: string
  location_name?: string | null
  location_lat?: number | null
  location_lng?: number | null
  location_zoom?: number | null
}

interface GeoResult { place_name: string; center: [number, number] }

interface PreviewLook {
  paletteId: string
  paletteName: string
  status: string | null
  flatUrl: string | null
  mockups: string[]
}

interface Option { value: string; label: string }

interface DefStatus { doneCount: number; total: number; flatDone: boolean; anyActive: boolean }

// ─── Generisches Multi-Select (Pattern aus LocaleMultiSelect) ───────────────
function MultiSelect({
  value, onChange, options, placeholder,
}: { value: string[]; onChange: (n: string[]) => void; options: Option[]; placeholder: string }) {
  const [open, setOpen] = useState(false)
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const label = value.length === 0
    ? placeholder
    : options.filter((o) => value.includes(o.value)).map((o) => o.label).join(' · ')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="justify-between font-normal h-9 w-full">
          <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>{label}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1 w-72 max-h-72 overflow-auto">
        {options.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">Keine Einträge</div>}
        <ul className="space-y-0.5">
          {options.map((o) => {
            const checked = value.includes(o.value)
            return (
              <li key={o.value}>
                <button type="button" onClick={() => toggle(o.value)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left">
                  <span className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0',
                    checked ? 'bg-primary border-primary' : 'border-border')}>
                    {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                  </span>
                  <span className="text-foreground">{o.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

const SELECT_CLASS = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full'

export function AdminEtsyListingsList() {
  const [defs, setDefs] = useState<ListingDef[]>([])
  const [loading, setLoading] = useState(true)
  const [presets, setPresets] = useState<Option[]>([])
  const [palettes, setPalettes] = useState<Option[]>([])
  const [mockupSets, setMockupSets] = useState<Option[]>([])
  const [statusByDef, setStatusByDef] = useState<Record<string, DefStatus>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [workerStarting, setWorkerStarting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewName, setPreviewName] = useState('')
  const [previewLooks, setPreviewLooks] = useState<PreviewLook[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    name: '', template_key: 'stadtkarte' as TemplateKey, base_preset_id: '',
    palette_ids: [] as string[], mockup_set_ids: [] as string[],
    location_name: '' as string, location_lat: null as number | null,
    location_lng: null as number | null, location_zoom: 13 as number,
  })
  const [geoQuery, setGeoQuery] = useState('')
  const [geoResults, setGeoResults] = useState<GeoResult[]>([])
  const [geoLoading, setGeoLoading] = useState(false)

  const fetchDefs = useCallback(async () => {
    const res = await fetch('/api/admin/etsy-listings')
    const data = await res.json()
    if (res.ok) setDefs(data.defs ?? [])
    setLoading(false)
  }, [])

  const fetchOptions = useCallback(async () => {
    const [pRes, paRes, mRes] = await Promise.all([
      fetch('/api/admin/presets'),
      fetch('/api/admin/palettes?status=published'),
      fetch('/api/admin/mockup-sets'),
    ])
    const [p, pa, m] = await Promise.all([pRes.json(), paRes.json(), mRes.json()])
    if (pRes.ok) setPresets((p.presets ?? []).map((x: { id: string; name: string }) => ({ value: x.id, label: x.name })))
    if (paRes.ok) setPalettes((pa.palettes ?? []).map((x: { id: string; name: string }) => ({ value: x.id, label: x.name })))
    if (mRes.ok) setMockupSets((m.mockup_sets ?? []).map((x: { id: string; name: string }) => ({ value: x.id, label: x.name })))
  }, [])

  const fetchStatus = useCallback(async (defList: ListingDef[]) => {
    const entries = await Promise.all(defList.map(async (d) => {
      const res = await fetch(`/api/admin/etsy-listings/${d.id}/status`)
      if (!res.ok) return [d.id, { doneCount: 0, total: 0, flatDone: false, anyActive: false }] as const
      const data = await res.json()
      const looks: { flatStatus: string | null; overallStatus: string | null }[] = data.looks ?? []
      const doneCount = looks.filter((l) => l.flatStatus === 'done').length
      const anyActive = looks.some((l) =>
        ['pending', 'rendering'].includes(l.flatStatus ?? '') || ['pending', 'rendering'].includes(l.overallStatus ?? ''))
      return [d.id, { doneCount, total: looks.length, flatDone: !!data.flatDone, anyActive }] as const
    }))
    setStatusByDef(Object.fromEntries(entries))
  }, [])

  useEffect(() => { fetchDefs(); fetchOptions() }, [fetchDefs, fetchOptions])
  useEffect(() => { if (defs.length) fetchStatus(defs) }, [defs, fetchStatus])

  // Live-Polling, solange ein Look rendert
  useEffect(() => {
    const anyActive = Object.values(statusByDef).some((s) => s.anyActive && !s.flatDone)
    if (!anyActive) return
    const t = setInterval(() => fetchStatus(defs), 4000)
    return () => clearInterval(t)
  }, [statusByDef, defs, fetchStatus])

  const runGeocode = async () => {
    if (!geoQuery.trim()) return
    setGeoLoading(true)
    try {
      const res = await fetch(`/api/geocode?query=${encodeURIComponent(geoQuery.trim())}`)
      const data = await res.json()
      if (res.ok && Array.isArray(data)) setGeoResults(data)
      else { setGeoResults([]); toast.error(data?.error ?? 'Kein Ort gefunden') }
    } catch { toast.error('Geocoding fehlgeschlagen') } finally { setGeoLoading(false) }
  }

  const pickLocation = (r: GeoResult) => {
    setForm((f) => ({ ...f, location_name: r.place_name, location_lng: r.center[0], location_lat: r.center[1] }))
    setGeoResults([])
    setGeoQuery(r.place_name)
  }

  const resetForm = () => {
    setForm({
      name: '', template_key: 'stadtkarte', base_preset_id: '', palette_ids: [], mockup_set_ids: [],
      location_name: '', location_lat: null, location_lng: null, location_zoom: 13,
    })
    setGeoQuery(''); setGeoResults([]); setEditingId(null)
  }

  const openCreate = () => { resetForm(); setDialogOpen(true) }

  const openEdit = (def: ListingDef) => {
    setEditingId(def.id)
    setForm({
      name: def.name,
      template_key: def.template_key,
      base_preset_id: def.base_preset_id,
      palette_ids: def.palette_ids ?? [],
      mockup_set_ids: def.mockup_set_ids ?? [],
      location_name: def.location_name ?? '',
      location_lat: def.location_lat ?? null,
      location_lng: def.location_lng ?? null,
      location_zoom: def.location_zoom ?? 13,
    })
    setGeoQuery(def.location_name ?? '')
    setGeoResults([])
    setDialogOpen(true)
  }

  const saveDef = async () => {
    if (!form.name.trim()) return toast.error('Name fehlt')
    if (!form.base_preset_id) return toast.error('Basis-Design (Preset) wählen')
    if (form.palette_ids.length === 0) return toast.error('Mindestens eine Palette wählen')
    const hasLoc = form.location_lat != null && form.location_lng != null
    const body = {
      name: form.name, template_key: form.template_key, base_preset_id: form.base_preset_id,
      palette_ids: form.palette_ids, mockup_set_ids: form.mockup_set_ids,
      location_name: hasLoc ? form.location_name : null,
      location_lat: hasLoc ? form.location_lat : null,
      location_lng: hasLoc ? form.location_lng : null,
      // Zoom bewusst NICHT überschreiben — Render behält den Preset-Zoom 1:1.
      location_zoom: null,
    }
    const res = await fetch(
      editingId ? `/api/admin/etsy-listings/${editingId}` : '/api/admin/etsy-listings',
      { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    )
    if (res.ok) {
      toast.success(editingId ? 'Definition aktualisiert' : 'Listing-Definition angelegt')
      setDialogOpen(false)
      resetForm()
      fetchDefs()
    } else {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Speichern fehlgeschlagen')
    }
  }

  const triggerWorker = async () => {
    setWorkerStarting(true)
    try {
      const res = await fetch('/api/admin/render-worker/trigger', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Worker-Start fehlgeschlagen', { description: data.detail })
        return
      }
      toast.success('Worker gestartet — läuft ~5–25 Min', {
        description: data.runUrl ? 'Klick für Live-Logs auf GitHub' : undefined,
        action: data.runUrl
          ? { label: 'Run öffnen', onClick: () => window.open(data.runUrl, '_blank', 'noopener') }
          : undefined,
      })
    } catch {
      toast.error('Worker-Start fehlgeschlagen')
    } finally {
      setWorkerStarting(false)
    }
  }

  const openPreview = async (def: ListingDef) => {
    setPreviewOpen(true)
    setPreviewName(def.name)
    setPreviewLooks([])
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/admin/etsy-listings/${def.id}/images`)
      const data = await res.json()
      if (res.ok) setPreviewLooks(data.looks ?? [])
      else toast.error(data.error ?? 'Vorschau fehlgeschlagen')
    } catch {
      toast.error('Vorschau fehlgeschlagen')
    } finally {
      setPreviewLoading(false)
    }
  }

  const startRender = async (def: ListingDef) => {
    setBusyId(def.id)
    const res = await fetch(`/api/admin/etsy-listings/${def.id}/render`, { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    setBusyId(null)
    if (res.ok) {
      const n = (j.created?.length ?? 0) + (j.updated?.length ?? 0)
      toast.success(`${n} Render-Jobs gesetzt — jetzt „Worker starten"`, {
        description: j.updated?.length
          ? `${j.created?.length ?? 0} neu, ${j.updated.length} aktualisiert (Re-Render)`
          : undefined,
      })
      fetchStatus(defs)
    } else {
      toast.error(j.error ?? 'Render-Start fehlgeschlagen')
    }
  }

  const exportCsv = async (def: ListingDef) => {
    setBusyId(def.id)
    const res = await fetch(`/api/admin/etsy-listings/${def.id}/csv`)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'CSV-Export fehlgeschlagen', {
        description: Array.isArray(j.missing) ? j.missing.join(', ') : undefined,
      })
      setBusyId(null)
      return
    }
    const warnHeader = res.headers.get('X-Vela-Warnings')
    if (warnHeader) {
      try {
        const w = JSON.parse(decodeURIComponent(warnHeader)) as { longTitles: string[]; missingImages: string[] }
        if (w.longTitles?.length) toast.warning(`${w.longTitles.length} Titel > 140 Zeichen`)
        if (w.missingImages?.length) toast.warning(`${w.missingImages.length} fehlende Bilder`)
      } catch { /* ignore */ }
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vela-${def.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setBusyId(null)
    toast.success('Vela-CSV heruntergeladen')
  }

  const deleteDef = async (def: ListingDef) => {
    const res = await fetch(`/api/admin/etsy-listings/${def.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Gelöscht'); fetchDefs() }
    else toast.error('Löschen fehlgeschlagen')
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Master-Design + Paletten → Render-Jobs → import-fertige Vela-CSV.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchDefs(); fetchStatus(defs) }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Aktualisieren
          </Button>
          <Button variant="outline" size="sm" onClick={triggerWorker} disabled={workerStarting}
            title="Render-Worker via GitHub Actions starten (verarbeitet alle pending Renders)">
            {workerStarting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Worker starten
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Neue Definition
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Lädt…</div>
      ) : defs.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-8 text-center">
          Noch keine Listing-Definitionen. Lege die erste an.
        </div>
      ) : (
        <div className="space-y-3">
          {defs.map((def) => {
            const st = statusByDef[def.id]
            const busy = busyId === def.id
            return (
              <div key={def.id} className="border border-border rounded-lg p-4 bg-background flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{def.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2 items-center">
                    <Badge variant="secondary">{TEMPLATE_LABELS[def.template_key]}</Badge>
                    <span>{def.palette_ids.length} Paletten</span>
                    <span>·</span>
                    <span>{def.mockup_set_ids.length} Mockup-Sets</span>
                    {def.location_name && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{def.location_name}</span>
                      </>
                    )}
                    {st && st.total > 0 && (
                      <>
                        <span>·</span>
                        <button type="button" onClick={() => openPreview(def)}
                          title="Renders ansehen"
                          className={cn('inline-flex items-center gap-1 underline-offset-2 hover:underline',
                            st.flatDone ? 'text-green-600' : st.anyActive ? 'text-amber-600' : '')}>
                          {st.anyActive && !st.flatDone && <Loader2 className="w-3 h-3 animate-spin" />}
                          {st.doneCount}/{st.total} Looks gerendert
                          <Eye className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(def)}>
                    <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                  </Button>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => startRender(def)}>
                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                    Render starten
                  </Button>
                  <Button variant="outline" size="sm" disabled={busy || !st?.flatDone} onClick={() => exportCsv(def)}
                    title={st?.flatDone ? 'Vela-CSV exportieren' : 'Erst wenn alle Looks gerendert sind'}>
                    <Download className="w-4 h-4 mr-2" /> Vela-CSV
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Definition löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          „{def.name}" wird gelöscht. Bereits erzeugte Preset-Klone + Renders bleiben erhalten.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteDef(def)}>Löschen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Definition bearbeiten' : 'Neue Listing-Definition'}</DialogTitle>
            <DialogDescription>Ein Master-Design, das je gewählter Palette als eigenes Etsy-Listing ausgespielt wird.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="z. B. Stadtposter Skyline Minimal" />
            </div>
            <div className="space-y-1.5">
              <Label>Listing-Template</Label>
              <select className={SELECT_CLASS} value={form.template_key}
                onChange={(e) => setForm({ ...form, template_key: e.target.value as TemplateKey })}>
                {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map((k) => (
                  <option key={k} value={k}>{TEMPLATE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Basis-Design (Preset)</Label>
              <select className={SELECT_CLASS} value={form.base_preset_id}
                onChange={(e) => setForm({ ...form, base_preset_id: e.target.value })}>
                <option value="">— wählen —</option>
                {presets.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Farb-Looks (Paletten)</Label>
              <MultiSelect value={form.palette_ids} onChange={(v) => setForm({ ...form, palette_ids: v })}
                options={palettes} placeholder="Paletten wählen…" />
            </div>
            <div className="space-y-1.5">
              <Label>Mockup-Sets (gerahmt / lifestyle)</Label>
              <MultiSelect value={form.mockup_set_ids} onChange={(v) => setForm({ ...form, mockup_set_ids: v })}
                options={mockupSets} placeholder="Mockup-Sets wählen…" />
            </div>
            <div className="space-y-1.5">
              <Label>Ort (überschreibt das Preset — nur Kartenausschnitt)</Label>
              <div className="flex gap-2">
                <Input value={geoQuery} onChange={(e) => setGeoQuery(e.target.value)}
                  placeholder="Adresse oder Stadt, z. B. Frankfurt am Main"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runGeocode() } }} />
                <Button type="button" variant="outline" onClick={runGeocode} disabled={geoLoading}>
                  {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Suchen'}
                </Button>
              </div>
              {geoResults.length > 0 && (
                <ul className="border rounded-md divide-y max-h-40 overflow-auto">
                  {geoResults.map((r, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => pickLocation(r)}
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted">{r.place_name}</button>
                    </li>
                  ))}
                </ul>
              )}
              {form.location_lat != null && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{form.location_name} ({form.location_lat.toFixed(4)}, {form.location_lng?.toFixed(4)})</span>
                  <button type="button" className="underline shrink-0"
                    onClick={() => setForm((f) => ({ ...f, location_name: '', location_lat: null, location_lng: null }))}>
                    entfernen
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Leer lassen = Design rendert am Ort des Presets. Mit Ort wird die Karte nur neu zentriert — der Zoom/Ausschnitt bleibt exakt wie im Preset.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Abbrechen</Button>
            <Button onClick={saveDef}>{editingId ? 'Speichern' : 'Anlegen'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Vorschau — {previewName}</DialogTitle>
            <DialogDescription>Gerenderte Farb-Looks (flaches Poster + Mockups). Klick aufs Bild öffnet es in voller Größe.</DialogDescription>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Lädt…
            </div>
          ) : previewLooks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">Keine Renders gefunden.</div>
          ) : (
            <div className="space-y-6">
              {previewLooks.map((look) => (
                <div key={look.paletteId}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{look.paletteName}</Badge>
                    {look.status !== 'done' && (
                      <span className="text-xs text-amber-600">{look.status ?? 'offen'}</span>
                    )}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {look.flatUrl && (
                      <a href={look.flatUrl} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={look.flatUrl} alt={look.paletteName}
                          className="h-48 w-auto rounded border object-contain bg-muted" />
                      </a>
                    )}
                    {look.mockups.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`${look.paletteName} Mockup ${i + 1}`}
                          className="h-48 w-auto rounded border object-contain bg-muted" />
                      </a>
                    ))}
                    {!look.flatUrl && look.mockups.length === 0 && (
                      <span className="text-xs text-muted-foreground">noch keine Bilder</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
