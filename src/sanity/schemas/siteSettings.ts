import { defineType, defineField } from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Website-Einstellungen',
  type: 'document',
  fields: [
    defineField({
      name: 'contactEmail',
      title: 'Kontakt-E-Mail',
      type: 'string',
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social-Media-Links',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label', type: 'string', title: 'Bezeichnung (z.B. Instagram)' },
            { name: 'url', type: 'url', title: 'URL' },
          ],
          preview: { select: { title: 'label', subtitle: 'url' } },
        },
      ],
    }),
    defineField({
      name: 'footerNote',
      title: 'Footer-Hinweis (z.B. Copyright-Zeile)',
      type: 'string',
    }),
  ],
})
