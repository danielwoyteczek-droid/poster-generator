import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LandingNav } from '@/components/landing/LandingNav'
import { StarMapLayout } from '@/components/star-map/StarMapLayout'
import { PresetUrlApplier } from '@/components/editor/PresetUrlApplier'

export const metadata: Metadata = {
  title: 'Sternkarten-Editor | Poster Generator',
}

export default function StarMapPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden pt-14">
      <LandingNav />
      <Suspense fallback={null}>
        <PresetUrlApplier posterType="star-map" />
      </Suspense>
      <div className="flex-1 min-h-0">
        <StarMapLayout />
      </div>
    </div>
  )
}
