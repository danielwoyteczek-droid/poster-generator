import type { Metadata, Viewport } from 'next'
import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { TypographyEditorShell } from '@/components/typography/TypographyEditorShell'
import { EditorToolbar } from '@/components/editor/EditorToolbar'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('typography')
  return { title: t('pageTitle') }
}

// Match wedding / map / star-map / photo viewport — fixed-layout editor surface.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function TypographyPage() {
  return (
    <div className="h-dvh flex flex-col overflow-hidden pt-16">
      <LandingNav />
      <EditorToolbar posterType="typography" />
      <div className="flex-1 min-h-0">
        <TypographyEditorShell />
      </div>
    </div>
  )
}
