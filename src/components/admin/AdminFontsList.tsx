'use client'

/**
 * PROJ-47: Admin-Font-Verwaltung — Admin list + editor.
 *
 * Pattern follows PROJ-22 (AdminPalettesList) and PROJ-35 (AdminMasksList):
 *  - GET /api/admin/fonts on mount, render rows
 *  - "Neuer Font" opens a dialog with metadata + 1..n style-slot uploads
 *  - "Bearbeiten" reuses the same dialog but with metadata editable and a
 *    style-list section that supports per-style delete + add-more
 *  - "Veröffentlichen / Zurückziehen" toggle and Delete-AlertDialog with the
 *    409-blocked-by-references list
 *
 * The preview strip rendered next to each row uses the live FontFace
 * registration (registerFonts in fonts-loader). Drafts are registered too
 * so the admin sees how an unpublished font would look before publishing.
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  FONT_CATEGORIES,
  FONT_CATEGORY_LABELS,
  FONT_PREVIEW_TEXT,
  FONT_WEIGHTS,
  FONT_WEIGHT_LABELS,
  SLUG_REGEX,
  slugifyFamilyName,
  type Font,
  type FontCategory,
  type FontStyleSpec,
  type FontWeight,
} from '@/lib/fonts'
import { registerFonts } from '@/lib/fonts-loader'
import { invalidateFontsCache } from '@/hooks/useFonts'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPTED_EXT = ['.woff2', '.ttf', '.otf']

interface StyleSlot {
  /** Existing style id from the DB (when editing); null for new local slots. */
  serverId: string | null
  weight: FontWeight
  style: FontStyleSpec
  /** Locally selected file pending upload; null when slot already on server. */
  file: File | null
  /** Original filename when the slot was loaded from the server. */
  existingFilename: string | null
}

interface ReferencingItem {
  id: string
  name: string
  kind: 'preset' | 'project'
}

