'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
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
import { useProjectSync, type SaveStatus, type PosterType } from '@/hooks/useProjectSync'
import { useAuth } from '@/hooks/useAuth'
import { useEditorStore } from '@/hooks/useEditorStore'

interface Props {
  /** Editor this button lives in. The hook needs to know which store to read
   *  from + which `poster_type` to write to `projects.config_json`. */
  posterType?: PosterType
}

function StatusIcon({ status }: { status: SaveStatus }) {
  if (status === 'saving') return <Loader2 className="w-3.5 h-3.5 animate-spin" />
  if (status === 'saved') return <Cloud className="w-3.5 h-3.5" />
  if (status === 'error') return <CloudOff className="w-3.5 h-3.5" />
  return <Save className="w-3.5 h-3.5" />
}

export function SaveButton({ posterType = 'map' }: Props) {
  const t = useTranslations('editor')
  const tCommon = useTranslations('common')
  const { user } = useAuth()
  const locationName = useEditorStore((s) => s.locationName)
  const { saveStatus, saveToCloud, hasProject } = useProjectSync(posterType)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState('')

  if (!user) return null

  const statusLabel = (status: SaveStatus) => {
    if (status === 'saving') return t('saveStatusSaving')
    if (status === 'saved') return t('saveStatusSaved')
    if (status === 'error') return t('saveStatusError')
    return t('saveStatusIdle')
  }

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
    await saveToCloud(title.trim() || locationName || t('savePosterDefaultName'))
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
            <DialogTitle>{t('savePosterDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="poster-title" className="text-sm">{t('savePosterNameLabel')}</Label>
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
              {tCommon('cancel')}
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={!title.trim()}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
