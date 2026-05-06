'use client'

import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Admin-only Layout-Mode-Switcher für den Foto-Poster-Editor. Customer
 * sieht das nicht — Mode-Wechsel passiert für ihn ausschließlich über
 * Preset-Auswahl (Editor-Low-Friction-Doktrin). Admin nutzt diesen Switch
 * zum Anlegen / Editieren von Presets pro Mode und für UAT.
 *
 * Sichtbarkeit kontrolliert der Parent (EditorToolbar) via `isAdmin`.
 */
export function PhotoModeAdminToggle() {
  const layoutMode = usePhotoEditorStore((s) => s.layoutMode)
  const setLayoutMode = usePhotoEditorStore((s) => s.setLayoutMode)

  return (
    <Select
      value={layoutMode}
      onValueChange={(v) => setLayoutMode(v as typeof layoutMode)}
    >
      <SelectTrigger className="h-8 w-[160px] text-xs" title="Layout-Modus (Admin)">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="letter-mask">Letter-Mask</SelectItem>
        <SelectItem value="single-photo">Single-Photo</SelectItem>
        <SelectItem value="photo-grid">Photo-Grid</SelectItem>
      </SelectContent>
    </Select>
  )
}
