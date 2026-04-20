'use client'

import dynamic from 'next/dynamic'

const MapPreviewInner = dynamic(() => import('./MapPreviewInner'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-200 animate-pulse" />,
})

interface MapPreviewProps {
  storeSlice?: 'primary' | 'secondary'
}

export function MapPreview({ storeSlice = 'primary' }: MapPreviewProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapPreviewInner storeSlice={storeSlice} />
    </div>
  )
}
