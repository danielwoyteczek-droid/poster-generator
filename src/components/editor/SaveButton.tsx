'use client'

import { useState } from 'react'
import { Cloud, CloudOff, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProjectSync, type SaveStatus } from '@/hooks/useProjectSync'
import { useAuth } from '@/hooks/useAuth'
import { useEditorStore } from '@/hooks/useEditorStore'

function StatusIcon({ status }: { status: SaveStatus }) {
  if (status === 'saving') return <Loader2 className="w-3.5 h-3.5 animate-spin" />
  if (status === 'saved') return <Cloud className="w-3.5 h-3.5" />
  if (status === 'error') return <CloudOff className="w-3.5 h-3.5" />
  return <Save className="w-3.5 h-3.5" />
}

function statusLabel(status: SaveStatus) {
  if (status === 'saving') return 'Speichern...'
  if (status === 'saved') return 'Gespeichert'
  if (status === 'error') return 'Fehler'
  return 'Speichern'
}

export function SaveButton() {
  const { user } = useAuth()
  const locationName = useEditorStore((s) => s.locationName)
  const { saveStatus, saveToCloud, hasProject } = useProjectSync()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState('')

  if (!user) return null

  const handleClick = () => {
    if (hasProject) {
      saveToCloud()
    } else {
      setTitle(locationName || '')
      setDialogOpen(true)
    }
  }

  const handleConfirm = async () => {
    setDialogOpen(false)
    await saveToCloud(title.trim() || locationName || 'Mein Poster')
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={handleClick}
        disabled={saveStatus === 'saving'}
      >
        <StatusIcon status={saveStatus} />
        {statusLabel(saveStatus)}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Poster speichern</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="poster-title" className="text-sm">Name</Label>
            <Input
              id="poster-title"
              className="mt-1.5"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={!title.trim()}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
