'use client'

/**
 * PROJ-47: Admin-Font-Verwaltung — public font catalogue hook.
 *
 * Returns the list of fonts the customer-facing editor may display in the
 * font picker. Mirrors the `useMapPalettes` pattern: module-level cache plus
 * in-flight promise so repeated mounts share a single fetch, with the
 * hardcoded `FALLBACK_FONTS` as a safety net.
 *
 * Phase 1 of the rollout: the admin can upload fonts to the DB, but the
 * editor picker still iterates the hardcoded list. The hook fetches the
 * published DB rows and registers them via the FontFace loader so they are
 * already in `document.fonts` when Phase 2 swaps the picker source.
 *
 * Phase 2 simply changes the editor consumers from the hardcoded array to
 * `useFonts().fonts` — no further loader changes needed.
 */

import { useEffect, useState } from 'react'
import { FALLBACK_FONTS, mergeFontsByFamilyName, type Font } from '@/lib/fonts'
import { registerFonts, registerSingleFont } from '@/lib/fonts-loader'

let cache: Font[] | null = null
let inflight: Promise<Font[]> | null = null

async function fetchPublishedFonts(): Promise<Font[]> {
  // `cache: 'no-store'` so a freshly-published font from the admin UI shows
  // up in the editor immediately after invalidateFontsCache().
  const res = await fetch('/api/fonts', { cache: 'no-store' })
  if (!res.ok) throw new Error(`fonts fetch failed: ${res.status}`)
  const data = (await res.json()) as { fonts?: Font[] }
  return Array.isArray(data.fonts) ? data.fonts : []
}

async function loadOnce(): Promise<Font[]> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const rows = await fetchPublishedFonts()
      // Merge DB-driven fonts with the hardcoded fallback so admin-published
      // fonts appear alongside the established 9 hardcoded families. After
      // Phase 2 (seeding the 9 into the DB) the fallback dedupes against
      // the DB row by family_name and effectively becomes a no-op.
      const next = mergeFontsByFamilyName(rows, FALLBACK_FONTS)
      cache = next
      // Fire-and-forget: register the FontFace records so subsequent canvas
      // / export draws can pick them up via `document.fonts.ready`.
      registerFonts(next).catch(() => undefined)
      return next
    } catch {
      // API not yet deployed (Phase 1 backend not landed) or transient
      // network blip — fall back to the hardcoded set so the editor remains
      // fully usable.
      cache = FALLBACK_FONTS
      registerFonts(FALLBACK_FONTS).catch(() => undefined)
      return FALLBACK_FONTS
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export function invalidateFontsCache(): void {
  cache = null
  inflight = null
}

/**
 * Synchronous read of the warm cache — for non-React consumers (e.g. export
 * pipelines that want to enumerate fonts without triggering a fetch).
 * Returns null until the first hook mount has resolved.
 */
export function getCachedFonts(): Font[] | null {
  return cache
}

/**
 * Returns the published font catalogue. While the fetch is in flight the
 * hook returns the hardcoded fallback so the editor never renders without
 * options. `loaded` flips to `true` once the network resolution finishes
 * (success or fallback).
 */
export function useFonts(): { fonts: Font[]; loaded: boolean } {
  const [fonts, setFonts] = useState<Font[]>(() => cache ?? FALLBACK_FONTS)
  const [loaded, setLoaded] = useState<boolean>(() => cache !== null)

  useEffect(() => {
    if (cache) {
      // Cache was filled by an earlier mount — make sure FontFace records
      // are registered for this document (idempotent, no-op if already).
      registerFonts(cache).catch(() => undefined)
      return
    }
    let cancelled = false
    loadOnce().then((list) => {
      if (cancelled) return
      setFonts(list)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { fonts, loaded }
}

/**
 * Force-load a single font by id — used when a saved project references a
 * font that has since been unpublished. The admin endpoint returns the
 * font row regardless of status (read access on a known slug is harmless).
 * Once registered the editor renders the project correctly; the font is
 * NOT added to the picker list returned by `useFonts()`.
 */
export async function ensureFontLoadedById(id: string): Promise<Font | null> {
  // Prefer the warm cache hit first.
  const cached = (cache ?? []).find((f) => f.id === id)
  if (cached) {
    await registerSingleFont(cached)
    return cached
  }
  try {
    const res = await fetch(`/api/admin/fonts/${encodeURIComponent(id)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { font?: Font }
    if (!data.font) return null
    await registerSingleFont(data.font)
    return data.font
  } catch {
    return null
  }
}
