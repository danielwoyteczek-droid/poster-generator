import { defineType, defineField } from 'sanity'

/**
 * PROJ-24 Phase 4: lokalisierte Homepage-Inhalte (Hero + Beispiele).
 * Folgt dem `language`-Feld-Pattern von aboutPage/blogPost/faqItem/legalPage,
 * damit Marketing pro Sprache ein eigenes Dokument pflegt. Frontend
 * (Phase 5) queryt mit Locale-Filter und fällt pro Feld auf das DE-Default-
 * Dokument zurück, wenn ein Feld leer ist.
 */
export const homepage = defineType({
  name: 'homepage',
  title: 'Homepage',
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
      name: 'heroImageDesktop',
      title: 'Hero-Bild (Desktop)',
      type: 'image',
      description: 'Großes Bild im Hintergrund der Hero-Sektion. Wenn leer: Default-Bild aus /public.',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt-Text' }],
    }),
    defineField({
      name: 'heroImageMobile',
      title: 'Hero-Bild (Mobile)',
      type: 'image',
      description: 'Hochformat für Mobile. Wenn leer: Desktop-Bild oder Default.',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt-Text' }],
    }),
    defineField({
      name: 'examplesImages',
      title: 'Beispiel-Poster',
      type: 'array',
      description:
        'Beispielbilder, die in der „So sieht das aus"-Sektion gezeigt werden. Pro Locale individuell pflegbar — z. B. für FR Bilder von Paris/Lyon, für DE Hamburg/München. Reihenfolge entscheidet die Anzeige-Reihenfolge.',
      validation: (rule) => rule.max(6),
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'image',
              title: 'Bild',
              type: 'image',
              options: { hotspot: true },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Beschriftung',
              type: 'string',
              description: 'Anzeigetext unter dem Bild (in der Sprache dieses Dokuments).',
            }),
            defineField({
              name: 'href',
              title: 'Link-Ziel',
              type: 'string',
              description: 'Standardmäßig /map oder /star-map. Andere Pfade werden mit dem aktuellen Locale-Präfix kombiniert.',
              initialValue: '/map',
            }),
          ],
          preview: {
            select: { title: 'label', media: 'image' },
          },
        },
      ],
    }),
  ],
  preview: {
    select: { language: 'language' },
    prepare: ({ language }) => ({
      title: `Homepage — ${language ? language.toUpperCase() : '?'}`,
      subtitle: 'Hero & Beispiel-Poster',
    }),
  },
})
