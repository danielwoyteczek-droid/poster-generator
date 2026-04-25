import { defineType, defineField } from 'sanity'

export const legalPage = defineType({
  name: 'legalPage',
  title: 'Rechtliche Seite',
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
      name: 'title',
      title: 'Titel',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL-Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
        slugify: (input) =>
          input
            .toLowerCase()
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            .slice(0, 96),
      },
      description: 'z.B. "impressum", "datenschutz", "agb", "widerrufsbelehrung", "cookie-richtlinie"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta-Beschreibung (SEO)',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.max(160),
    }),
    defineField({
      name: 'body',
      title: 'Inhalt',
      type: 'portableText',
    }),
    defineField({
      name: 'updatedAt',
      title: 'Zuletzt aktualisiert',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current' },
    prepare: ({ title, slug }) => ({ title, subtitle: `/${slug}` }),
  },
})
