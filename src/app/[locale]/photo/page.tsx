import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { PhotoEditorShell } from '@/components/photo-editor/PhotoEditorShell'
import { PresetUrlApplier } from '@/components/editor/PresetUrlApplier'
import { EditorToolbar } from '@/components/editor/EditorToolbar'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('editorTabs')
  return { title: t('photoPageTitle') }
}

export default function PhotoPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden pt-16">
      <LandingNav />
      <Suspense fallback={null}>
        <PresetUrlApplier posterType="photo" />
      </Suspense>
      <EditorToolbar posterType="photo" />
      <div className="flex-1 min-h-0">
        <PhotoEditorShell />
      </div>
    </div>
  )
}
