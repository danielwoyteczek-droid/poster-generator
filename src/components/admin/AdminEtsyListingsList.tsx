'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, Loader2, Plus, Rocket, Download, Trash2, RefreshCw } from 'lucide-react'
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

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    name: '', template_key: 'stadtkarte' as TemplateKey, base_preset_id: '',
    palette_ids: [] as string[], mockup_set_ids: [] as string[],
  })

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
    const anyActive = Object.values(statusByDef).some((s) => s.anyActive)
    if (!anyActive) return
    const t = setInterval(() => fetchStatus(defs), 4000)
    return () => clearInterval(t)
  }, [statusByDef, defs, fetchStatus])

  const createDef = async () => {
    if (!form.name.trim()) return toast.error('Name fehlt')
    if (!form.base_preset_id) return toast.error('Basis-Design (Preset) wählen')
    if (form.palette_ids.length === 0) return toast.error('Mindestens eine Palette wählen')
    const res = await fetch('/api/admin/etsy-listings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Listing-Definition angelegt')
      setDialogOpen(false)
      setForm({ name: '', template_key: 'stadtkarte', base_preset_id: '', palette_ids: [], mockup_set_ids: [] })
      fetchDefs()
    } else {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Anlegen fehlgeschlagen')
    }
  }

  const startRender = async (def: ListingDef) => {
    setBusyId(def.id)
    const res = await fetch(`/api/admin/etsy-listings/${def.id}/render`, { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    setBusyId(null)
    if (res.ok) {
      toast.success(`${j.created?.length ?? 0} neue Render-Jobs gestartet`, {
        description: j.skipped?.length ? `${j.skipped.length} bereits vorhanden` : undefined,
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
          <Button size="sm" onClick={() => setDialogOpen(true)}>
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
                    {st && st.total > 0 && (
                      <>
                        <span>·</span>
                        <span className={st.flatDone ? 'text-green-600' : st.anyActive ? 'text-amber-600' : ''}>
                          {st.anyActive && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
                          {st.doneCount}/{st.total} Looks gerendert
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Listing-Definition</DialogTitle>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={createDef}>Anlegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
