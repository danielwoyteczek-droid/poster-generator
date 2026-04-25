'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { locales, localeNames, type Locale } from '@/i18n/config'
import { cn } from '@/lib/utils'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  buttonClassName?: string
  disabled?: boolean
}

export function LocaleMultiSelect({
  value,
  onChange,
  placeholder = 'Sprachen wählen…',
  buttonClassName,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)

  const toggle = (loc: Locale) => {
    if (value.includes(loc)) {
      onChange(value.filter((l) => l !== loc))
    } else {
      onChange([...value, loc])
    }
  }

  const label =
    value.length === 0
      ? placeholder
      : value.length === locales.length
        ? 'Alle Sprachen'
        : value.map((v) => v.toUpperCase()).join(' · ')

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
            {label}
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1 w-56">
        <ul className="space-y-0.5">
          {locales.map((loc) => {
            const checked = value.includes(loc)
            return (
              <li key={loc}>
                <button
                  type="button"
                  onClick={() => toggle(loc)}
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
                  <span className="font-mono text-xs uppercase w-6 text-muted-foreground">
                    {loc}
                  </span>
                  <span className="text-foreground">{localeNames[loc]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
