import { defineType, defineArrayMember } from 'sanity'

/**
 * Shared rich-text (Portable Text) field with sensible defaults:
 * headings, lists, inline links, block-level images, quotes, dividers.
 */
export const portableText = defineType({
  name: 'portableText',
  title: 'Inhalt',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Absatz', value: 'normal' },
        { title: 'Überschrift 2', value: 'h2' },
        { title: 'Überschrift 3', value: 'h3' },
        { title: 'Überschrift 4', value: 'h4' },
        { title: 'Zitat', value: 'blockquote' },
      ],
      lists: [
        { title: 'Aufzählung', value: 'bullet' },
        { title: 'Nummeriert', value: 'number' },
      ],
      marks: {
        decorators: [
          { title: 'Fett', value: 'strong' },
          { title: 'Kursiv', value: 'em' },
          { title: 'Unterstrichen', value: 'underline' },
          { title: 'Durchgestrichen', value: 'strike-through' },
        ],
        annotations: [
          defineArrayMember({
            name: 'link',
            type: 'object',
            title: 'Link',
            fields: [
              {
                name: 'href',
                type: 'url',
                title: 'URL',
                validation: (rule) =>
                  rule.uri({ scheme: ['http', 'https', 'mailto', 'tel'], allowRelative: true }),
              },
              {
                name: 'blank',
                type: 'boolean',
                title: 'In neuem Tab öffnen',
                initialValue: false,
              },
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'alt', type: 'string', title: 'Alt-Text (Barrierefreiheit)' },
        { name: 'caption', type: 'string', title: 'Bildunterschrift (optional)' },
      ],
    }),
    defineArrayMember({
      name: 'divider',
      type: 'object',
      title: 'Trennlinie',
      fields: [{ name: 'visible', type: 'boolean', initialValue: true, hidden: true }],
      preview: { prepare: () => ({ title: '— Trennlinie —' }) },
    }),
  ],
})
