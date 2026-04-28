'use client'

import { Suspense } from 'react'
import { PresetUrlApplier } from './PresetUrlApplier'
import {
  HeadlessMapRenderBridge,
  HeadlessStarMapRenderBridge,
} from './HeadlessRenderBridge'

interface HeadlessEditorViewProps {
  posterType: 'map' | 'star-map'
}

/**
 * Minimaler Editor-Mount für Worker-Render-Aufrufe (`?headless=1`).
 *
 * Wir laden bewusst NICHT `EditorShell`/`StarMapEditorShell`, weil:
 *  - kein Bedarf an Chrome (Sidebar, Toolbar, Tabs)
 *  - `useProjectSync` (Auto-Save) soll nicht laufen
 *  - DOM bleibt schlank → schnellerer Page-Load im Headless-Browser
 *
 * Was hier passiert:
 *  1. `PresetUrlApplier` liest `?preset=<id>` und füllt den Editor-Store
 *  2. `HeadlessRenderBridge` exposed `window.__renderPosterPng()` und setzt
 *     `window.__posterReady = true` nach Fonts + Delay
 *  3. Worker (Playwright) wartet auf `__posterReady`, ruft dann `__renderPosterPng()`
 *
 * `buildPosterCanvas()` (innerhalb von `renderPreview()`) erzeugt sich
 * selbst ein Offscreen-Map-Tile-Rendering — wir brauchen also keine
 * sichtbare `PosterCanvas` zum Triggern.
 */
export function HeadlessEditorView({ posterType }: HeadlessEditorViewProps) {
  return (
    <div className="fixed inset-0 bg-white" data-headless-editor={posterType}>
      <Suspense fallback={null}>
        <PresetUrlApplier posterType={posterType} />
      </Suspense>
      {posterType === 'map' ? <HeadlessMapRenderBridge /> : <HeadlessStarMapRenderBridge />}
    </div>
  )
}
