'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useOccasions } from '@/hooks/useOccasions'
import { cn } from '@/lib/utils'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  buttonClassName?: string
  disabled?: boolean
}

/**
 * Multi-select for occasion tags. PROJ-29 Iteration 2: list now comes
 * from Sanity (`occasion`-Docs) via /api/occasions, so adding a new
 * occasion in Studio appears here without a code-deploy.
 */
export function OccasionMultiSelect({
  value,
  onChange,
  placeholder = 'Anlässe wählen…',
  buttonClassName,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const { occasions, loading } = useOccasions()
  const adminLocale = useLocale()
  const labelLocale = (['de', 'en', 'fr', 'it', 'es'] as const).includes(
    adminLocale as 'de' | 'en' | 'fr' | 'it' | 'es',
  )
    ? (adminLocale as 'de' | 'en' | 'fr' | 'it' | 'es')
    : 'de'

  const toggle = (code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((v) => v !== code))
    } else {
      onChange([...value, code])
    }
  }

  const labelFor = (code: string): string => {
    const entry = occasions.find((o) => o.code === code)
    return entry?.localizedTitles[labelLocale] ?? entry?.title ?? code
  }

  const triggerLabel =
    value.length === 0
      ? placeholder
      : value.length > 0 && value.length === occasions.length
        ? 'Alle Anlässe'
        : value.map((v) => labelFor(v)).join(' · ')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn('justify-between font-normal h-9', buttonClassName)}
        >
          <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
            {triggerLabel}
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1 w-64">
        {loading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : occasions.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground text-center">
            Noch keine Anlässe definiert.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {occasions.map((occ) => {
              const checked = value.includes(occ.code)
              return (
                <li key={occ.code}>
                  <button
                    type="button"
                    onClick={() => toggle(occ.code)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left"
                  >
                    <span
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                        checked ? 'bg-primary border-primary' : 'border-border',
                      )}
                    >
                      {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                    </span>
                    <span className="font-mono text-[10px] uppercase w-16 text-muted-foreground shrink-0 truncate">
                      {occ.code}
                    </span>
                    <span className="text-foreground truncate">{occ.localizedTitles[labelLocale] ?? occ.title}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
