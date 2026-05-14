/**
 * PROJ-47: Admin-Font-Verwaltung
 *
 * Browser-side FontFace registration. Given a list of Font records (from the
 * DB-driven `/api/fonts` endpoint or the hardcoded `FALLBACK_FONTS`), this
 * module loads each style via the FontFace API and registers it in
 * `document.fonts`.
 *
 * Once registered, the font is usable by every renderer in the project:
 *   - the editor canvas (`PosterCanvas`, `StarMapCanvas`, `PhotoPosterCanvas`)
 *   - the export pipeline (`useMapExport`, `useStarMapExport`,
 *     `usePhotoExport`, `poster-from-snapshot`, `HeadlessRenderBridge`),
 *     all of which already await `document.fonts.ready` before drawing.
 *
 * The loader is idempotent per `<family_name, weight, style>` tuple — calling
 * it twice with the same font does not duplicate FontFace registrations.
 */

import type { Font, FontStyle } from './fonts'

interface RegisterableFontStyle extends FontStyle {
  familyName: string
}

const registered = new Map<string, Promise<void>>()

function styleKey(familyName: string, style: FontStyle): string {
  return `${familyName}::${style.weight}::${style.style}`
}

async function registerStyle(input: RegisterableFontStyle): Promise<void> {
  if (typeof document === 'undefined') return

  const key = styleKey(input.familyName, input)
  const existing = registered.get(key)
  if (existing) return existing

  const promise = (async () => {
    const face = new FontFace(input.familyName, `url(${JSON.stringify(input.url)})`, {
      weight: String(input.weight),
      style: input.style,
      display: 'swap',
    })
    try {
      await face.load()
      document.fonts.add(face)
    } catch (err) {
      console.warn('[fonts-loader] failed to load', input.familyName, input.weight, input.style, err)
      registered.delete(key)
      throw err
    }
  })()

  registered.set(key, promise)
  return promise
}

/**
 * Register every style of every font in the given list. Errors on individual
 * styles do not block the others — a failing FontFace is logged and skipped
 * so the customer at worst sees a system-font fallback for that one weight.
 */
export async function registerFonts(fonts: Font[]): Promise<void> {
  if (typeof document === 'undefined') return
  const tasks: Promise<unknown>[] = []
  for (const font of fonts) {
    for (const style of font.styles) {
      tasks.push(
        registerStyle({ ...style, familyName: font.family_name }).catch(() => undefined),
      )
    }
  }
  await Promise.all(tasks)
}

/**
 * Register a single font (used by the force-load path when an older project
 * references a font that is no longer in the published list).
 */
export async function registerSingleFont(font: Font): Promise<void> {
  await registerFonts([font])
}

/**
 * Test helper — wipes the in-memory registration tracker. Production code
 * never calls this; it exists so unit tests can re-run loading scenarios.
 */
export function _resetFontsLoaderForTests(): void {
  registered.clear()
}
