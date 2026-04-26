import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { StarMapEditorShell } from '@/components/star-map/StarMapEditorShell'
import { PresetUrlApplier } from '@/components/editor/PresetUrlApplier'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('editorTabs')
  return { title: t('starMapPageTitle') }
}

export default function StarMapPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden pt-16">
      <LandingNav />
      <Suspense fallback={null}>
        <PresetUrlApplier posterType="star-map" />
      </Suspense>
      <div className="flex-1 min-h-0">
        <StarMapEditorShell />
      </div>
    </div>
  )
}
