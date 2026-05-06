/**
 * Registry of decoration SVGs that can be overlaid on a poster on top of the
 * map area. Decorations live in `/public/decorations/` and are referenced by
 * URL throughout the editor + preset config.
 *
 * Two ways a decoration ends up on a poster:
 *  1. Auto-applied when the user picks a mask whose `decoration_svg_url` points
 *     to one of these (PROJ-35, mask-bound case).
 *  2. Admin manually picks one in the editor sidebar and saves the design as
 *     a preset — the preset's `config_json.decorationSvgUrl` then re-applies
 *     it whenever a customer loads the preset.
 *
 * Adding a new decoration: drop the SVG in /public/decorations/ and append
 * an entry below. The picker UI updates automatically.
 */

export interface DecorationDefinition {
  key: string
  label: string
  url: string
}

export const DECORATIONS: DecorationDefinition[] = [
  {
    key: 'heart-divider',
    label: 'Herz-Trenner',
    url: '/decorations/heart-divider.svg',
  },
  {
    key: 'heart_love',
    label: 'Liebe-Schnörkel',
    url: '/decorations/heart_love-decoration.svg',
  },
]

export function findDecoration(url: string | null): DecorationDefinition | null {
  if (!url) return null
  return DECORATIONS.find((d) => d.url === url) ?? null
}
