import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { EditorShell } from '@/components/editor/EditorShell'
import { LandingNav } from '@/components/landing/LandingNav'
import { PresetUrlApplier } from '@/components/editor/PresetUrlApplier'
import { CityUrlApplier } from '@/components/editor/CityUrlApplier'
import { HeadlessEditorView } from '@/components/editor/HeadlessEditorView'
import { EditorToolbar } from '@/components/editor/EditorToolbar'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('editorTabs')
  return { title: t('mapPageTitle') }
}

// PROJ-43: lock the viewport so iOS Safari does NOT trigger
// shrink-to-fit when MapLibre renders its internal canvas at logical
// pixel width (800/1131/1600 px) wider than the device viewport
// (390 px). Without this the page auto-zooms-out and the customer has
// to pinch-zoom back in. Editor is a fixed-layout design surface, so
// disabling user-scaling is the right trade-off.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ headless?: string }>
}) {
  const params = await searchParams
  if (params.headless === '1') {
    return <HeadlessEditorView posterType="map" />
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden pt-16">
      <LandingNav />
      <Suspense fallback={null}>
        <PresetUrlApplier posterType="map" />
      </Suspense>
      <Suspense fallback={null}>
        <CityUrlApplier />
      </Suspense>
      <EditorToolbar posterType="map" />
      <div className="flex-1 min-h-0">
        <EditorShell />
      </div>
    </div>
  )
}
