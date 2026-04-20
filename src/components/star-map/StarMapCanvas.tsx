'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useStarMapStore } from '@/hooks/useStarMapStore'
import { useEditorStore } from '@/hooks/useEditorStore'
import { PRINT_FORMATS } from '@/lib/print-formats'
import { renderStarMap, type StarEntry, type GeoFeature } from '@/lib/star-map-renderer'
import { TextBlockOverlay } from '@/components/editor/TextBlockOverlay'

export function StarMapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [posterSize, setPosterSize] = useState({ width: 0, height: 0 })
  const [starData, setStarData] = useState<StarEntry[]>([])
  const [constellationData, setConstellationData] = useState<GeoFeature[]>([])
  const [milkyWayData, setMilkyWayData] = useState<GeoFeature[]>([])
  const [loadError, setLoadError] = useState(false)

  const {
    lat, lng, datetime, locationName, posterBgColor, skyBgColor, starColor,
    showConstellations, showMilkyWay, showSun, showMoon, showPlanets,
    frameConfig,
    setPreviewSize,
  } = useStarMapStore()
  const { printFormat, setSelectedBlockId } = useEditorStore()
  const format = PRINT_FORMATS[printFormat]
  const ratio = format.widthMm / format.heightMm

  useEffect(() => {
    fetch('/bright-stars.json')
      .then((r) => r.json())
      .then((data: StarEntry[]) => setStarData(data))
      .catch(() => setLoadError(true))
  }, [])

  useEffect(() => {
    if (showConstellations && constellationData.length === 0) {
      fetch('/constellations.json')
        .then((r) => r.json())
        .then((d) => setConstellationData(d.features ?? []))
        .catch(() => {})
    }
  }, [showConstellations, constellationData.length])

  useEffect(() => {
    if (showMilkyWay && milkyWayData.length === 0) {
      fetch('/milky-way.json')
        .then((r) => r.json())
        .then((d) => setMilkyWayData(d.features ?? []))
        .catch(() => {})
    }
  }, [showMilkyWay, milkyWayData.length])

  useEffect(() => {
    if (!wrapperRef.current) return
    const PADDING = 64
    const compute = (w: number, h: number) => {
      const availW = w - PADDING
      const availH = h - PADDING
      if (availW <= 0 || availH <= 0) return
      const size = availW / ratio <= availH
        ? { width: availW, height: availW / ratio }
        : { width: availH * ratio, height: availH }
      setPosterSize(size)
      setPreviewSize(size.width, size.height)
    }
    const obs = new ResizeObserver(([e]) => compute(e.contentRect.width, e.contentRect.height))
    obs.observe(wrapperRef.current)
    compute(wrapperRef.current.clientWidth, wrapperRef.current.clientHeight)
    return () => obs.disconnect()
  }, [ratio])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || posterSize.width === 0 || starData.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = posterSize.width * dpr
    canvas.height = posterSize.height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    renderStarMap(ctx, {
      width: posterSize.width,
      height: posterSize.height,
      lat, lng,
      date: new Date(datetime),
      posterBgColor, skyBgColor, starColor,
      starData, constellationData, milkyWayData,
      showConstellations, showMilkyWay, showSun, showMoon, showPlanets,
      frameConfig,
    })
  }, [
    starData, constellationData, milkyWayData,
    lat, lng, datetime, posterBgColor, skyBgColor, starColor,
    showConstellations, showMilkyWay, showSun, showMoon, showPlanets,
    frameConfig, posterSize,
  ])

  useEffect(() => { draw() }, [draw])

  return (
    <div
      ref={wrapperRef}
      className="flex-1 relative bg-gray-100 min-h-0 overflow-hidden flex items-center justify-center"
    >
      {posterSize.width > 0 && (
        <div
          className="relative shadow-2xl flex-none overflow-hidden"
          style={{ width: posterSize.width, height: posterSize.height }}
          onPointerDown={() => setSelectedBlockId(null)}
        >
          <canvas
            ref={canvasRef}
            style={{ width: posterSize.width, height: posterSize.height, display: 'block' }}
          />
          <TextBlockOverlay coordinatesSource={{ lat, lng, locationName }} />
        </div>
      )}

      {loadError && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow px-4 py-3 text-xs text-gray-600 text-center max-w-xs">
          Sterndaten fehlen. Bitte{' '}
          <code className="bg-gray-100 px-1 rounded">public/bright-stars.json</code>{' '}
          hinzufügen.
        </div>
      )}
    </div>
  )
}
