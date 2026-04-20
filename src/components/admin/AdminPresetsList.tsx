'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, LayoutTemplate, Pencil, Eye, EyeOff, Trash2, Plus, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
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
import { useStarMapStore } from '@/hooks/useStarMapStore'
import { cn } from '@/lib/utils'

type PosterType = 'map' | 'star-map'
type Status = 'draft' | 'published'

interface Preset {
  id: string
  name: string
  description: string | null
  poster_type: PosterType
  preview_image_url: string | null
  status: Status
  display_order: number
  created_at: string
  updated_at: string
  published_at: string | null
}

const FILTER_LABELS: Record<string, string> = {
  all: 'Alle',
  draft: 'Draft',
  published: 'Veröffentlicht',
}

const TYPE_LABELS: Record<string, string> = {
  all: 'Alle Typen',
  map: 'Stadtposter',
  'star-map': 'Sternenposter',
}

export function AdminPresetsList() {
  const router = useRouter()
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const fetchPresets = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (typeFilter !== 'all') params.set('poster_type', typeFilter)
    const res = await fetch(`/api/admin/presets?${params}`)
    const data = await res.json()
    if (res.ok) setPresets(data.presets ?? [])
    setLoading(false)
  }, [statusFilter, typeFilter])

  useEffect(() => { fetchPresets() }, [fetchPresets])

  const updateStatus = async (preset: Preset, status: Status) => {
    const res = await fetch(`/api/admin/presets/${preset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.success(status === 'published' ? 'Preset veröffentlicht' : 'Preset zurückgezogen')
      fetchPresets()
    } else {
      toast.error('Status-Änderung fehlgeschlagen')
    }
  }

  const copyPresetUrl = async (preset: Preset) => {
    const path = preset.poster_type === 'star-map' ? '/star-map' : '/map'
    const url = `${window.location.origin}${path}?preset=${preset.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link kopiert', { description: url })
    } catch {
      toast.error('Konnte Link nicht kopieren')
    }
  }

  const deletePreset = async (id: string) => {
    const res = await fetch(`/api/admin/presets/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Preset gelöscht')
      setPresets((prev) => prev.filter((p) => p.id !== id))
    } else {
      toast.error('Löschen fehlgeschlagen')
    }
  }

  const editPreset = async (preset: Preset) => {
    const res = await fetch(`/api/admin/presets/${preset.id}`)
    const data = await res.json()
    if (!res.ok || !data.preset) {
      toast.error('Laden fehlgeschlagen')
      return
    }
    const config = data.preset.config_json as Record<string, unknown>

    // Apply the preset's config to the respective editor store
    if (preset.poster_type === 'star-map') {
      const s = config as {
        posterBgColor?: string; skyBgColor?: string; starColor?: string
        showConstellations?: boolean; showMilkyWay?: boolean
        showSun?: boolean; showMoon?: boolean; showPlanets?: boolean
        frameConfig?: {
          outer?: Partial<{ mode: 'none' | 'opacity' | 'full'; opacity: number; margin: number }>
          innerFrame?: Partial<{ enabled: boolean; color: string; thickness: number }>
          outerFrame?: Partial<{ enabled: boolean; color: string; thickness: number; style: 'single' | 'double'; gap: number }>
        }
        textBlocks?: unknown
      }
      const starMap = useStarMapStore.getState()
      if (s.posterBgColor) starMap.setPosterBgColor(s.posterBgColor)
      if (s.skyBgColor) starMap.setSkyBgColor(s.skyBgColor)
      if (s.starColor) starMap.setStarColor(s.starColor)
      if (s.showConstellations !== undefined) starMap.setShowConstellations(s.showConstellations)
      if (s.showMilkyWay !== undefined) starMap.setShowMilkyWay(s.showMilkyWay)
      if (s.showSun !== undefined) starMap.setShowSun(s.showSun)
      if (s.showMoon !== undefined) starMap.setShowMoon(s.showMoon)
      if (s.showPlanets !== undefined) starMap.setShowPlanets(s.showPlanets)
      if (s.frameConfig?.outer) starMap.setOuter(s.frameConfig.outer)
      if (s.frameConfig?.innerFrame) starMap.setInnerFrame(s.frameConfig.innerFrame)
      if (s.frameConfig?.outerFrame) starMap.setOuterFrame(s.frameConfig.outerFrame)
      if (s.textBlocks) {
        useEditorStore.setState({ textBlocks: s.textBlocks as never })
      }
      router.push('/star-map')
    } else {
      // Map preset: apply to editor store
      useEditorStore.setState((state) => ({
        ...state,
        ...(config as Partial<typeof state>),
        // Important: keep the user's current viewState/location, not the preset's
        viewState: state.viewState,
        locationName: state.locationName,
        projectId: null, // Don't associate with a locked project
      }))
      router.push('/map')
    }
    toast.success(`Preset "${preset.name}" geladen — Editor wird geöffnet`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 bg-white rounded-md border border-gray-200 p-0.5">
            {Object.entries(FILTER_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  statusFilter === key ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-white rounded-md border border-gray-200 p-0.5">
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  typeFilter === key ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/map">
              <Plus className="w-4 h-4 mr-1.5" />
              Neues Stadtposter-Preset
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/star-map">
              <Plus className="w-4 h-4 mr-1.5" />
              Neues Sternenposter-Preset
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
        </div>
      ) : presets.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-gray-300 p-12 text-center text-gray-500 text-sm">
          <LayoutTemplate className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          Noch keine Presets. Designe im Editor ein Poster und klick auf „Als Preset" in der oberen Navigation.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <div key={preset.id} className="rounded-xl bg-white border border-gray-200 overflow-hidden">
              <div className="aspect-[2/3] bg-gray-100 relative">
                {preset.preview_image_url ? (
                  <Image
                    src={preset.preview_image_url}
                    alt={preset.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                    <LayoutTemplate className="w-12 h-12" />
                  </div>
                )}
                <span className={cn(
                  'absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                  preset.status === 'published'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800',
                )}>
                  {preset.status === 'published' ? 'Live' : 'Draft'}
                </span>
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/90 text-gray-700 backdrop-blur">
                  {preset.poster_type === 'star-map' ? 'Sternenposter' : 'Stadtposter'}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm text-gray-900 truncate">{preset.name}</h3>
                  {preset.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{preset.description}</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => editPreset(preset)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Bearbeiten
                  </Button>
                  {preset.status === 'draft' ? (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => updateStatus(preset, 'published')}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Veröffentlichen
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => updateStatus(preset, 'draft')}
                    >
                      <EyeOff className="w-3.5 h-3.5 mr-1" />
                      Zurückziehen
                    </Button>
                  )}
                  {preset.status === 'published' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900"
                      onClick={() => copyPresetUrl(preset)}
                      title="Deep-Link zum Preset kopieren"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Preset löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          „{preset.name}" wird dauerhaft gelöscht.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePreset(preset.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
