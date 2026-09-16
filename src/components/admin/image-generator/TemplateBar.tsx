'use client'

import { useState } from 'react'
import { Loader2, MoreHorizontal, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { imageGeneratorApi } from '@/lib/image-generator/api'
import type { GeneratorTemplate, SelectionEntry } from '@/lib/image-generator/types'

interface TemplateBarProps {
  templates: GeneratorTemplate[]
  onTemplatesChange: (templates: GeneratorTemplate[]) => void
  loadedTemplateId: string | null
  onLoad: (template: GeneratorTemplate) => void
  onLoadedTemplateIdChange: (id: string | null) => void
  currentEntries: SelectionEntry[]
}

type NameDialog = { mode: 'create' } | { mode: 'rename'; template: GeneratorTemplate } | null

export function TemplateBar({
  templates, onTemplatesChange, loadedTemplateId, onLoad, onLoadedTemplateIdChange, currentEntries,
}: TemplateBarProps) {
  const [nameDialog, setNameDialog] = useState<NameDialog>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [overwriteTarget, setOverwriteTarget] = useState<GeneratorTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GeneratorTemplate | null>(null)

  const loaded = templates.find((t) => t.id === loadedTemplateId) ?? null
  const upsertLocal = (t: GeneratorTemplate) =>
    onTemplatesChange([...templates.filter((x) => x.id !== t.id), t].sort((a, b) => a.name.localeCompare(b.name)))

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try { await fn() } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Aktion fehlgeschlagen')
    } finally { setBusy(false) }
  }

  const overwrite = (t: GeneratorTemplate) => run(async () => {
    const saved = await imageGeneratorApi.updateTemplate(t.id, { entries: currentEntries })
    upsertLocal(saved)
    onLoadedTemplateIdChange(saved.id)
    setOverwriteTarget(null)
    setNameDialog(null)
    toast.success(`Vorlage „${saved.name}" überschrieben`)
  })

  const submitName = () => {
    const trimmed = name.trim()
    if (!trimmed || !nameDialog) return
    const clash = templates.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())
    if (nameDialog.mode === 'create') {
      if (clash) { setOverwriteTarget(clash); return }
      run(async () => {
        const saved = await imageGeneratorApi.createTemplate(trimmed, currentEntries)
        upsertLocal(saved)
        onLoadedTemplateIdChange(saved.id)
        setNameDialog(null)
        toast.success(`Vorlage „${saved.name}" gespeichert`)
      })
    } else {
      if (clash && clash.id !== nameDialog.template.id) {
        toast.error('Eine Vorlage mit diesem Namen gibt es schon')
        return
      }
      run(async () => {
        const saved = await imageGeneratorApi.updateTemplate(nameDialog.template.id, { name: trimmed })
        upsertLocal(saved)
        setNameDialog(null)
        toast.success('Vorlage umbenannt')
      })
    }
  }

  const remove = (t: GeneratorTemplate) => run(async () => {
    await imageGeneratorApi.deleteTemplate(t.id)
    onTemplatesChange(templates.filter((x) => x.id !== t.id))
    if (loadedTemplateId === t.id) onLoadedTemplateIdChange(null)
    setDeleteTarget(null)
    toast.success(`Vorlage „${t.name}" gelöscht`)
  })

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <Select
        value={loadedTemplateId ?? ''}
        onValueChange={(id) => {
          const t = templates.find((x) => x.id === id)
          if (t) onLoad(t)
        }}
        disabled={templates.length === 0}
      >
        <SelectTrigger className="sm:w-64" aria-label="Vorlage laden">
          <SelectValue placeholder={templates.length === 0 ? 'Noch keine Vorlagen' : 'Vorlage laden …'} />
        </SelectTrigger>
        <SelectContent>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name} ({t.entries.length})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => { setName(''); setNameDialog({ mode: 'create' }) }}
          disabled={currentEntries.length === 0 || busy}
          className="flex-1 sm:flex-none"
        >
          <Save className="w-4 h-4 mr-2" /> Als Vorlage speichern
        </Button>
        {loaded && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label={`Vorlage „${loaded.name}" verwalten`} disabled={busy}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={currentEntries.length === 0} onSelect={() => setOverwriteTarget(loaded)}>
                „{loaded.name}" mit aktueller Auswahl überschreiben
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setName(loaded.name); setNameDialog({ mode: 'rename', template: loaded }) }}>
                Umbenennen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteTarget(loaded)}>
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={nameDialog !== null} onOpenChange={(o) => { if (!o) setNameDialog(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{nameDialog?.mode === 'rename' ? 'Vorlage umbenennen' : 'Als Vorlage speichern'}</DialogTitle>
            <DialogDescription>
              {nameDialog?.mode === 'rename'
                ? 'Neuer Name für die Vorlage.'
                : 'Speichert Mockups, Reihenfolge und Overlays. Zusatzfarben gehören nicht zur Vorlage.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submitName() }} className="space-y-1.5">
            <Label htmlFor="template-name">Name</Label>
            <Input id="template-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Stadtkarte Standard" maxLength={80} />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDialog(null)}>Abbrechen</Button>
            <Button onClick={submitName} disabled={!name.trim() || busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={overwriteTarget !== null} onOpenChange={(o) => { if (!o) setOverwriteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vorlage überschreiben?</AlertDialogTitle>
            <AlertDialogDescription>
              „{overwriteTarget?.name}" wird durch die aktuelle Auswahl ({currentEntries.length} Mockups) ersetzt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => overwriteTarget && overwrite(overwriteTarget)}>Überschreiben</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vorlage löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteTarget?.name}" wird gelöscht. Bereits erzeugte Bilder bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && remove(deleteTarget)}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
