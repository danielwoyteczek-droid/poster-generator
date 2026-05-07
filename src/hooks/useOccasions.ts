'use client'

import { useEffect, useState } from 'react'
import type { OccasionEntry } from '@/lib/occasions-server'

/**
 * PROJ-29 Iteration 2: client-side occasion list.
 *
 * Fetches the current Sanity-managed list from `/api/occasions` once per
 * page-load and caches in module-scope so multiple consumers on the same
 * page don't refetch. The list is small (~8–20 entries) and almost never
 * changes during a session, so a simple in-memory cache is enough.
 *
 * Returns `loading=true` until the first fetch resolves; consumers should
 * render a placeholder or use the `fallback` prop to bridge the gap.
 */
let cached: OccasionEntry[] | null = null
let inflight: Promise<OccasionEntry[]> | null = null

async function loadOccasions(): Promise<OccasionEntry[]> {
  if (cached) return cached
  if (inflight) return inflight
  inflight = fetch('/api/occasions')
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { occasions: OccasionEntry[] }
      cached = data.occasions
      return data.occasions
    })
    .catch((err) => {
      console.warn('[useOccasions] fetch failed, returning empty list:', err)
      return []
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function useOccasions(): { occasions: OccasionEntry[]; loading: boolean } {
  const [occasions, setOccasions] = useState<OccasionEntry[]>(cached ?? [])
  const [loading, setLoading] = useState<boolean>(cached === null)

  useEffect(() => {
    if (cached) {
      setOccasions(cached)
      setLoading(false)
      return
    }
    let mounted = true
    loadOccasions().then((list) => {
      if (!mounted) return
      setOccasions(list)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  return { occasions, loading }
}

/** Forces the next call to refetch from the API. Use after admin edits. */
export function invalidateOccasionsCache() {
  cached = null
}
