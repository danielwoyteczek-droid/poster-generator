import { defineType, defineField } from 'sanity'

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About-Seite',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Überschrift',
      type: 'string',
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
      name: 'heroImage',
      title: 'Header-Bild (optional)',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt-Text' }],
    }),
    defineField({
      name: 'body',
      title: 'Inhalt',
      type: 'portableText',
    }),
  ],
})
