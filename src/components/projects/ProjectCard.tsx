'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { MapPin, Pencil, Trash2, Lock, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useEditorStore } from '@/hooks/useEditorStore'
import { applyProjectConfig, type PosterType } from '@/hooks/useProjectSync'

interface Project {
  id: string
  title: string
  location_name: string
  created_at: string
  updated_at: string
  is_locked?: boolean
  poster_type?: PosterType
}

interface ProjectCardProps {
  project: Project
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

const DATE_LOCALES: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
  fr: 'fr-FR',
  it: 'it-IT',
  es: 'es-ES',
}

export function ProjectCard({ project, onDelete, onDuplicate }: ProjectCardProps) {
  const t = useTranslations('projects')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const setSavedProject = useEditorStore((s) => s.setSavedProject)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  const editorPathFor = (posterType: PosterType): string =>
    posterType === 'star-map' ? '/star-map'
    : posterType === 'photo' ? '/photo'
    : '/map'

  const handleEdit = async () => {
    const res = await fetch(`/api/projects/${project.id}`)
    if (res.ok) {
      const data = await res.json()
      const posterType = (data.poster_type ?? 'map') as PosterType
      setSavedProject(data.id, posterType)
      applyProjectConfig(posterType, data.config_json)
      router.push(editorPathFor(posterType))
      return
    }
    router.push('/map')
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/duplicate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('duplicateFailed'))
      onDuplicate(data.id)
      toast.success(t('duplicateSuccess'))
      // Open the duplicate in the editor
      const loadRes = await fetch(`/api/projects/${data.id}`)
      if (loadRes.ok) {
        const loaded = await loadRes.json()
        const posterType = (loaded.poster_type ?? 'map') as PosterType
        setSavedProject(loaded.id, posterType)
        applyProjectConfig(posterType, loaded.config_json)
        router.push(editorPathFor(posterType))
        return
      }
      router.push('/map')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('duplicateFailed'))
    } finally {
      setDuplicating(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(project.id)
  }

  const dateLocale = DATE_LOCALES[locale] ?? 'de-DE'
  const updatedDate = new Date(project.updated_at).toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <Card className="h-40 flex flex-col justify-between hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-sm truncate">{project.title}</h3>
            {project.is_locked && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0"
                title={t('lockedTooltip')}
              >
                <Lock className="w-3 h-3" />
                {t('lockedBadge')}
              </span>
            )}
          </div>
          {project.location_name && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-muted-foreground/70 shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{project.location_name}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground/70 mt-1">{t('editedAt', { date: updatedDate })}</p>
        </div>

        <div className="flex items-center gap-2 mt-3">
          {project.is_locked ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleDuplicate}
              disabled={duplicating}
            >
              <Copy className="w-3 h-3 mr-1.5" />
              {duplicating ? t('duplicating') : t('duplicate')}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleEdit}
            >
              <Pencil className="w-3 h-3 mr-1.5" />
              {t('edit')}
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground/70 hover:text-red-600"
                disabled={deleting}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteConfirm', { title: project.title })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {tCommon('delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
