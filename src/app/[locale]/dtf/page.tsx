import type { Metadata, Viewport } from 'next'
import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { DtfEditorShell } from '@/components/dtf-editor/DtfEditorShell'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dtfEditor')
  return { title: t('pageTitle') }
}

// Wie die anderen Editoren: feste Editor-Oberfläche, kein Shrink-to-fit und
// kein Zoom durch den Nutzer — sonst kämen sich Pinch-Zoom der Seite und
// das Skalieren der Motive in die Quere.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function DtfPage() {
  return (
    <div className="h-dvh flex flex-col overflow-hidden pt-16">
      <LandingNav />
      <div className="flex-1 min-h-0">
        <DtfEditorShell />
      </div>
    </div>
  )
}
