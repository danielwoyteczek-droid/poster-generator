'use client'

import { useEditorStore } from '@/hooks/useEditorStore'
import { useAuth } from '@/hooks/useAuth'
import { SaveButton } from './SaveButton'
import { SaveAsPresetButton } from './SaveAsPresetButton'
import { ResetEditorButton } from './ResetEditorButton'

interface Props {
  posterType: 'map' | 'star-map' | 'photo'
}

/**
 * Sub-Toolbar unterhalb der LandingNav für Editor-spezifische Aktionen.
 * Enthält Save/Preset/Reset-Buttons. Auf /map und /star-map sichtbar.
 *
 * Wenn der Admin gerade ein Preset bearbeitet (editingPreset gesetzt),
 * blenden wir den normalen "Speichern"-Button (Projekt-Save) aus, damit
 * der Admin nicht versehentlich ein neues Projekt anlegt statt das
 * Preset zu aktualisieren. Nur "Preset speichern" bleibt sichtbar.
 */
export function EditorToolbar({ posterType }: Props) {
  const { user, isAdmin } = useAuth()
  const editingPreset = useEditorStore((s) => s.editingPreset)
  const isEditingMatchingPreset =
    editingPreset !== null && editingPreset.posterType === posterType

  // Mobile-/User-View: nur die Save-Funktion (logged in) ohne extra Toolbar
  if (!user) return null

  return (
    <div className="hidden md:flex items-center justify-end gap-3 px-4 sm:px-6 py-2 bg-muted/40 border-b border-border/60">
      {/* Projekt-Save nur wenn KEIN Preset bearbeitet wird (sonst missverständlich) */}
      {!isEditingMatchingPreset && <SaveButton />}
      {isAdmin && <SaveAsPresetButton />}
      {isAdmin && <ResetEditorButton />}
    </div>
  )
}
