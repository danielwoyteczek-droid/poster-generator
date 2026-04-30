'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, X as XIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
import { ProjectCard } from './ProjectCard'
import { useEditorStore } from '@/hooks/useEditorStore'

interface Project {
  id: string
  title: string
  location_name: string
  created_at: string
  updated_at: string
  is_locked?: boolean
  poster_type?: 'map' | 'star-map' | 'photo'
}

export function ProjectDashboard() {
  const t = useTranslations('projects')
  const tCommon = useTranslations('common')
  const router = useRouter()
  // Selectors prevent re-renders from unrelated store changes
  const projectId = useEditorStore((s) => s.projectId)
  const setProjectId = useEditorStore((s) => s.setProjectId)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'map' | 'star-map' | 'photo'>('all')

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/list')
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (projectId === id) setProjectId(null)
  }, [projectId, setProjectId])

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const visibleProjects = typeFilter === 'all'
    ? projects
    : projects.filter((p) => (p.poster_type ?? 'map') === typeFilter)
  const selectableProjects = visibleProjects.filter((p) => !p.is_locked)
  const allSelected = selectableProjects.length > 0 && selectableProjects.every((p) => selectedIds.has(p.id))
  const toggleSelectAll = () => {
    if (allSelected) {
      clearSelection()
    } else {
      setSelectedIds(new Set(selectableProjects.map((p) => p.id)))
    }
  }

  const performBulkDelete = async () => {
    setBulkDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      const res = await fetch('/api/projects/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? t('bulkDeleteFailed'))
        return
      }
      const deletedCount = data.deleted ?? 0
      setProjects((prev) => prev.filter((p) => !ids.includes(p.id)))
      if (projectId && ids.includes(projectId)) setProjectId(null)
      clearSelection()
      setBulkConfirmOpen(false)
      toast.success(t('bulkDeleteSuccess', { count: deletedCount }))
    } finally {
      setBulkDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    )
  }

  const selectionCount = selectedIds.size

  return (
    <div>
      {selectionCount > 0 && (
        <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-b border-border flex flex-wrap items-center gap-3 mb-4">
          <div className="text-sm font-medium text-foreground">
            {t('bulkSelectedCount', { count: selectionCount })}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={toggleSelectAll}
          >
            {allSelected ? t('bulkDeselectAll') : t('bulkSelectAll')}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8"
            onClick={() => setBulkConfirmOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            {t('bulkDelete')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 ml-auto"
            onClick={clearSelection}
          >
            <XIcon className="w-3.5 h-3.5 mr-1.5" />
            {tCommon('cancel')}
          </Button>
        </div>
      )}

      {projects.length > 0 && (
        <div className="flex items-center gap-1 mb-4 bg-white rounded-md border border-border p-0.5 w-fit">
          {([
            { key: 'all' as const, label: t('typeFilterAll') },
            { key: 'map' as const, label: t('typeMap') },
            { key: 'star-map' as const, label: t('typeStarMap') },
            { key: 'photo' as const, label: t('typePhoto') },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={
                'px-3 py-1.5 rounded text-xs font-medium transition-colors ' +
                (typeFilter === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/70 hover:bg-muted')
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => router.push('/map')}
          className="h-40 rounded-xl border-2 border-dashed border-border hover:border-muted-foreground hover:bg-white transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground/70 hover:text-muted-foreground"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">{t('newPoster')}</span>
        </button>

        {visibleProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDelete={handleDelete}
            onDuplicate={fetchProjects}
            selection={{
              selected: selectedIds.has(project.id),
              onToggle: toggleSelected,
            }}
          />
        ))}
      </div>

      {projects.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground text-center">
          {t('empty')}
        </p>
      )}
      {projects.length > 0 && visibleProjects.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground text-center">
          {t('typeFilterEmpty')}
        </p>
      )}

      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bulkDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bulkDeleteConfirm', { count: selectionCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); performBulkDelete() }}
              disabled={bulkDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDeleting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
