'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { Loader2, LayoutTemplate, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { invalidateCustomMasksCache } from '@/hooks/useCustomMasks'
import { useIsMobileEditor } from '@/hooks/useIsMobileEditor'
import { applyPreset } from '@/lib/apply-preset'
import { cn } from '@/lib/utils'

const INITIAL_VISIBLE = 3

interface PresetRow {
  id: string
  name: string
  description: string | null
  poster_type: 'map' | 'star-map' | 'photo'
  preview_image_url: string | null
  config_json: Record<string, unknown>
  display_order: number
}

interface Props {
  posterType: 'map' | 'star-map' | 'photo'
}

export function PresetPicker({ posterType }: Props) {
  const locale = useLocale()
  const [presets, setPresets] = useState<PresetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const isMobile = useIsMobileEditor()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/presets?poster_type=${posterType}&locale=${locale}`)
      .then((r) => r.json())
      .then((d) => setPresets(d.presets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [posterType, locale])

  const apply = useCallback(async (preset: PresetRow) => {
    invalidateCustomMasksCache()
    const undo = applyPreset(preset)
    setAppliedId(preset.id)
    toast.success(`Design „${preset.name}" übernommen`, {
      duration: 8000,
      action: { label: 'Rückgängig', onClick: () => { undo(); setAppliedId(null) } },
    })
  }, [])

  if (loading) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Designs</Label>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/40" />
        </div>
      </div>
    )
  }

  if (presets.length === 0) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Designs</Label>
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          Noch keine Vorlagen für deine Sprache.
        </p>
      </div>
    )
  }

  const visible = expanded ? presets : presets.slice(0, INITIAL_VISIBLE)
  const hasMore = presets.length > INITIAL_VISIBLE

  // On Mobile show every preset in a horizontally swipeable row instead of a
  // 3-column grid with an expand toggle. The bleed-out (-mx-4 px-4) lets the
  // strip extend into the parent's edge padding so users see a "next item
  // peeking" cue and know they can swipe.
  if (isMobile) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Designs</Label>
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => apply(preset)}
              className={cn(
                'relative shrink-0 w-24 aspect-[2/3] rounded-md border-2 overflow-hidden transition-all bg-muted snap-start',
                appliedId === preset.id
                  ? 'border-primary ring-2 ring-gray-900/20'
                  : 'border-border',
              )}
              title={preset.description || preset.name}
            >
              {preset.preview_image_url ? (
                <Image
                  src={preset.preview_image_url}
                  alt={preset.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                  <LayoutTemplate className="w-6 h-6" />
                </div>
              )}
              <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[9px] font-medium px-1 py-1 text-center leading-tight truncate">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Designs</Label>
      <div className="grid grid-cols-3 gap-2">
        {visible.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => apply(preset)}
            className={cn(
              'relative aspect-[2/3] rounded-md border-2 overflow-hidden transition-all bg-muted',
              appliedId === preset.id
                ? 'border-primary ring-2 ring-gray-900/20'
                : 'border-border hover:border-muted-foreground',
            )}
            title={preset.description || preset.name}
          >
            {preset.preview_image_url ? (
              <Image
                src={preset.preview_image_url}
                alt={preset.name}
                fill
                sizes="(max-width: 288px) 33vw, 96px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                <LayoutTemplate className="w-6 h-6" />
              </div>
            )}
            <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[9px] font-medium px-1 py-1 text-center leading-tight truncate">
              {preset.name}
            </span>
          </button>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-0.5 py-1"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Weniger anzeigen' : `Mehr anzeigen (${presets.length - INITIAL_VISIBLE})`}
        </button>
      )}
    </div>
  )
}
