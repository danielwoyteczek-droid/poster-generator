import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { StarMapEditorShell } from '@/components/star-map/StarMapEditorShell'
import { PresetUrlApplier } from '@/components/editor/PresetUrlApplier'
import { HeadlessEditorView } from '@/components/editor/HeadlessEditorView'
import { EditorToolbar } from '@/components/editor/EditorToolbar'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('editorTabs')
  return { title: t('starMapPageTitle') }
}

// PROJ-43: see /[locale]/map/page.tsx for rationale — fixed-layout
// editor surface, disable shrink-to-fit + user-scaling.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function StarMapPage({
  searchParams,
}: {
  searchParams: Promise<{ headless?: string }>
}) {
  const params = await searchParams
  if (params.headless === '1') {
    return <HeadlessEditorView posterType="star-map" />
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden pt-16">
      <LandingNav />
      <Suspense fallback={null}>
        <PresetUrlApplier posterType="star-map" />
      </Suspense>
      <EditorToolbar posterType="star-map" />
      <div className="flex-1 min-h-0">
        <StarMapEditorShell />
      </div>
    </div>
  )
}
