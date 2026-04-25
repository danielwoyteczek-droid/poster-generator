'use client'

import { useMemo, useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PortableTextRenderer } from './PortableTextRenderer'
import { toPlainText } from '@portabletext/react'
import type { FaqItem } from '@/sanity/queries'
import { cn } from '@/lib/utils'

interface Props {
  items: FaqItem[]
}

export function FaqList({ items }: Props) {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? items.filter((item) => {
          const text = toPlainText(item.answer as Parameters<typeof toPlainText>[0]).toLowerCase()
          return item.question.toLowerCase().includes(q) || text.includes(q)
        })
      : items

    const groups = new Map<string, FaqItem[]>()
    for (const item of filtered) {
      const key = item.category || 'Allgemein'
      const list = groups.get(key) ?? []
      list.push(item)
      groups.set(key, list)
    }
    return Array.from(groups.entries())
  }, [items, query])

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Noch keine FAQ-Einträge. Leg sie im Sanity Studio an.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche in den FAQs…"
          className="pl-9 h-11"
        />
      </div>

      {grouped.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-10">Keine Treffer für „{query}".</p>
      ) : (
        grouped.map(([category, categoryItems]) => (
          <div key={category} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">{category}</h2>
            <div className="divide-y divide-gray-100 rounded-xl border border-border bg-white">
              {categoryItems.map((item) => {
                const isOpen = openId === item._id
                return (
                  <div key={item._id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : item._id)}
                      className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-muted transition-colors"
                    >
                      <span className="font-medium text-foreground text-sm">{item.question}</span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5 transition-transform',
                          isOpen && 'rotate-180',
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm">
                        <PortableTextRenderer value={item.answer} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
