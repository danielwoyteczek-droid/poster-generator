'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode[]
  /** ARIA prefix used for dot/arrow labels — e.g. "Vorlage" → "Vorlage 1
   *  anzeigen". Lets the carousel stay generic across landing pages. */
  itemLabel?: string
}

/**
 * Responsive multi-card carousel with dot pagination, prev/next arrows on
 * desktop and touch-swipe on mobile. Visible-card count adapts to viewport:
 *   < 640 px → 1 card    640–1023 px → 2 cards    ≥ 1024 px → 3 cards
 *
 * Sliding is per-card (not per-page): with 4 cards and 3 visible there are
 * 2 dots (slots 1–3 and 2–4). Children (e.g. GalleryPresetCard) are passed
 * in — this component owns only the navigation state and layout.
 */
export function PresetCarousel({ children, itemLabel = 'Vorlage' }: Props) {
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(1) // SSR-safe default
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const total = children.length

  // Track viewport breakpoint via matchMedia. We avoid window.innerWidth
  // resize listeners because matchMedia fires only when crossing a breakpoint.
  useEffect(() => {
    const sm = window.matchMedia('(min-width: 640px)')
    const lg = window.matchMedia('(min-width: 1024px)')
    const update = () => setVisible(lg.matches ? 3 : sm.matches ? 2 : 1)
    update()
    sm.addEventListener('change', update)
    lg.addEventListener('change', update)
    return () => {
      sm.removeEventListener('change', update)
      lg.removeEventListener('change', update)
    }
  }, [])

  const maxActive = Math.max(0, total - visible)
  const dotCount = maxActive + 1

  // Resize from mobile→desktop on the last slide would leave `active` past
  // the new max — clamp it back so the layout doesn't show empty trailing
  // space.
  useEffect(() => {
    if (active > maxActive) setActive(maxActive)
  }, [maxActive, active])

  if (total === 0) return null

  const fitsWithoutSlide = total <= visible
  const next = () => setActive((i) => Math.min(i + 1, maxActive))
  const prev = () => setActive((i) => Math.max(i - 1, 0))

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const dx = e.changedTouches[0].clientX - touchStart
    if (dx > 50) prev()
    else if (dx < -50) next()
    setTouchStart(null)
  }

  const slidePercent = 100 / visible

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          className={cn(
            'flex transition-transform duration-300 ease-out',
            fitsWithoutSlide && 'justify-center',
          )}
          style={
            fitsWithoutSlide
              ? undefined
              : { transform: `translateX(-${active * slidePercent}%)` }
          }
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {children.map((child, i) => (
            <div key={i} className="shrink-0 w-full sm:w-1/2 lg:w-1/3 px-2">
              {child}
            </div>
          ))}
        </div>
      </div>

      {!fitsWithoutSlide && (
        <>
          <button
            type="button"
            onClick={prev}
            disabled={active === 0}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-border items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors z-10"
            aria-label={`Vorheriges ${itemLabel}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={active === maxActive}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-border items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors z-10"
            aria-label={`Nächstes ${itemLabel}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {dotCount > 1 && (
        <div className="flex justify-center gap-2 mt-6" role="tablist">
          {Array.from({ length: dotCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cn(
                'h-2 rounded-full transition-all',
                i === active
                  ? 'bg-primary w-6'
                  : 'bg-border hover:bg-muted-foreground/40 w-2',
              )}
              aria-label={`${itemLabel} ${i + 1} anzeigen`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
