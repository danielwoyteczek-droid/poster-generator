'use client'

import { useState } from 'react'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/business-case/format'
import type { Scenario } from '@/lib/business-case/types'

interface ScenarioListProps {
  scenarios: Scenario[]
  activePlanScenarioId: string | null
  onCreate: (name: string, cloneFromId?: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onOpen: (id: string) => void
}

export function ScenarioList({
  scenarios,
  activePlanScenarioId,
  onCreate,
  onDelete,
  onRename,
  onOpen,
}: ScenarioListProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [cloneFromId, setCloneFromId] = useState<string>('blank')
  const [renameTarget, setRenameTarget] = useState<Scenario | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null)

  function submitCreate() {
    if (!createName.trim()) {
      toast.error('Bitte einen Namen eingeben')
      return
    }
    onCreate(createName, cloneFromId === 'blank' ? undefined : cloneFromId)
    setCreateOpen(false)
    setCreateName('')
    setCloneFromId('blank')
  }

  function submitRename() {
    if (!renameTarget) return
    if (!renameValue.trim()) {
      toast.error('Name darf nicht leer sein')
      return
    }
    onRename(renameTarget.id, renameValue)
    setRenameTarget(null)
  }

  function submitDelete() {
    if (!deleteTarget) return
    onDelete(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {scenarios.length} Szenarien insgesamt
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Neues Szenario
        </Button>
      </div>

      {scenarios.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Noch keine Szenarien angelegt.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {scenarios.map((s) => {
            const isPlan = s.id === activePlanScenarioId
            return (
              <Card key={s.id} className="hover:border-foreground/30 transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <button
                    type="button"
                    onClick={() => onOpen(s.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{s.name}</h3>
                      {isPlan && <Badge variant="default">Aktiver Plan</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.description ?? 'Keine Beschreibung'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aktualisiert: {formatDate(s.updatedAt)}
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Duplizieren"
                      onClick={() => onCreate(`${s.name} (Kopie)`, s.id)}
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Umbenennen"
                      onClick={() => {
                        setRenameTarget(s)
                        setRenameValue(s.name)
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Löschen"
                      onClick={() => setDeleteTarget(s)}
                      disabled={isPlan}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Szenario</DialogTitle>
            <DialogDescription>
              Lege ein neues Szenario an. Optional als Kopie eines bestehenden Szenarios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-scenario-name">Name</Label>
              <Input
                id="new-scenario-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="z. B. Konservativ 2026"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clone-from">Basis</Label>
              <Select value={cloneFromId} onValueChange={setCloneFromId}>
                <SelectTrigger id="clone-from">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Leer (Default-Werte)</SelectItem>
                  {scenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      Kopie von „{s.name}"
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={submitCreate}>Anlegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Szenario umbenennen</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Abbrechen
            </Button>
            <Button onClick={submitRename}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Szenario löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Szenario „{deleteTarget?.name}" wird unwiderruflich gelöscht.
              Bereits verabschiedete Pläne bleiben bestehen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={submitDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
