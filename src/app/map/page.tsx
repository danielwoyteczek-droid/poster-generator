import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EditorLayout } from '@/components/editor/EditorLayout'
import { LandingNav } from '@/components/landing/LandingNav'
import { PresetUrlApplier } from '@/components/editor/PresetUrlApplier'

export const metadata: Metadata = {
  title: 'Karten-Editor | Poster Generator',
}

export default function MapPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden pt-14">
      <LandingNav />
      <Suspense fallback={null}>
        <PresetUrlApplier posterType="map" />
      </Suspense>
      <div className="flex-1 min-h-0">
        <EditorLayout />
      </div>
    </div>
  )
}
