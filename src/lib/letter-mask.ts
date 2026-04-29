/**
 * Letter-Mask domain — character set, validation, defaults.
 * Photo-poster mode where each glyph of a user-typed word becomes a
 * photo slot.
 */

export const LETTER_MASK_MIN = 3
export const LETTER_MASK_MAX = 10

const ALLOWED_CHAR_REGEX = /[A-ZÄÖÜß]/

/** Default starter word so the editor renders a meaningful preview before
 *  the customer types anything. Length 4 sits in the middle of the supported
 *  range. */
export const LETTER_MASK_DEFAULT_WORD = 'PAPA'

export const LETTER_MASK_DEFAULT_SLOT_COLOR = '#1F3A44'

/** Word-Width = horizontaler Anteil der Posterbreite, den das Letter-Mask-
 *  Wort einnimmt. Customer kann das per Slider anpassen, um die Buchstaben-
 *  größe zu steuern (Wort schmaler = kleinere Buchstaben, breiter = größer). */
export const LETTER_MASK_DEFAULT_WORD_WIDTH = 0.8
export const LETTER_MASK_MIN_WORD_WIDTH = 0.4
export const LETTER_MASK_MAX_WORD_WIDTH = 0.95

export type MaskFontKey = 'anton'

export interface MaskFontDefinition {
  key: MaskFontKey
  /** CSS font-family value referencing the next/font CSS variable. */
  cssFamily: string
  /** Visual scale factor for the slot height relative to slot width. Anton
   *  is tall and narrow, so a value > 1 reflects glyph proportions. Used
   *  by the layout engine to reserve enough vertical space. */
  heightOverWidth: number
  /** Multiplier applied to slot width to derive the CSS font-size. Anton
   *  glyphs are narrow — to fill a square-ish slot the font-size needs to
   *  be roughly 1.6× the slot width. */
  fontSizeOverSlotWidth: number
  label: string
}

export const MASK_FONTS: Record<MaskFontKey, MaskFontDefinition> = {
  anton: {
    key: 'anton',
    cssFamily: "var(--font-mask-anton), 'Anton', 'Impact', sans-serif",
    // Anton uppercase glyphs: cap height ≈ 0.72 em, average glyph width ≈
    // 0.55 em. To make a slot of width W roughly match the visual glyph
    // bounding box, we want font-size ≈ 1.65 × W (so glyph width ≈ W) and
    // slot height ≈ 1.2 × W (so glyph height ≈ slot height).
    heightOverWidth: 1.2,
    fontSizeOverSlotWidth: 1.65,
    label: 'Anton',
  },
}

/**
 * Sanitize a customer-typed string to the allowed Letter-Mask charset:
 * uppercased Latin A-Z plus German umlauts (ÄÖÜß). Truncates to the max
 * length and silently drops disallowed characters. Returns the cleaned
 * value — caller decides whether to also surface a hint when characters
 * were dropped.
 */
export function sanitizeLetterMaskInput(raw: string): string {
  const upper = raw.toLocaleUpperCase('de-DE')
  let out = ''
  for (const ch of upper) {
    if (ALLOWED_CHAR_REGEX.test(ch)) out += ch
    if (out.length >= LETTER_MASK_MAX) break
  }
  return out
}

export interface LetterMaskValidation {
  valid: boolean
  reason: 'too-short' | 'too-long' | 'invalid-chars' | null
}

export function validateLetterMaskWord(word: string): LetterMaskValidation {
  if (word.length < LETTER_MASK_MIN) return { valid: false, reason: 'too-short' }
  if (word.length > LETTER_MASK_MAX) return { valid: false, reason: 'too-long' }
  for (const ch of word) {
    if (!ALLOWED_CHAR_REGEX.test(ch)) return { valid: false, reason: 'invalid-chars' }
  }
  return { valid: true, reason: null }
}
