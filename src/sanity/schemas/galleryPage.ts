import { defineType, defineField } from 'sanity'

/**
 * PROJ-11 Beispielgalerie: lokalisierte Galerie-Seite.
 * Folgt dem `language`-Feld-Pattern von homepage/aboutPage/blogPost/faqItem,
 * damit Marketing pro Sprache ein eigenes Dokument pflegt. Frontend queryt
 * mit Locale-Filter und faellt pro Feld auf das DE-Default-Dokument zurueck.
 *
 * Struktur:
 *  - Galerie-Seiten-Inhalt (Hero, Headline) ist hier
 *  - Anlass-Sektionen werden in `categories[]` definiert (Reihenfolge,
 *    Heading, Subline, Stimmungsbild)
 *  - Die EIGENTLICHEN Preset-Cards einer Section werden zur Render-Zeit
 *    serverseitig gefetcht: alle published Presets mit
 *      target_locales @> [aktuelle Locale]
 *      AND occasions @> [categories[].tag]
 *
 * Anlass-Codes (`categories[].tag`) muessen synchron mit:
 *  - src/lib/occasions.ts (OCCASION_CODES)
 *  - DB-CHECK-Constraint `presets_occasions_valid`
 */

const OCCASION_OPTIONS = [
  { title: 'Muttertag', value: 'muttertag' },
  { title: 'Geburt', value: 'geburt' },
  { title: 'Hochzeit', value: 'hochzeit' },
  { title: 'Heimat', value: 'heimat' },
  { title: 'Reise', value: 'reise' },
  { title: 'Geschenk', value: 'geschenk' },
  { title: 'Jahrestag', value: 'jahrestag' },
  { title: 'Weihnachten', value: 'weihnachten' },
] as const

export const galleryPage = defineType({
  name: 'galleryPage',
  title: 'Galerie-Seite',
  type: 'document',
  fields: [
    defineField({
      name: 'language',
      title: 'Sprache',
      type: 'string',
      options: {
        list: [
          { title: 'Deutsch', value: 'de' },
          { title: 'English', value: 'en' },
          { title: 'Français', value: 'fr' },
          { title: 'Italiano', value: 'it' },
          { title: 'Español', value: 'es' },
        ],
        layout: 'radio',
      },
      initialValue: 'de',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'pageHeadline',
      title: 'Seiten-Headline',
      type: 'string',
      description: 'Haupt-Headline am Anfang der Galerie-Seite.',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'pageSubline',
      title: 'Seiten-Untertitel',
      type: 'text',
      rows: 2,
      description: 'Optionaler Untertitel unter der Headline.',
      validation: (rule) => rule.max(280),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero-Bild',
      type: 'image',
      description: 'Optionales Hero-Bild oben auf der Galerie-Seite. Wenn leer: kein Bild, nur Headline.',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt-Text' }],
    }),
    defineField({
      name: 'categories',
      title: 'Anlass-Sektionen',
      type: 'array',
      description:
        'Anlass-Sektionen in Anzeige-Reihenfolge. Jede Sektion zeigt automatisch alle Presets, die ' +
        'sowohl die aktuelle Sprache als auch den hier gewaehlten Anlass-Tag tragen. Sektionen ohne ' +
        'passende Presets werden im Frontend ausgeblendet.',
      validation: (rule) => rule.min(1).max(12),
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'tag',
              title: 'Anlass-Tag',
              type: 'string',
              description:
                'Verknuepft die Sektion mit Presets, die denselben Tag in `occasions` tragen. Liste ' +
                'muss synchron mit src/lib/occasions.ts gehalten werden.',
              options: { list: [...OCCASION_OPTIONS] },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Section-Heading',
              type: 'string',
              description: 'Sichtbarer Titel ueber der Sektion, z. B. „Geschenke zum Muttertag".',
              validation: (rule) => rule.required().max(120),
            }),
            defineField({
              name: 'subline',
              title: 'Section-Untertitel',
              type: 'text',
              rows: 2,
              description: 'Optionaler Erklaertext unter dem Heading.',
              validation: (rule) => rule.max(280),
            }),
            defineField({
              name: 'categoryImage',
              title: 'Stimmungsbild',
              type: 'image',
              description: 'Optionales Stimmungsbild fuer die Sektion (links/rechts vom Card-Grid).',
              options: { hotspot: true },
              fields: [{ name: 'alt', type: 'string', title: 'Alt-Text' }],
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'tag', media: 'categoryImage' },
            prepare: ({ title, subtitle, media }) => ({
              title: title ?? '(ohne Heading)',
              subtitle: subtitle ? `Tag: ${subtitle}` : 'Kein Tag gesetzt',
              media,
            }),
          },
        },
      ],
    }),
  ],
  preview: {
    select: { language: 'language', headline: 'pageHeadline' },
    prepare: ({ language, headline }) => ({
      title: `Galerie — ${language ? language.toUpperCase() : '?'}`,
      subtitle: headline ?? 'Ohne Headline',
    }),
  },
})
