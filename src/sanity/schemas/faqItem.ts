import { defineType, defineField } from 'sanity'

export const faqItem = defineType({
  name: 'faqItem',
  title: 'FAQ-Eintrag',
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
        ],
        layout: 'radio',
      },
      initialValue: 'de',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'question',
      title: 'Frage',
      type: 'string',
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: 'answer',
      title: 'Antwort',
      type: 'portableText',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Kategorie',
      type: 'string',
      description: 'Frei wählbar, z.B. "Bestellung", "Versand", "Technik"',
    }),
    defineField({
      name: 'displayOrder',
      title: 'Reihenfolge',
      type: 'number',
      initialValue: 0,
      description: 'Kleinere Zahlen erscheinen weiter oben.',
    }),
  ],
  orderings: [
    {
      title: 'Reihenfolge',
      name: 'displayOrderAsc',
      by: [{ field: 'displayOrder', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'question', subtitle: 'category', order: 'displayOrder' },
    prepare: ({ title, subtitle, order }) => ({
      title,
      subtitle: subtitle ? `[${subtitle}] #${order ?? 0}` : `#${order ?? 0}`,
    }),
  },
})
