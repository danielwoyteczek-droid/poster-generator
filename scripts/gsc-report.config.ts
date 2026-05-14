/**
 * URLs, die bei jedem GSC-Report inspiziert werden (Indexierungs-Status).
 *
 * Kuratieren: Hier rein gehören die strategisch wichtigsten Pages —
 * neue Landing-Pages, SEO-Hubs, Editor-Einstiege. Limit ~50 wegen API-Quota.
 *
 * Für die Domain-Property gilt: vollständige https-URLs angeben.
 */
export const INSPECT_URLS: string[] = [
  // Startseite + Sprachvarianten
  'https://petite-moment.com/de',
  'https://petite-moment.com/en',

  // Editor-Einstiege
  'https://petite-moment.com/de/map',
  'https://petite-moment.com/de/star-map',
  'https://petite-moment.com/de/photo',
  'https://petite-moment.com/de/wedding',
  'https://petite-moment.com/de/typography',

  // Stadt-Karten-Hub (PROJ-44) + Top-Cities (PROJ-42)
  'https://petite-moment.com/de/stadtkarte',
  'https://petite-moment.com/de/stadtkarte/berlin',
  'https://petite-moment.com/de/stadtkarte/hamburg',
  'https://petite-moment.com/de/stadtkarte/muenchen',

  // Inspiration / Gallery
  'https://petite-moment.com/de/gallery',
]
