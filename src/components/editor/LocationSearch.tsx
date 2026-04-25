'use client'

import { useState, useRef } from 'react'
import { Search, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'

type GeoResult = {
  id: string | null
  place_name: string
  center: [number, number]
}

export function LocationSearch({
  onSelect,
  placeholder = 'Stadt, Straße, Ort…',
}: {
  onSelect: (lng: number, lat: number, name: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = (q: string) => {
    setQuery(q)
    clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); setShowResults(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?query=${encodeURIComponent(q)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(Array.isArray(data) ? data : [])
          setShowResults(true)
        } else {
          setResults([]); setShowResults(false)
        }
      } catch {
        setResults([]); setShowResults(false)
      }
    }, 400)
  }

  const handleSelect = (result: GeoResult) => {
    onSelect(result.center[0], result.center[1], result.place_name)
    setQuery(result.place_name)
    setResults([])
    setShowResults(false)
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70 pointer-events-none" />
      <Input
        className="pl-8 h-9 text-sm"
        placeholder={placeholder}
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onBlur={() => setTimeout(() => setShowResults(false), 150)}
        onFocus={() => results.length > 0 && setShowResults(true)}
      />
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-border rounded-md shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 border-b border-border last:border-0"
              onMouseDown={() => handleSelect(r)}
            >
              <MapPin className="w-3 h-3 text-muted-foreground/70 shrink-0" />
              <span className="truncate">{r.place_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
