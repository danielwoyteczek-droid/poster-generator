import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PREVIEW_FORMAT,
  getAvailableFormats,
  getLargestAvailableFormat,
  getPreviewUrl,
  type PresetWithPreviews,
} from './preset-previews'

const FULLY_RENDERED: PresetWithPreviews = {
  preview_image_url: 'https://legacy.example.com/old.jpg',
  preview_image_url_a4: 'https://cdn.example.com/p-a4.jpg',
  preview_image_url_a3: 'https://cdn.example.com/p-a3.jpg',
  preview_image_url_a2: 'https://cdn.example.com/p-a2.jpg',
  render_status_a4: 'done',
  render_status_a3: 'done',
  render_status_a2: 'done',
}

describe('preset-previews helpers', () => {
  describe('getPreviewUrl', () => {
    it('returns the requested format when its render is done', () => {
      expect(getPreviewUrl(FULLY_RENDERED, 'a4')).toBe('https://cdn.example.com/p-a4.jpg')
      expect(getPreviewUrl(FULLY_RENDERED, 'a3')).toBe('https://cdn.example.com/p-a3.jpg')
      expect(getPreviewUrl(FULLY_RENDERED, 'a2')).toBe('https://cdn.example.com/p-a2.jpg')
    })

    it('defaults to A3 when no format requested', () => {
      expect(getPreviewUrl(FULLY_RENDERED)).toBe('https://cdn.example.com/p-a3.jpg')
      expect(DEFAULT_PREVIEW_FORMAT).toBe('a3')
    })

    it('falls back to A3 if requested format not done', () => {
      const partial: PresetWithPreviews = {
        ...FULLY_RENDERED,
        render_status_a2: 'pending',
        preview_image_url_a2: null,
      }
      expect(getPreviewUrl(partial, 'a2')).toBe('https://cdn.example.com/p-a3.jpg')
    })

    it('falls back through A3 → A4 → A2 chain', () => {
      const onlyA4: PresetWithPreviews = {
        preview_image_url: null,
        preview_image_url_a4: 'https://cdn.example.com/only-a4.jpg',
        render_status_a4: 'done',
        render_status_a3: 'pending',
        render_status_a2: 'failed',
      }
      // Requested A2 (failed) → A3 (pending) → A4 (done)
      expect(getPreviewUrl(onlyA4, 'a2')).toBe('https://cdn.example.com/only-a4.jpg')
      expect(getPreviewUrl(onlyA4, 'a3')).toBe('https://cdn.example.com/only-a4.jpg')
    })

    it('falls back to legacy preview_image_url when no per-format URL is done', () => {
      const legacyOnly: PresetWithPreviews = {
        preview_image_url: 'https://legacy.example.com/old.jpg',
        render_status_a4: 'pending',
        render_status_a3: 'pending',
        render_status_a2: 'pending',
      }
      expect(getPreviewUrl(legacyOnly, 'a3')).toBe('https://legacy.example.com/old.jpg')
    })

    it('returns null when nothing is available', () => {
      const empty: PresetWithPreviews = {
        preview_image_url: null,
        render_status_a4: 'pending',
        render_status_a3: 'pending',
        render_status_a2: 'pending',
      }
      expect(getPreviewUrl(empty, 'a3')).toBeNull()
    })

    it('treats failed/stale formats as unavailable', () => {
      const broken: PresetWithPreviews = {
        preview_image_url_a4: 'https://cdn.example.com/p-a4.jpg',
        preview_image_url_a3: 'https://cdn.example.com/p-a3.jpg',
        preview_image_url_a2: 'https://cdn.example.com/p-a2.jpg',
        render_status_a4: 'done',
        render_status_a3: 'failed',
        render_status_a2: 'stale',
      }
      // Falls through A3 (failed) → A4 (done)
      expect(getPreviewUrl(broken, 'a3')).toBe('https://cdn.example.com/p-a4.jpg')
    })
  })

  describe('getAvailableFormats', () => {
    it('returns all three when all rendered', () => {
      expect(getAvailableFormats(FULLY_RENDERED)).toEqual(['a4', 'a3', 'a2'])
    })

    it('omits non-done formats', () => {
      const partial: PresetWithPreviews = {
        render_status_a4: 'done',
        render_status_a3: 'pending',
        render_status_a2: 'failed',
      }
      expect(getAvailableFormats(partial)).toEqual(['a4'])
    })

    it('returns [a4] for legacy presets with only preview_image_url', () => {
      const legacy: PresetWithPreviews = {
        preview_image_url: 'https://legacy.example.com/old.jpg',
        render_status_a4: 'pending',
        render_status_a3: 'pending',
        render_status_a2: 'pending',
      }
      expect(getAvailableFormats(legacy)).toEqual(['a4'])
    })

    it('returns empty array when nothing available', () => {
      const empty: PresetWithPreviews = {
        preview_image_url: null,
        render_status_a4: 'pending',
        render_status_a3: 'pending',
        render_status_a2: 'pending',
      }
      expect(getAvailableFormats(empty)).toEqual([])
    })
  })

  describe('getLargestAvailableFormat', () => {
    it('prefers A2 when all done', () => {
      expect(getLargestAvailableFormat(FULLY_RENDERED)).toBe('a2')
    })

    it('falls back to A3 when A2 not done', () => {
      const noA2: PresetWithPreviews = {
        ...FULLY_RENDERED,
        render_status_a2: 'pending',
      }
      expect(getLargestAvailableFormat(noA2)).toBe('a3')
    })

    it('falls back to A4 when only A4 done', () => {
      const onlyA4: PresetWithPreviews = {
        render_status_a4: 'done',
        render_status_a3: 'pending',
        render_status_a2: 'pending',
      }
      expect(getLargestAvailableFormat(onlyA4)).toBe('a4')
    })

    it('returns A4 for legacy preset (back-compat fallback)', () => {
      const legacy: PresetWithPreviews = {
        preview_image_url: 'https://legacy.example.com/old.jpg',
      }
      expect(getLargestAvailableFormat(legacy)).toBe('a4')
    })

    it('returns null when nothing available', () => {
      expect(getLargestAvailableFormat({})).toBeNull()
    })
  })
})
