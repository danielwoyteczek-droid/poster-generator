'use client'

import { usePathname } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/hooks/useAuth'
import { useEditorStore } from '@/hooks/useEditorStore'
import { resetEditor } from '@/lib/admin/reset-editor'

/**
 * Admin-only "Editor zurücksetzen"-Button (PROJ-9 V1).
 * Sichtbar nur in /map und /star-map (auch unter /[locale]/map etc.).
 */
export function ResetEditorButton() {
  const { isAdmin } = useAuth()
  const pathname = usePathname()
  const editingPreset = useEditorStore((s) => s.editingPreset)

  if (!isAdmin) return null

  // Editor routes: /map, /star-map, plus their localized variants
  // /de/map, /en/star-map etc. We strip the locale prefix and check.
  const stripped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '')
  const isEditorRoute = stripped === '/map' || stripped === '/star-map' || stripped === '/photo'
  if (!isEditorRoute) return null

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          title="Editor in Default-Zustand zurücksetzen (Admin)"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Editor zurücksetzen
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Editor zurücksetzen?</AlertDialogTitle>
          <AlertDialogDescription>
            Alle nicht gespeicherten Änderungen am aktuellen Editor-Zustand
            gehen verloren. Dein Warenkorb und deine gespeicherten Projekte
            bleiben erhalten.
            {editingPreset && (
              <>
                <br /><br />
                Du bearbeitest aktuell <strong>„{editingPreset.name}"</strong> —
                Änderungen daran werden verworfen.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={resetEditor}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Zurücksetzen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
