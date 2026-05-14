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
  // Wichtig: Stadt-Slugs haben Locale-Präfix — siehe src/lib/city-routing.ts
  //   DE: /de/stadtkarte/stadtkarte-<stadt>
  //   EN: /en/city-map/city-map-<stadt>
  'https://petite-moment.com/de/stadtkarte/',
  'https://petite-moment.com/de/stadtkarte/stadtkarte-berlin',
  'https://petite-moment.com/de/stadtkarte/stadtkarte-hamburg',
  'https://petite-moment.com/de/stadtkarte/stadtkarte-muenchen',
  'https://petite-moment.com/en/city-map/',
  'https://petite-moment.com/en/city-map/city-map-berlin',

  // Inspiration / Gallery
  'https://petite-moment.com/de/gallery',
]
