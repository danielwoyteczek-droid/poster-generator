import { create } from 'zustand'
import {
  DEFAULT_TYPOGRAPHY_TEMPLATE_KEY,
  TYPOGRAPHY_PALETTES,
  TYPOGRAPHY_FONTS,
  getTypographyTemplate,
} from '@/lib/typography-templates'
import type { Locale } from '@/i18n/config'

/**
 * PROJ-46: Editor-State für Typografie-Hochzeitsposter ("Liebespapier").
 *
 * Spiegelt das Pattern aus useWeddingEditorStore/usePhotoEditorStore: einfacher
 * Zustand-Store mit Setters, kein Side-Effect-Coupling. Persistence läuft
 * separat über useProjectSync('typography') und LocalStorage-Key
 * `poster-generator-draft-typography`.
 *
 * State-Shape ist absichtlich flach — alle Felder sind direkt vom Customer
 * editierbar (keine internen Computed-Werte). Datum wird als ISO-String
 * gehalten (YYYY-MM-DD), Locale-spezifische Formatierung passiert im Footer-
 * Component beim Render.
 */
export interface TypographyEditorStore {
  templateKey: string
  heroText: string
  name1: string
  name2: string
  /** ISO-Datum YYYY-MM-DD oder leerer String, wenn weggelassen (Datum ist optional). */
  weddingDate: string
  paletteId: string
  fontKey: string

  setTemplateKey: (key: string) => void
  setHeroText: (text: string) => void
  setName1: (name: string) => void
  setName2: (name: string) => void
  setWeddingDate: (date: string) => void
  setPaletteId: (id: string) => void
  setFontKey: (key: string) => void

  reset: () => void
  /** Wird vom Editor-Shell beim ersten Mount aufgerufen, um locale-spezifische
   *  Defaults (Hero-Text "ja"/"yes"/...) zu setzen, falls das Feld leer ist. */
  applyLocaleDefaults: (locale: Locale) => void
}

function getInitialState(): Omit<TypographyEditorStore,
  | 'setTemplateKey' | 'setHeroText' | 'setName1' | 'setName2'
  | 'setWeddingDate' | 'setPaletteId' | 'setFontKey'
  | 'reset' | 'applyLocaleDefaults'
> {
  return {
    templateKey: DEFAULT_TYPOGRAPHY_TEMPLATE_KEY,
    heroText: '',
    name1: '',
    name2: '',
    weddingDate: '',
    paletteId: TYPOGRAPHY_PALETTES[0].id,
    fontKey: TYPOGRAPHY_FONTS[0].key,
  }
}

export const useTypographyEditorStore = create<TypographyEditorStore>((set) => ({
  ...getInitialState(),

  setTemplateKey: (templateKey) => set({ templateKey }),
  setHeroText: (heroText) => set({ heroText }),
  setName1: (name1) => set({ name1 }),
  setName2: (name2) => set({ name2 }),
  setWeddingDate: (weddingDate) => set({ weddingDate }),
  setPaletteId: (paletteId) => set({ paletteId }),
  setFontKey: (fontKey) => set({ fontKey }),

  reset: () => set(getInitialState()),

  applyLocaleDefaults: (locale) =>
    set((s) => {
      const tpl = getTypographyTemplate(s.templateKey)
      if (!tpl || !tpl.hasHeroText || !tpl.defaultHeroText) return s
      // Nur überschreiben wenn Customer das Feld noch nicht angefasst hat.
      if (s.heroText.trim() !== '') return s
      return { heroText: tpl.defaultHeroText[locale] ?? '' }
    }),
}))
