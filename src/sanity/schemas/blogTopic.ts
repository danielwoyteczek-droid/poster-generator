import { defineType, defineField } from 'sanity'

export const blogTopic = defineType({
  name: 'blogTopic',
  title: 'Blog-Themen-Queue',
  type: 'document',
  fields: [
    defineField({
      name: 'topic',
      title: 'Thema / Titel-Idee',
      type: 'string',
      description: 'Kurze Beschreibung des Artikel-Themas, z. B. "5 Jahre Hochzeitstag: Geschenkideen"',
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: 'targetKeyword',
      title: 'Ziel-Keyword (SEO)',
      type: 'string',
      description: 'Das Such-Keyword, auf das der Artikel optimiert werden soll',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'category',
      title: 'Kategorie',
      type: 'string',
      description: 'z. B. Hochzeit, Geburt, Jubiläum, Geschenkideen',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Geplant', value: 'planned' },
          { title: 'Entworfen', value: 'drafted' },
          { title: 'Veröffentlicht', value: 'published' },
          { title: 'Übersprungen', value: 'skipped' },
        ],
        layout: 'radio',
      },
      initialValue: 'planned',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'priority',
      title: 'Priorität',
      type: 'number',
      description: 'Kleinere Zahlen werden zuerst verarbeitet (1 = höchste Priorität).',
      initialValue: 3,
      validation: (rule) => rule.min(1).max(5),
    }),
    defineField({
      name: 'notes',
      title: 'Notizen (optional)',
      type: 'text',
      rows: 3,
      description: 'Besondere Hinweise für die Generierung, z. B. gewünschte Länge, Zielgruppe, zu vermeidende Aspekte.',
    }),
    defineField({
      name: 'generatedPost',
      title: 'Generierter Artikel',
      type: 'reference',
      to: [{ type: 'blogPost' }],
      weak: true,
      description: 'Wird automatisch gesetzt, sobald ein Artikel generiert wurde. Kann auf einen noch nicht veröffentlichten Entwurf zeigen.',
    }),
    defineField({
      name: 'lastError',
      title: 'Letzter Fehler (falls Generierung fehlschlug)',
      type: 'text',
      rows: 3,
      readOnly: true,
    }),
  ],
  orderings: [
    {
      title: 'Priorität + Status',
      name: 'priorityStatus',
      by: [
        { field: 'status', direction: 'asc' },
        { field: 'priority', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: { title: 'topic', subtitle: 'status', priority: 'priority', category: 'category' },
    prepare: ({ title, subtitle, priority, category }) => ({
      title,
      subtitle: `[${subtitle ?? 'planned'}] · Prio ${priority ?? '—'} · ${category ?? 'ohne Kategorie'}`,
    }),
  },
})
