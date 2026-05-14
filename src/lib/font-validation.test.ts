import { describe, expect, it } from 'vitest'
import { validateFontFile, buildFontStoragePath, MAX_FONT_FILE_BYTES } from './font-validation'

// Mock File-like object that lets us inject arbitrary first bytes without
// pulling in node-fetch's File polyfill.
function mockFile(name: string, head: number[], padding = 1000): {
  name: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
} {
  const total = head.length + padding
  const bytes = new Uint8Array(total)
  bytes.set(head, 0)
  // Fill the rest with deterministic-but-nonzero data so size > 16 check passes.
  for (let i = head.length; i < total; i += 1) bytes[i] = i & 0xff
  return {
    name,
    size: total,
    arrayBuffer: async () => bytes.buffer,
  }
}

describe('validateFontFile', () => {
  it('accepts a real TTF magic number with .ttf extension', async () => {
    const file = mockFile('Cathalia.ttf', [0x00, 0x01, 0x00, 0x00])
    const v = await validateFontFile(file)
    expect(v.ok).toBe(true)
    expect(v.format).toBe('ttf')
    expect(v.extension).toBe('.ttf')
  })

  it('accepts a real OTF magic number with .otf extension', async () => {
    const file = mockFile('Display.otf', [0x4f, 0x54, 0x54, 0x4f])
    const v = await validateFontFile(file)
    expect(v.ok).toBe(true)
    expect(v.format).toBe('otf')
  })

  it('accepts a real WOFF2 magic number with .woff2 extension', async () => {
    const file = mockFile('Allura.woff2', [0x77, 0x4f, 0x46, 0x32])
    const v = await validateFontFile(file)
    expect(v.ok).toBe(true)
    expect(v.format).toBe('woff2')
  })

  it('rejects a renamed file (TTF bytes inside .otf extension)', async () => {
    const file = mockFile('Renamed.otf', [0x00, 0x01, 0x00, 0x00])
    const v = await validateFontFile(file)
    expect(v.ok).toBe(false)
    expect(v.error).toMatch(/stimmt nicht mit dem Inhalt/i)
  })

  it('rejects unknown extensions', async () => {
    const file = mockFile('font.pdf', [0x25, 0x50, 0x44, 0x46])
    const v = await validateFontFile(file)
    expect(v.ok).toBe(false)
    expect(v.error).toMatch(/Nur \.woff2/i)
  })

  it('rejects files larger than 2 MB', async () => {
    const file = {
      name: 'huge.ttf',
      size: MAX_FONT_FILE_BYTES + 1,
      arrayBuffer: async () => new ArrayBuffer(MAX_FONT_FILE_BYTES + 1),
    }
    const v = await validateFontFile(file)
    expect(v.ok).toBe(false)
    expect(v.error).toMatch(/zu groß/i)
  })

  it('rejects WOFF1 even with matching magic number (we only allow WOFF2)', async () => {
    const file = mockFile('Old.ttf', [0x77, 0x4f, 0x46, 0x46])
    const v = await validateFontFile(file)
    expect(v.ok).toBe(false)
    // Either flagged for extension mismatch OR for being WOFF1 — both are
    // valid rejections of an invalid upload.
    expect(v.error).toMatch(/WOFF1|stimmt nicht/i)
  })

  it('rejects garbage bytes', async () => {
    const file = mockFile('font.ttf', [0xff, 0xff, 0xff, 0xff])
    const v = await validateFontFile(file)
    expect(v.ok).toBe(false)
    expect(v.error).toMatch(/keine gültige Font-Datei/i)
  })

  it('rejects files under 16 bytes', async () => {
    const file = {
      name: 'tiny.ttf',
      size: 10,
      arrayBuffer: async () => new Uint8Array([0x00, 0x01, 0x00, 0x00]).buffer,
    }
    const v = await validateFontFile(file)
    expect(v.ok).toBe(false)
    expect(v.error).toMatch(/zu klein/i)
  })
})

describe('buildFontStoragePath', () => {
  it('builds the canonical path', () => {
    expect(buildFontStoragePath('cormorant-garamond', 400, 'normal', '.ttf')).toBe(
      'cormorant-garamond/400-normal.ttf',
    )
    expect(buildFontStoragePath('cormorant-garamond', 700, 'italic', '.woff2')).toBe(
      'cormorant-garamond/700-italic.woff2',
    )
  })

  it('refuses path-traversal in slug', () => {
    expect(() => buildFontStoragePath('../etc', 400, 'normal', '.ttf')).toThrow()
    expect(() => buildFontStoragePath('a/b', 400, 'normal', '.ttf')).toThrow()
  })

  it('refuses extensions with dots or slashes', () => {
    expect(() => buildFontStoragePath('cathalia', 400, 'normal', '.tt/f')).toThrow()
    expect(() => buildFontStoragePath('cathalia', 400, 'normal', 'ttf')).toThrow()
  })
})
