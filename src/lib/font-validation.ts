/**
 * PROJ-47: Admin-Font-Verwaltung — server-side file validation.
 *
 * Two-stage check for uploaded font files:
 *   1. MIME-Type / filename extension (cheap, easy to forge by renaming)
 *   2. Magic-Number sniff on the first bytes (binary, definitive)
 *
 * Reference table of magic numbers:
 *   TTF / TrueType:        00 01 00 00
 *   OTF / OpenType:        4F 54 54 4F  ("OTTO")
 *   WOFF / WOFF1:          77 4F 46 46  ("wOFF")
 *   WOFF2:                 77 4F 46 32  ("wOF2")
 *   TrueType-Collection:   74 74 63 66  ("ttcf") — collection container,
 *                          not supported by FontFace API natively, rejected.
 */

export type FontFileFormat = 'ttf' | 'otf' | 'woff2' | 'woff'

export interface FontFileValidation {
  ok: boolean
  format?: FontFileFormat
  extension?: string
  error?: string
}

export const MAX_FONT_FILE_BYTES = 2 * 1024 * 1024 // 2 MB

const ACCEPTED_EXTENSIONS = ['.woff2', '.ttf', '.otf'] as const

function getExtension(name: string): string | null {
  const lower = name.toLowerCase()
  const idx = lower.lastIndexOf('.')
  if (idx === -1) return null
  return lower.slice(idx)
}

function detectFormat(bytes: Uint8Array): FontFileFormat | null {
  if (bytes.length < 4) return null
  // TTF: 0x00 0x01 0x00 0x00
  if (bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) {
    return 'ttf'
  }
  // OTF: "OTTO" = 0x4F 0x54 0x54 0x4F
  if (bytes[0] === 0x4f && bytes[1] === 0x54 && bytes[2] === 0x54 && bytes[3] === 0x4f) {
    return 'otf'
  }
  // WOFF2: "wOF2" = 0x77 0x4F 0x46 0x32
  if (bytes[0] === 0x77 && bytes[1] === 0x4f && bytes[2] === 0x46 && bytes[3] === 0x32) {
    return 'woff2'
  }
  // WOFF1: "wOFF" = 0x77 0x4F 0x46 0x46
  if (bytes[0] === 0x77 && bytes[1] === 0x4f && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return 'woff'
  }
  return null
}

/**
 * Validates a font file by extension + magic-number. Mismatched extension
 * vs. magic-number is rejected ("file looks like .ttf but starts like .otf"
 * is almost always a renamed file, not a legitimate case).
 *
 * Returns the canonical extension to use for storage (e.g. `.woff2`) so the
 * caller does not need to trust the user-supplied filename.
 */
export async function validateFontFile(file: {
  name: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}): Promise<FontFileValidation> {
  if (file.size > MAX_FONT_FILE_BYTES) {
    return { ok: false, error: `Datei zu groß (${Math.round(file.size / 1024)} KB · max ${MAX_FONT_FILE_BYTES / 1024 / 1024} MB)` }
  }
  if (file.size < 16) {
    return { ok: false, error: 'Datei zu klein, vermutlich keine gültige Font-Datei' }
  }

  const ext = getExtension(file.name)
  if (!ext || !ACCEPTED_EXTENSIONS.includes(ext as typeof ACCEPTED_EXTENSIONS[number])) {
    return { ok: false, error: 'Nur .woff2 / .ttf / .otf akzeptiert' }
  }

  // Read the first 4 bytes to sniff the format. Avoid reading the entire
  // file just for the magic-number check.
  const buf = await file.arrayBuffer()
  const head = new Uint8Array(buf, 0, Math.min(4, buf.byteLength))
  const detected = detectFormat(head)

  if (!detected) {
    return {
      ok: false,
      error: 'Datei ist keine gültige Font-Datei (Magic-Number erkennt weder TTF/OTF/WOFF/WOFF2)',
    }
  }

  // WOFF1 is technically valid but not accepted — we list only .woff2 in
  // the extension whitelist, so this path is hit only when someone renamed
  // a .woff to .woff2 or similar mismatch.
  if (detected === 'woff') {
    return { ok: false, error: 'WOFF1 wird nicht unterstützt — bitte als WOFF2 hochladen' }
  }

  // Extension ↔ magic-number must match.
  const expectedExt: Record<FontFileFormat, string> = {
    ttf: '.ttf',
    otf: '.otf',
    woff2: '.woff2',
    woff: '.woff',
  }
  if (ext !== expectedExt[detected]) {
    return {
      ok: false,
      error: `Dateiendung ${ext} stimmt nicht mit dem Inhalt überein (sieht aus wie ${expectedExt[detected]})`,
    }
  }

  return { ok: true, format: detected, extension: expectedExt[detected] }
}

/**
 * Builds the canonical Supabase Storage path for a font style.
 *   fonts/{slug}/{weight}-{style}.{ext}
 */
export function buildFontStoragePath(
  fontId: string,
  weight: number,
  style: 'normal' | 'italic',
  extension: string,
): string {
  // Defensive sanity check — the caller validates these, but a stray slash
  // would punch through into another folder.
  if (!/^[a-z][a-z0-9-]*$/.test(fontId)) throw new Error('invalid font id')
  if (!/^\.[a-z0-9]+$/.test(extension)) throw new Error('invalid extension')
  return `${fontId}/${weight}-${style}${extension}`
}
