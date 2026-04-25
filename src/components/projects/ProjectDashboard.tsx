'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectCard } from './ProjectCard'
import { useEditorStore } from '@/hooks/useEditorStore'

interface Project {
  id: string
  title: string
  location_name: string
  created_at: string
  updated_at: string
  is_locked?: boolean
}

export function ProjectDashboard() {
  const t = useTranslations('projects')
  const router = useRouter()
  // Selectors prevent re-renders from unrelated store changes
  const projectId = useEditorStore((s) => s.projectId)
  const setProjectId = useEditorStore((s) => s.setProjectId)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

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
    if (projectId === id) setProjectId(null)
  }, [projectId, setProjectId])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => router.push('/map')}
          className="h-40 rounded-xl border-2 border-dashed border-border hover:border-muted-foreground hover:bg-white transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground/70 hover:text-muted-foreground"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">{t('newPoster')}</span>
        </button>

        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDelete={handleDelete}
            onDuplicate={fetchProjects}
          />
        ))}
      </div>

      {projects.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground text-center">
          {t('empty')}
        </p>
      )}
    </div>
  )
}
