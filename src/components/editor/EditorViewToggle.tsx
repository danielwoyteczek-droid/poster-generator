'use client'

import { useTranslations } from 'next-intl'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { EditorView } from './EditorViewContext'

interface Props {
  view: EditorView
  onChange: (view: EditorView) => void
  className?: string
}

/**
 * PROJ-36 (2026-05-13 pivot v2): single Switch at the bottom of the sidebar
 * labelled „Erweiterte Optionen". Default off — customer sees only the
 * customer-min controls. On → anpassen-classified sections are revealed
 * inline (additive, not a mode swap; see shouldRenderControl in
 * EditorViewContext).
 *
 * Replaces the previous segmented "Standard ↔ Anpassen" toggle (label
 * feedback: customers didn't understand "Standard / Anpassen" pairing) and
 * the original Sheet/Drawer (modal backdrop greyed out the canvas).
 *
 * Admin bypasses the gate (sees everything always), so we render nothing for
 * admins — the Switch would have no effect in their flow.
 */
export function EditorViewToggle({ view, onChange, className }: Props) {
  const t = useTranslations('editor')
  const { isAdmin } = useAuth()

  if (isAdmin) return null

  const checked = view === 'anpassen'

  return (
    <label
      className={cn(
        'flex items-center justify-between gap-3 cursor-pointer select-none rounded-md border border-border bg-white px-3 py-2',
        className,
      )}
    >
      <span className="text-xs font-medium text-foreground/80">
        {t('advancedOptions')}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={(on) => onChange(on ? 'anpassen' : 'customer')}
        aria-label={t('advancedOptions')}
      />
    </label>
  )
}
