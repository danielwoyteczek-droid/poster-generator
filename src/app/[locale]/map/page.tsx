import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { EditorShell } from '@/components/editor/EditorShell'
import { LandingNav } from '@/components/landing/LandingNav'
import { PresetUrlApplier } from '@/components/editor/PresetUrlApplier'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('editorTabs')
  return { title: t('mapPageTitle') }
}

export default function MapPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden pt-16">
      <LandingNav />
      <Suspense fallback={null}>
        <PresetUrlApplier posterType="map" />
      </Suspense>
      <div className="flex-1 min-h-0">
        <EditorShell />
      </div>
    </div>
  )
}