function fileSizeLabel(file: File | null, bytes: number | null | undefined): string {
  const v = file?.size ?? bytes ?? null
  if (v == null) return ''
  if (v < 1024) return `${v} B`
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`
  return `${(v / (1024 * 1024)).toFixed(2)} MB`
}

function validateFile(file: File): string | null {
  const name = file.name.toLowerCase()
  if (!ACCEPTED_EXT.some((ext) => name.endsWith(ext))) {
    return 'Nur .woff2 / .ttf / .otf akzeptiert'
  }
  if (file.size > MAX_BYTES) {
    return 'Datei zu groß (max 2 MB)'
  }
  return null
}

export function AdminFontsList() {
  const [fonts, setFonts] = useState<Font[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formId, setFormId] = useState('')
  const [formFamilyName, setFormFamilyName] = useState('')
  const [formCategory, setFormCategory] = useState<FontCategory>('serif')
  const [formDescription, setFormDescription] = useState('')
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(100)
  const [formStyles, setFormStyles] = useState<StyleSlot[]>([])
  const [saving, setSaving] = useState(false)

  // Per-row in-flight flag (publish toggle)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Font | null>(null)
  const [deleteBlockedBy, setDeleteBlockedBy] = useState<ReferencingItem[] | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchFonts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/fonts')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Laden fehlgeschlagen')
      const list: Font[] = data.fonts ?? []
      setFonts(list)
      // Register all FontFace records so preview strips render with the
      // actual font, including drafts.
      registerFonts(list).catch(() => undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFonts()
  }, [fetchFonts])

  const openCreate = () => {
    setEditingId(null)
    setFormId('')
    setFormFamilyName('')
    setFormCategory('serif')
    setFormDescription('')
    setFormDisplayOrder(Math.max(0, ...fonts.map((f) => f.display_order)) + 10)
    setFormStyles([{ serverId: null, weight: 400, style: 'normal', file: null, existingFilename: null }])
    setEditorOpen(true)
  }

  const openEdit = (font: Font) => {
    setEditingId(font.id)
    setFormId(font.id)
    setFormFamilyName(font.family_name)
    setFormCategory(font.category)
    setFormDescription(font.description ?? '')
    setFormDisplayOrder(font.display_order)
    setFormStyles(
      font.styles.map((s) => ({
        serverId: s.id,
        weight: s.weight,
        style: s.style,
        file: null,
        existingFilename: s.url.split('/').pop() ?? null,
      })),
    )
    setEditorOpen(true)
  }

  const addStyleSlot = () => {
    setFormStyles((prev) => [
      ...prev,
      { serverId: null, weight: 400, style: 'normal', file: null, existingFilename: null },
    ])
  }

  const removeStyleSlot = (index: number) => {
    setFormStyles((prev) => prev.filter((_, i) => i !== index))
  }

  const updateSlot = (index: number, patch: Partial<StyleSlot>) => {
    setFormStyles((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const handleSlotFile = (index: number, file: File | null) => {
    if (file) {
      const err = validateFile(file)
      if (err) {
        toast.error(err)
        return
      }
    }
    updateSlot(index, { file })
  }

  /**
   * Save: Create-Mode posts one multipart form containing every style slot;
   * Edit-Mode patches metadata, then uploads any *new* style slots via the
   * single-style endpoint. Server-side deletes for removed slots happen
   * eagerly when the user clicks the slot-X — we don't batch that here.
   */
  const handleSave = async () => {
    if (!formFamilyName.trim()) {
      toast.error('Family-Name ist erforderlich')
      return
    }
    if (!editingId && !SLUG_REGEX.test(formId)) {
      toast.error('ID muss mit Kleinbuchstaben beginnen, nur a–z, 0–9 und Bindestriche')
      return
    }
    if (formStyles.length === 0) {
      toast.error('Mindestens ein Schnitt erforderlich')
      return
    }
    // Validate duplicates among local slots
    const seen = new Set<string>()
    for (const s of formStyles) {
      const key = `${s.weight}-${s.style}`
      if (seen.has(key)) {
        toast.error(`Schnitt ${FONT_WEIGHT_LABELS[s.weight]} ${s.style} doppelt vorhanden`)
        return
      }
      seen.add(key)
    }
    // In create mode, every slot needs a file. In edit mode, only new slots
    // (serverId === null) need a file.
    for (const s of formStyles) {
      if (!s.serverId && !s.file) {
        toast.error(`Schnitt ${FONT_WEIGHT_LABELS[s.weight]} ${s.style} braucht eine Datei`)
        return
      }
    }

    setSaving(true)
    try {
      if (editingId) {
        // Patch metadata — family_name is intentionally omitted: it's
        // read-only after creation (renaming would break customer designs
        // that reference the family name verbatim in their config_json).
        const patchRes = await fetch(`/api/admin/fonts/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: formCategory,
            description: formDescription.trim() || null,
            display_order: formDisplayOrder,
          }),
        })
        const patchData = await patchRes.json().catch(() => ({}))
        if (!patchRes.ok) throw new Error(patchData.error ?? 'Speichern fehlgeschlagen')

        // Upload any pending-new style slots
        const newSlots = formStyles.filter((s) => !s.serverId && s.file)
        for (const slot of newSlots) {
          const fd = new FormData()
          fd.append('file', slot.file as File)
          fd.append('weight', String(slot.weight))
          fd.append('style', slot.style)
          const r = await fetch(`/api/admin/fonts/${editingId}/styles`, { method: 'POST', body: fd })
          const rd = await r.json().catch(() => ({}))
          if (!r.ok) throw new Error(rd.error ?? `Schnitt ${slot.weight}/${slot.style} fehlgeschlagen`)
        }
        toast.success('Font aktualisiert')
      } else {
        // Create — multipart with all slots in one go
        const fd = new FormData()
        fd.append('id', formId)
        fd.append('family_name', formFamilyName.trim())
        fd.append('category', formCategory)
        if (formDescription.trim()) fd.append('description', formDescription.trim())
        fd.append('display_order', String(formDisplayOrder))
        fd.append('styles_count', String(formStyles.length))
        formStyles.forEach((slot, i) => {
          fd.append(`style_${i}_file`, slot.file as File)
          fd.append(`style_${i}_weight`, String(slot.weight))
          fd.append(`style_${i}_style`, slot.style)
        })
        const res = await fetch('/api/admin/fonts', { method: 'POST', body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? 'Anlegen fehlgeschlagen')
        toast.success('Font als Draft angelegt')
      }

      invalidateFontsCache()
      setEditorOpen(false)
      await fetchFonts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteServerStyle = async (fontId: string, slotIndex: number) => {
    const slot = formStyles[slotIndex]
    if (!slot?.serverId) {
      // Pure local slot — just drop it
      removeStyleSlot(slotIndex)
      return
    }
    if (formStyles.length === 1) {
      toast.error('Letzten Schnitt nicht löschen — Font hätte sonst keine Datei mehr')
      return
    }
    try {
      const res = await fetch(`/api/admin/fonts/${fontId}/styles/${slot.serverId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Löschen fehlgeschlagen')
      }
      removeStyleSlot(slotIndex)
      invalidateFontsCache()
      toast.success('Schnitt gelöscht')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
    }
  }

  const togglePublish = async (font: Font) => {
    const nextStatus = font.status === 'published' ? 'draft' : 'published'
    setBusyId(font.id)
    try {
      const res = await fetch(`/api/admin/fonts/${font.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) {
        // Unpublishing blocked by references
        toast.error(data.error ?? 'Font wird in Presets/Projekten verwendet')
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Statuswechsel fehlgeschlagen')
      toast.success(nextStatus === 'published' ? 'Veröffentlicht' : 'Zurückgezogen')
      invalidateFontsCache()
      await fetchFonts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/fonts/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.status === 409) {
        const data = await res.json()
        const blocked: ReferencingItem[] = [
          ...(data.blockedBy?.presets ?? []).map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
            kind: 'preset' as const,
          })),
          ...(data.blockedBy?.projects ?? []).map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
            kind: 'project' as const,
          })),
        ]
        setDeleteBlockedBy(blocked)
        return
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Löschen fehlgeschlagen')
      }
      toast.success('Font gelöscht')
      invalidateFontsCache()
      setDeleteTarget(null)
      setDeleteBlockedBy(null)
      await fetchFonts()
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
          {loading ? 'Lade…' : `${fonts.length} Font${fonts.length === 1 ? '' : 's'}`}
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Neuer Font
        </Button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-muted-foreground/70">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : fonts.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Noch keine Fonts in der Datenbank. Im Editor werden die hartkodierten Fallback-Fonts angezeigt, bis hier welche veröffentlicht sind.
        </p>
      ) : (
        <div className="space-y-2">
          {fonts.map((font) => (
            <div key={font.id} className="bg-white border border-border rounded-md px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div
                  className="text-2xl text-foreground truncate"
                  style={{ fontFamily: `"${font.family_name}", system-ui, sans-serif` }}
                  title={FONT_PREVIEW_TEXT}
                >
                  {FONT_PREVIEW_TEXT}
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-medium text-foreground">{font.family_name}</span>
                  <span className="text-muted-foreground/70">#{font.id}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {FONT_CATEGORY_LABELS[font.category]}
                  </Badge>
                  <Badge variant={font.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">
                    {font.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {font.styles
                      .map((s) => `${FONT_WEIGHT_LABELS[s.weight]}${s.style === 'italic' ? ' Italic' : ''}`)
                      .join(' · ')}
                  </span>
                  <span className="text-muted-foreground/60">Order {font.display_order}</span>
                </div>
                {font.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{font.description}</p>
                )}
              </div>
              <div className="flex gap-1 flex-none">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => togglePublish(font)}
                  disabled={busyId === font.id}
                  title={font.status === 'published' ? 'Zurückziehen' : 'Veröffentlichen'}
                >
                  {busyId === font.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : font.status === 'published' ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(font)} title="Bearbeiten">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(font)} title="Löschen">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={(v) => !saving && setEditorOpen(v)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Font bearbeiten' : 'Neuen Font anlegen'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Slug ist fest. Schnitte können einzeln ergänzt oder entfernt werden.'
                : 'Lege Family + Kategorie fest und lade mindestens einen Schnitt hoch (.woff2 / .ttf / .otf, max 2 MB).'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="font-id">ID (Slug)</Label>
                <Input
                  id="font-id"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  disabled={!!editingId || saving}
                  placeholder="z.B. allura-script"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="font-family">Family-Name</Label>
                <Input
                  id="font-family"
                  value={formFamilyName}
                  onChange={(e) => {
                    setFormFamilyName(e.target.value)
                    if (!editingId && !formId) setFormId(slugifyFamilyName(e.target.value))
                  }}
                  disabled={!!editingId || saving}
                  placeholder="z.B. Allura Script"
                />
                {editingId && (
                  <p className="text-[10px] text-muted-foreground/70">
                    Family-Name ist fest. Customer-Designs und Presets referenzieren ihn als String — Umbenennen würde Bestands-Designs brechen.
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="font-category">Kategorie</Label>
                <Select
                  value={formCategory}
                  onValueChange={(v) => setFormCategory(v as FontCategory)}
                  disabled={saving}
                >
                  <SelectTrigger id="font-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {FONT_CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="font-order">Reihenfolge</Label>
                <Input
                  id="font-order"
                  type="number"
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="font-desc">Beschreibung</Label>
              <Textarea
                id="font-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                disabled={saving}
                placeholder="Optional, nur Admin-intern"
              />
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">Schnitte ({formStyles.length})</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStyleSlot} disabled={saving}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Schnitt hinzufügen
                </Button>
              </div>
              <div className="space-y-2">
                {formStyles.map((slot, i) => (
                  <div key={i} className="grid grid-cols-[1fr,140px,120px,32px] gap-2 items-end border border-border rounded-md p-2 bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Datei</Label>
                      {slot.serverId && !slot.file ? (
                        <div className="text-xs text-muted-foreground truncate" title={slot.existingFilename ?? undefined}>
                          {slot.existingFilename ?? 'Hochgeladen'}
                        </div>
                      ) : (
                        <Input
                          type="file"
                          accept=".woff2,.ttf,.otf"
                          onChange={(e) => handleSlotFile(i, e.target.files?.[0] ?? null)}
                          disabled={saving}
                          className="h-8 text-xs"
                        />
                      )}
                      {slot.file && (
                        <p className="text-[10px] text-muted-foreground">
                          {slot.file.name} · {fileSizeLabel(slot.file, null)}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Weight</Label>
                      <Select
                        value={String(slot.weight)}
                        onValueChange={(v) => updateSlot(i, { weight: Number(v) as FontWeight })}
                        disabled={saving || !!slot.serverId}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_WEIGHTS.map((w) => (
                            <SelectItem key={w} value={String(w)}>
                              {w} · {FONT_WEIGHT_LABELS[w]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Style</Label>
                      <Select
                        value={slot.style}
                        onValueChange={(v) => updateSlot(i, { style: v as FontStyleSpec })}
                        disabled={saving || !!slot.serverId}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">normal</SelectItem>
                          <SelectItem value="italic">italic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => (editingId && slot.serverId ? handleDeleteServerStyle(editingId, i) : removeStyleSlot(i))}
                      disabled={saving || formStyles.length <= 1}
                      title={slot.serverId ? 'Schnitt löschen (sofort)' : 'Slot entfernen'}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-2">
                .woff2 / .ttf / .otf · max 2 MB · pro Family ist jede Weight+Style-Kombi nur einmal erlaubt.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              {saving ? 'Speichere…' : editingId ? 'Speichern' : 'Als Draft anlegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteTarget(null)
            setDeleteBlockedBy(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Font löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteBlockedBy && deleteBlockedBy.length > 0 ? (
                <>
                  Dieser Font wird noch verwendet:
                  <ul className="mt-2 list-disc list-inside text-xs">
                    {deleteBlockedBy.map((r) => (
                      <li key={`${r.kind}-${r.id}`}>
                        <span className="text-muted-foreground">[{r.kind}]</span> {r.name}
                      </li>
                    ))}
                  </ul>
                  Bitte erst die Referenzen auf einen anderen Font umstellen.
                </>
              ) : (
                <>
                  <strong>{deleteTarget?.family_name}</strong> wird mit allen Dateien aus dem Storage entfernt.
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            {(!deleteBlockedBy || deleteBlockedBy.length === 0) && (
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Lösche…' : 'Löschen'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
