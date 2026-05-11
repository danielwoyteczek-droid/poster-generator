'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { SheetState } from '@/hooks/useMobileSheet'

interface Props {
  state: SheetState
  /** Connects screen readers to the tab buttons that control the sheet — pass the same id used by `aria-controls` on the tab triggers. */
  id?: string
  children: ReactNode
}

/**
 * PROJ-43: Lightweight bottom sheet for the mobile editor. Three states:
 *
 *   - closed         → translated fully below the viewport (off-screen)
 *   - open           → 50% of the dynamic viewport height
 *   - open-keyboard  → 90% (iOS soft-keyboard up; keep the focused field
 *                       visible above the keyboard)
 *
 * No backdrop, no drag-handle, no close button — closing happens via the
 * canvas-tap detector in `useMobileSheet`. The sheet sits ABOVE the tab bar
 * (z-index handled by the parent layout) so the tab-bar remains tappable.
 *
 * The content area uses `overflow-y-auto` so tabs with lots of controls
 * scroll inside the sheet instead of growing it.
 */
export function MobileBottomSheet({ state, id, children }: Props) {
  const isOpen = state !== 'closed'
  const isKeyboard = state === 'open-keyboard'

  // `bottom-14` anchors the sheet above the 56 px tab bar so the bar stays
  // tappable. Height is a percentage of the editor area (the layout's
  // relative ancestor), not the full viewport — that keeps the proportions
  // right when a top nav sits above the editor. The keyboard branch lifts
  // the top of the sheet much higher; the bottom stays pinned above the
  // tab bar so the customer doesn't lose the navigation.
  return (
    <div
      id={id}
      aria-hidden={!isOpen}
      className={cn(
        'absolute inset-x-0 bottom-14 bg-white border-t border-border rounded-t-xl shadow-2xl',
        'z-30',
        'transition-transform duration-[250ms] ease-out motion-reduce:transition-none',
        'flex flex-col',
        isOpen ? 'translate-y-0' : 'translate-y-[calc(100%+3.5rem)] pointer-events-none',
      )}
      style={{
        height: isKeyboard ? '90%' : '50%',
      }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        {children}
      </div>
    </div>
  )
}
