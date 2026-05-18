'use client'

/**
 * PROJ-51: Inline region search for the "Grenzen" map shape.
 *
 * Mirrors the LocationSearch pattern (input + absolutely-positioned results
 * dropdown) so choosing a border feels exactly like searching a place — no
 * modal. Picking a hit resolves the full simplified polygon via the
 * geo-boundaries client lib and hands the GeoBoundary back to the caller.
 */

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search, Globe2, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  searchGeoBoundaries,
  fetchGeoBoundary,
  type GeoBoundary,
  type GeoBoundarySearchResult,
} from '@/lib/geo-boundaries'

interface GeoBoundarySearchProps {
  onSelect: (boundary: GeoBoundary) => void
}

export function GeoBoundarySearch({ onSelect }: GeoBoundarySearchProps) {
  const t = useTranslations('editor')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoBoundarySearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = (q: string) => {
    setQuery(q)
    clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    if (q.trim().length < 2) {
      setResults([])
      setShowResults(false)
      setSearching(false)
      return
    }
    setSearching(true)
    setShowResults(true)
    // 400 ms debounce — also gentle on the Nominatim rate limit.
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const hits = await searchGeoBoundaries(q, controller.signal)
        if (!controller.signal.aborted) {
          setResults(hits)
          setSearching(false)
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults([])
          setSearching(false)
        }
      }
    }, 400)
  }

  const handleSelect = async (hit: GeoBoundarySearchResult) => {
    setResolvingId(hit.id)
    try {
      const boundary = await fetchGeoBoundary(hit.id)
      if (boundary) {
        onSelect(boundary)
        setQuery('')
        setResults([])
        setShowResults(false)
        inputRef.current?.blur()
      }
    } finally {
      setResolvingId(null)
    }
  }

  const trimmedLen = query.trim().length
  const dropdownOpen = showResults && trimmedLen >= 2

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70 pointer-events-none" />
      <Input
        ref={inputRef}
        className="pl-8 h-9 text-sm"
        placeholder={t('geoBoundarySearchPlaceholder')}
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onBlur={() => setTimeout(() => setShowResults(false), 150)}
        onFocus={() => (results.length > 0 || searching) && setShowResults(true)}
        aria-label={t('geoBoundarySearchPlaceholder')}
      />
      {searching && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground/70" />
      )}
      {dropdownOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-border rounded-md shadow-lg overflow-hidden">
          {results.length > 0 ? (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={() => handleSelect(r)}
                disabled={resolvingId !== null}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 border-b border-border last:border-0 disabled:opacity-50"
              >
                <Globe2 className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                <span className="flex-1 truncate">{r.name}</span>
                {resolvingId === r.id && (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/70 shrink-0" />
                )}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {searching ? t('geoBoundarySearching') : t('geoBoundaryNoResults')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
