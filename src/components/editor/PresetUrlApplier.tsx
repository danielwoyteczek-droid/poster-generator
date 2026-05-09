'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { toast } from 'sonner'
import { invalidateCustomMasksCache } from '@/hooks/useCustomMasks'
import { applyPreset } from '@/lib/apply-preset'
import { useEditorStore } from '@/hooks/useEditorStore'
import type { PrintFormat } from '@/lib/print-formats'

const VALID_FORMATS: ReadonlySet<PrintFormat> = new Set(['a4', 'a3', 'a2'])

interface Props {
  posterType: 'map' | 'star-map' | 'photo'
}

/**
 * Reads `?preset=<id>` from the URL, fetches that preset, and applies it to
 * the corresponding store. Used so external pages (blog, homepage, marketing
 * links) can deep-link into a specific design.
 */
export function PresetUrlApplier({ posterType }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const appliedRef = useRef<string | null>(null)

  useEffect(() => {
    const id = searchParams.get('preset')
    if (!id || appliedRef.current === id) return
    appliedRef.current = id

    fetch(`/api/presets/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.preset) {
          toast.error('Preset nicht gefunden')
          if (typeof window !== 'undefined') (window as Window & { __presetApplied?: boolean }).__presetApplied = false
          return
        }
        if (data.preset.poster_type !== posterType) {
          // Preset is for the other editor — redirect there, preserving locale prefix
          const target =
            data.preset.poster_type === 'star-map' ? '/star-map'
            : data.preset.poster_type === 'photo' ? '/photo'
            : '/map'
          router.replace(`/${locale}${target}?preset=${id}`)
          return
        }
        invalidateCustomMasksCache()
        const undo = applyPreset(data.preset)
        // PROJ-39: honour explicit format URL param so customers who picked a
        // specific format on the inspiration card land in the editor at that
        // size. Validation against a whitelist guards against open-redirect /
        // unknown-format input. Applied AFTER applyPreset so it overrides
        // whatever printFormat the preset itself encodes.
        const fmt = searchParams.get('format')
        if (fmt && VALID_FORMATS.has(fmt as PrintFormat)) {
          useEditorStore.getState().setPrintFormat(fmt as PrintFormat)
        }
        toast.success(`Design „${data.preset.name}" übernommen`, {
          duration: 8000,
          action: { label: 'Rückgängig', onClick: () => undo() },
        })

        if (typeof window !== 'undefined') (window as Window & { __presetApplied?: boolean }).__presetApplied = true

        // Strip the query param so a page reload doesn't re-apply
        const params = new URLSearchParams(searchParams.toString())
        params.delete('preset')
        params.delete('format')
        const query = params.toString()
        router.replace(query ? `${pathname}?${query}` : pathname)
      })
      .catch(() => {
        toast.error('Preset konnte nicht geladen werden')
        if (typeof window !== 'undefined') (window as Window & { __presetApplied?: boolean }).__presetApplied = false
      })
  }, [searchParams, router, pathname, posterType])

  return null
}
