'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Check, ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { OCCASION_CODES, occasionLabels, type OccasionCode } from '@/lib/occasions'
import { cn } from '@/lib/utils'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  buttonClassName?: string
  disabled?: boolean
}

/**
 * Reusable multi-select for occasion tags. Mirrors LocaleMultiSelect's UX
 * (popover with checkbox-list) so the admin learns the pattern once.
 * Labels come from `src/lib/occasions.ts` and are localized to the admin's
 * current UI language via next-intl's useLocale().
 */
export function OccasionMultiSelect({
  value,
  onChange,
  placeholder = 'Anlässe wählen…',
  buttonClassName,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const adminLocale = useLocale() as keyof (typeof occasionLabels)['muttertag']
  const labelLocale = (['de', 'en', 'fr', 'it', 'es'] as const).includes(adminLocale)
    ? adminLocale
    : 'de'

  const toggle = (code: OccasionCode) => {
    if (value.includes(code)) {
      onChange(value.filter((v) => v !== code))
    } else {
      onChange([...value, code])
    }
  }

  const triggerLabel =
    value.length === 0
      ? placeholder
      : value.length === OCCASION_CODES.length
        ? 'Alle Anlässe'
        : value
            .map((v) => occasionLabels[v as OccasionCode]?.[labelLocale] ?? v)
            .join(' · ')

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
        <ul className="space-y-0.5">
          {OCCASION_CODES.map((code) => {
            const checked = value.includes(code)
            return (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => toggle(code)}
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
                  <span className="font-mono text-[10px] uppercase w-16 text-muted-foreground shrink-0">
                    {code}
                  </span>
                  <span className="text-foreground">{occasionLabels[code][labelLocale]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
