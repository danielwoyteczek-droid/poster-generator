import { describe, expect, it } from 'vitest'
import {
  buildImageFileName,
  countImages,
  findDuplicateEntries,
  groupImagesByColor,
  hasOpenImages,
  isImageStale,
  isMockupCompatible,
  mockupThumbnail,
  supportsExtraColors,
} from './helpers'
import type { GeneratorImage, MockupSetOption } from './types'

function mockup(over: Partial<MockupSetOption> = {}): MockupSetOption {
  return {
    id: 'm1', slug: 'wand', name: 'Wand', provider: 'local', is_active: true,
    desktop_thumbnail_url: 'p.jpg', mobile_thumbnail_url: 'l.jpg',
    local_portrait_overlay_url: 'po.png', local_landscape_overlay_url: null,
    ...over,
  }
}

function image(over: Partial<GeneratorImage> = {}): GeneratorImage {
  return {
    id: 'i1', preset_id: 'p1', palette_id: null, mockup_set_id: 'm1', overlay_id: null,
    position: 1, status: 'done', error: null, image_url: 'x.jpg', width: 10, height: 10,
    rendered_at: '2026-09-16T10:00:00Z', waiting_for: null, stale: false,
    ...over,
  }
}

describe('isMockupCompatible', () => {
  it('lokales Mockup nur mit Overlay der Ausrichtung', () => {
    expect(isMockupCompatible(mockup(), 'portrait')).toBe(true)
    expect(isMockupCompatible(mockup(), 'landscape')).toBe(false)
  })
  it('Dynamic Mockups passen immer', () => {
    const dm = mockup({ provider: 'dynamic_mockups', local_portrait_overlay_url: null })
    expect(isMockupCompatible(dm, 'portrait')).toBe(true)
    expect(isMockupCompatible(dm, 'landscape')).toBe(true)
  })
})

describe('mockupThumbnail', () => {
  it('lokal quer nimmt das Querformat-Thumbnail', () => {
    expect(mockupThumbnail(mockup(), 'landscape')).toBe('l.jpg')
    expect(mockupThumbnail(mockup(), 'portrait')).toBe('p.jpg')
  })
  it('fällt auf das andere Thumbnail zurück', () => {
    expect(mockupThumbnail(mockup({ desktop_thumbnail_url: null }), 'portrait')).toBe('l.jpg')
  })
})

describe('Zähl- und Auswahlregeln', () => {
  it('Zusatzfarben nur für Karten', () => {
    expect(supportsExtraColors('map')).toBe(true)
    expect(supportsExtraColors('star-map')).toBe(false)
    expect(supportsExtraColors('photo')).toBe(false)
  })
  it('zählt Mockups × (1 + Zusatzfarben)', () => {
    expect(countImages(2, 0)).toBe(2)
    expect(countImages(2, 2)).toBe(6)
    expect(countImages(0, 3)).toBe(0)
  })
  it('findet doppelte Kombinationen, erlaubt gleiches Mockup mit anderem Overlay', () => {
    const entries = [
      { key: 'a', mockup_set_id: 'm1', overlay_id: null },
      { key: 'b', mockup_set_id: 'm1', overlay_id: 'o1' },
      { key: 'c', mockup_set_id: 'm1', overlay_id: null },
    ]
    expect(findDuplicateEntries(entries).map((e) => e.key)).toEqual(['c'])
  })
})

describe('Galerie', () => {
  it('veraltet nur, wenn fertig und vom Server als veraltet markiert', () => {
    expect(isImageStale(image({ stale: true }))).toBe(true)
    expect(isImageStale(image())).toBe(false)
    expect(isImageStale(image({ status: 'pending', stale: true }))).toBe(false)
  })
  it('erkennt offene Aufträge', () => {
    expect(hasOpenImages([image(), image({ status: 'rendering' })])).toBe(true)
    expect(hasOpenImages([image(), image({ status: 'failed' })])).toBe(false)
  })
  it('gruppiert Grundfarbe zuerst, sortiert nach Position', () => {
    const groups = groupImagesByColor([
      image({ id: 'a', palette_id: 'salbei', position: 1 }),
      image({ id: 'b', palette_id: null, position: 2 }),
      image({ id: 'c', palette_id: null, position: 1 }),
    ])
    expect(groups.map((g) => g.palette_id)).toEqual([null, 'salbei'])
    expect(groups[0].images.map((i) => i.id)).toEqual(['c', 'b'])
  })
  it('lässt leere Grundfarben-Gruppe weg', () => {
    expect(groupImagesByColor([image({ palette_id: 'sand' })]).map((g) => g.palette_id)).toEqual(['sand'])
  })
})

describe('buildImageFileName', () => {
  it('baut sprechende Namen', () => {
    expect(buildImageFileName({ position: 1, mockupName: 'Wand-Rahmen' })).toBe('01-wand-rahmen')
    expect(buildImageFileName({ position: 2, mockupName: 'Wand Rahmen', overlayName: 'Pfeil Größe' }))
      .toBe('02-wand-rahmen-pfeil-groesse')
    expect(buildImageFileName({ position: 1, mockupName: 'Closeup', paletteName: 'Salbei' }))
      .toBe('salbei-01-closeup')
  })
})
