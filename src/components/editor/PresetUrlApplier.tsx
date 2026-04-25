'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { toast } from 'sonner'
import { invalidateCustomMasksCache } from '@/hooks/useCustomMasks'
import { applyPreset } from '@/lib/apply-preset'

interface Props {
  posterType: 'map' | 'star-map'
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
          return
        }
        if (data.preset.poster_type !== posterType) {
          // Preset is for the other editor — redirect there, preserving locale prefix
          const target = data.preset.poster_type === 'star-map' ? '/star-map' : '/map'
          router.replace(`/${locale}${target}?preset=${id}`)
          return
        }
        invalidateCustomMasksCache()
        const undo = applyPreset(data.preset)
        toast.success(`Design „${data.preset.name}" übernommen`, {
          duration: 8000,
          action: { label: 'Rückgängig', onClick: () => undo() },
        })

        // Strip the query param so a page reload doesn't re-apply
        const params = new URLSearchParams(searchParams.toString())
        params.delete('preset')
        const query = params.toString()
        router.replace(query ? `${pathname}?${query}` : pathname)
      })
      .catch(() => toast.error('Preset konnte nicht geladen werden'))
  }, [searchParams, router, pathname, posterType])

  return null
}
