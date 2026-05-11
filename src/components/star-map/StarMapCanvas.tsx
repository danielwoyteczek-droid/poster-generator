'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useStarMapStore } from '@/hooks/useStarMapStore'
import { useEditorStore } from '@/hooks/useEditorStore'
import { PRINT_FORMATS, effectiveLogicalCanvas } from '@/lib/print-formats'
import { renderStarMap, type StarEntry, type GeoFeature } from '@/lib/star-map-renderer'
import { getStarTexture } from '@/lib/star-textures'
import { TextBlockOverlay } from '@/components/editor/TextBlockOverlay'
import { PreviewTriggerButton } from '@/components/editor/PreviewTriggerButton'
import { useStarMapExport } from '@/hooks/useStarMapExport'
import { loadSkyMaskImage } from '@/lib/load-mask-image'

interface StarMapCanvasProps {
  /** Total horizontal + vertical padding subtracted from wrapper before
   *  computing the poster size. Desktop default is 64 (32 px each side);
   *  Mobile passes a smaller value (e.g. 16) to maximise preview area. */
  padding?: number
  /** Forwards to TextBlockOverlay. On Mobile only the Text tab activates
   *  text-block dragging; other tabs pass `false`. Desktop leaves it
   *  undefined (TextBlockOverlay's own isMobile-fallback decides). */
  textInteractive?: boolean
}

export function StarMapCanvas({ padding = 64, textInteractive }: StarMapCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  // PROJ-37: visualSize = on-screen poster size (fitted into wrapper).
  // logicalCanvas = the virtual pixel canvas the renderer draws on; the
  // visual is derived via CSS-transform-scale. Same pattern as PosterCanvas.
  const [visualSize, setVisualSize] = useState({ width: 0, height: 0 })
  const [starData, setStarData] = useState<StarEntry[]>([])
  const [constellationData, setConstellationData] = useState<GeoFeature[]>([])
  const [milkyWayData, setMilkyWayData] = useState<GeoFeature[]>([])
  const [skyTextureImage, setSkyTextureImage] = useState<HTMLImageElement | null>(null)
  const [skyMaskImage, setSkyMaskImage] = useState<HTMLImageElement | null>(null)
  const [loadError, setLoadError] = useState(false)

  const {
    lat, lng, datetime, locationName, posterBgColor, skyBgColor, starColor,
    showConstellations, showMilkyWay, showSun, showMoon, showPlanets,
    showCompass, showGrid, gridOpacity, starDensity,
    textureKey, textureOpacity,
    maskKey,
    frameConfig,
    setPreviewSize,
  } = useStarMapStore()
  const { printFormat, orientation, setSelectedBlockId } = useEditorStore()
  const { renderPreview } = useStarMapExport()
  const format = PRINT_FORMATS[printFormat]
  const baseRatio = format.widthMm / format.heightMm
  const ratio = orientation === 'landscape' ? 1 / baseRatio : baseRatio
  const logicalCanvas = effectiveLogicalCanvas(printFormat, orientation)
  const visualScale = visualSize.width > 0 ? visualSize.width / logicalCanvas.width : 1

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
    const texture = getStarTexture(textureKey)
    if (!texture) {
      setSkyTextureImage(null)
      return
    }
    const img = new Image()
    let cancelled = false
    img.onload = () => { if (!cancelled) setSkyTextureImage(img) }
    img.src = texture.path
    return () => { cancelled = true }
  }, [textureKey])

  // PROJ-40: load the silhouette mask SVG so the renderer can intersect
  // the rendered sky with it via destination-in. Every silhouette including
  // 'circle' runs through this so the star projection geometry stays
  // identical regardless of which mask the customer picks.
  useEffect(() => {
    let cancelled = false
    loadSkyMaskImage(maskKey).then((img) => {
      if (!cancelled) setSkyMaskImage(img)
    })
    return () => { cancelled = true }
  }, [maskKey])

  useEffect(() => {
    if (!wrapperRef.current) return
    const compute = (w: number, h: number) => {
      const availW = w - padding
      const availH = h - padding
      if (availW <= 0 || availH <= 0) return
      const size = availW / ratio <= availH
        ? { width: availW, height: availW / ratio }
        : { width: availH * ratio, height: availH }
      setVisualSize(size)
      setPreviewSize(size.width, size.height)
    }
    const obs = new ResizeObserver(([e]) => compute(e.contentRect.width, e.contentRect.height))
    obs.observe(wrapperRef.current)
    compute(wrapperRef.current.clientWidth, wrapperRef.current.clientHeight)
    return () => obs.disconnect()
  }, [ratio, padding, setPreviewSize])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || logicalCanvas.width === 0 || starData.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // PROJ-37: render on the logical canvas size (A4=800, A3=1131, A2=1600 wide).
    // The visual size is achieved via CSS-transform-scale on the parent div.
    // DPR is folded into the bitmap so retina screens stay sharp.
    const dpr = window.devicePixelRatio || 1
    canvas.width = logicalCanvas.width * dpr
    canvas.height = logicalCanvas.height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    renderStarMap(ctx, {
      width: logicalCanvas.width,
      height: logicalCanvas.height,
      lat, lng,
      date: new Date(datetime),
      posterBgColor, skyBgColor, starColor,
      starData, constellationData, milkyWayData,
      showConstellations, showMilkyWay, showSun, showMoon, showPlanets,
      showCompass, showGrid, gridOpacity, starDensity,
      frameConfig,
      skyTextureImage,
      skyTextureOpacity: textureOpacity,
      skyMaskImage,
    })
  }, [
    starData, constellationData, milkyWayData,
    lat, lng, datetime, posterBgColor, skyBgColor, starColor,
    showConstellations, showMilkyWay, showSun, showMoon, showPlanets,
    showCompass, showGrid, gridOpacity, starDensity,
    frameConfig, logicalCanvas.width, logicalCanvas.height, skyTextureImage, textureOpacity, skyMaskImage,
  ])

  useEffect(() => { draw() }, [draw])

  return (
    <div
      ref={wrapperRef}
      className="flex-1 relative bg-muted min-h-0 overflow-hidden flex items-center justify-center"
    >
      <PreviewTriggerButton renderPreview={renderPreview} />
      {visualSize.width > 0 && (
        // PROJ-37: Visual wrapper reserves the on-screen space; the logical
        // poster div lives inside at A4/A3/A2 logical size and gets CSS-
        // transform-scaled to fit. Mirrors PosterCanvas exactly.
        <div
          className="flex-none relative"
          style={{ width: visualSize.width, height: visualSize.height }}
        >
          <div
            className="relative shadow-2xl overflow-hidden"
            style={{
              width: logicalCanvas.width,
              height: logicalCanvas.height,
              transform: `scale(${visualScale})`,
              transformOrigin: 'top left',
            }}
            onPointerDown={() => setSelectedBlockId(null)}
          >
            <canvas
              ref={canvasRef}
              style={{ width: logicalCanvas.width, height: logicalCanvas.height, display: 'block' }}
            />
            <TextBlockOverlay
              coordinatesSource={{ lat, lng, locationName }}
              canvasWidth={logicalCanvas.width}
              interactive={textInteractive}
            />
          </div>
        </div>
      )}

      {loadError && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow px-4 py-3 text-xs text-muted-foreground text-center max-w-xs">
          Sterndaten fehlen. Bitte{' '}
          <code className="bg-muted px-1 rounded">public/bright-stars.json</code>{' '}
          hinzufügen.
        </div>
      )}
    </div>
  )
}
