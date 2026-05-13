import type { Metadata, Viewport } from 'next'
import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { WeddingEditorShell } from '@/components/wedding/WeddingEditorShell'
import { EditorToolbar } from '@/components/editor/EditorToolbar'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('wedding')
  return { title: t('pageTitle') }
}

// PROJ-43: see /[locale]/map/page.tsx for rationale — fixed-layout
// editor surface, disable shrink-to-fit + user-scaling.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function WeddingPage() {
  return (
    <div className="h-dvh flex flex-col overflow-hidden pt-16">
      <LandingNav />
      <EditorToolbar posterType="wedding" />
      <div className="flex-1 min-h-0">
        <WeddingEditorShell />
      </div>
    </div>
  )
}
