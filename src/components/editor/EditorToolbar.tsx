'use client'

import { useEditorStore } from '@/hooks/useEditorStore'
import { useAuth } from '@/hooks/useAuth'
import { SaveButton } from './SaveButton'
import { SaveAsPresetButton } from './SaveAsPresetButton'
import { ResetEditorButton } from './ResetEditorButton'
import { PhotoModeAdminToggle } from '@/components/photo-editor/PhotoModeAdminToggle'

interface Props {
  posterType: 'map' | 'star-map' | 'photo' | 'wedding' | 'typography'
}

/**
 * Sub-Toolbar unterhalb der LandingNav für Editor-spezifische Aktionen.
 * Enthält Save/Preset/Reset-Buttons. Auf /map und /star-map sichtbar.
 *
 * Wenn der Admin gerade ein Preset bearbeitet (editingPreset gesetzt),
 * relabeln wir den Projekt-Save zu "Als Projekt sichern", damit klar
 * ist: dieser Button legt ein eigenes Projekt an, "Preset speichern"
 * daneben aktualisiert das Preset.
 */
export function EditorToolbar({ posterType }: Props) {
  const { user, isAdmin } = useAuth()
  const editingPreset = useEditorStore((s) => s.editingPreset)
  const isEditingMatchingPreset =
    editingPreset !== null && editingPreset.posterType === posterType

  // Mobile-/User-View: nur die Save-Funktion (logged in) ohne extra Toolbar
  if (!user) return null

  // PROJ-46: Save/Preset/Reset für Typografie-Editor noch nicht verdrahtet
  // (kommt mit Chunk 2 + PROJ-5-Integration). Toolbar bleibt vorerst leer.
  if (posterType === 'typography') return null

  return (
    <div className="hidden md:flex items-center justify-end gap-3 px-4 sm:px-6 py-2 bg-muted/40 border-b border-border/60">
      {/* Admin-only Photo-Mode-Switcher — Customer wechselt Mode via Preset */}
      {isAdmin && posterType === 'photo' && <PhotoModeAdminToggle />}
      <SaveButton posterType={posterType} relabelAsProject={isEditingMatchingPreset} />
      {isAdmin && <SaveAsPresetButton />}
      {isAdmin && <ResetEditorButton />}
    </div>
  )
}
