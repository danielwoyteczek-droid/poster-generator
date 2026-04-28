import { defineType, defineField } from 'sanity'

/**
 * PROJ-29 Anlass-Landing-Pages: lokalisierte SEO-Hubs pro Anlass × Locale.
 *
 * Pro `(language × occasion)`-Kombination kann max. ein Dokument existieren.
 * Slugs sind keyword-recherchiert pro Locale (nicht 1:1 übersetzt) und leben
 * im Sanity-Doc, nicht im Code — Marketing kann sie eigenständig pflegen.
 *
 * Wichtige Unterschiede zu homepage/galleryPage:
 *  - Kein Per-Field-Fallback auf DE: fehlt das Locale-Doc → 404. SEO-Seite
 *    ohne markt-spezifischen Content schadet mehr als sie nutzt.
 *  - Sichtbarkeit ist ans Doc gekoppelt: Phase-Rollout (DE zuerst, dann
 *    EN/FR/IT/ES) entsteht automatisch dadurch, dass Marketing pro Locale
 *    bewusst Docs anlegt.
 *
 * Anlass-Codes (`occasion`) müssen synchron mit:
 *  - src/lib/occasions.ts (OCCASION_CODES)
 *  - DB-CHECK-Constraint `presets_occasions_valid`
 *  - galleryPage-Schema (`categories[].tag`)
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

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const occasionPage = defineType({
  name: 'occasionPage',
  title: 'Anlass-Seite',
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
      name: 'occasion',
      title: 'Anlass',
      type: 'string',
      description:
        'Bestimmt, welche Presets im Grid erscheinen (presets.occasions @> [code]) und ' +
        'welche Anlass-Sektion in der Galerie auf diese Seite verlinkt. Pro Sprache + ' +
        'Anlass darf nur ein Dokument existieren.',
      options: { list: [...OCCASION_OPTIONS] },
      validation: (rule) =>
        rule.required().custom(async (value, context) => {
          if (!value) return true
          const language = (context.document?.language as string | undefined) ?? null
          if (!language) return true
          const id = (context.document?._id as string | undefined) ?? ''
          const baseId = id.replace(/^drafts\./, '')
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const dupes = await client.fetch<string[]>(
            `*[_type == "occasionPage"
              && language == $language
              && occasion == $value
              && _id != $baseId
              && _id != $draftId]._id`,
            { language, value, baseId, draftId: `drafts.${baseId}` },
          )
          if (dupes && dupes.length > 0) {
            return 'Für diese Sprache + Anlass-Kombination existiert bereits ein Dokument.'
          }
          return true
        }),
    }),
    defineField({
      name: 'slug',
      title: 'URL-Slug',
      type: 'slug',
      description:
        'Locale-spezifischer URL-Bestandteil, keyword-recherchiert. Format: nur ' +
        'Kleinbuchstaben, Ziffern und Bindestriche. Beispiel DE: ' +
        '"geschenkideen-zum-muttertag", EN: "mothers-day-gift-ideas".',
      options: {
        maxLength: 96,
        slugify: (input: string) =>
          input
            .toLowerCase()
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
            .replace(/ß/g, 'ss')
            .replace(/[àáâã]/g, 'a').replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i').replace(/[òóôõ]/g, 'o')
            .replace(/[ùúûü]/g, 'u').replace(/ç/g, 'c').replace(/ñ/g, 'n')
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 96),
        isUnique: async (slug, context) => {
          const language = (context.document?.language as string | undefined) ?? null
          if (!language) return true
          const id = (context.document?._id as string | undefined) ?? ''
          const baseId = id.replace(/^drafts\./, '')
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const dupes = await client.fetch<string[]>(
            `*[_type == "occasionPage"
              && language == $language
              && slug.current == $slug
              && _id != $baseId
              && _id != $draftId]._id`,
            { language, slug, baseId, draftId: `drafts.${baseId}` },
          )
          return !dupes || dupes.length === 0
        },
      },
      validation: (rule) =>
        rule.required().custom((value) => {
          const slug = (value as { current?: string } | undefined)?.current
          if (!slug) return 'Slug ist erforderlich.'
          if (!SLUG_PATTERN.test(slug)) {
            return 'Slug darf nur a-z, 0-9 und Bindestriche enthalten (kein führender / abschließender Bindestrich, kein doppelter).'
          }
          return true
        }),
    }),
    defineField({
      name: 'previousSlugs',
      title: 'Frühere Slugs',
      type: 'array',
      description:
        'Optionale Liste alter Slugs für 301-Redirects nach Umbenennung. Wenn der ' +
        'Slug oben geändert wird, alten Wert hier eintragen — die App leitet alte ' +
        'URLs automatisch um, SEO-Saft bleibt erhalten.',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      validation: (rule) =>
        rule.custom((value, context) => {
          const list = (value as string[] | undefined) ?? []
          const currentSlug = (context.document?.slug as { current?: string } | undefined)?.current
          const seen = new Set<string>()
          for (const entry of list) {
            if (!entry) continue
            if (!SLUG_PATTERN.test(entry)) {
              return `„${entry}" ist kein gültiger Slug.`
            }
            if (currentSlug && entry === currentSlug) {
              return 'Aktueller Slug darf nicht in den früheren Slugs stehen.'
            }
            if (seen.has(entry)) {
              return `„${entry}" kommt doppelt vor.`
            }
            seen.add(entry)
          }
          return true
        }),
    }),
    defineField({
      name: 'pageTitle',
      title: 'Seiten-Headline (H1)',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'pageSubline',
      title: 'Sub-Headline',
      type: 'text',
      rows: 2,
      description: 'Optionaler Untertitel direkt unter der H1.',
      validation: (rule) => rule.max(280),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero-Bild (Desktop)',
      type: 'image',
      description:
        'Locale-spezifisches Stimmungsbild oben auf der Seite (Querformat empfohlen, z. B. 16:7). ' +
        'Pflicht — die Seite hat keinen Default-Fallback, sondern soll markt-authentisch wirken.',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt-Text' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroImageMobile',
      title: 'Hero-Bild (Mobile, optional)',
      type: 'image',
      description:
        'Optionale Hochformat- oder Quadrat-Variante für Mobil-Geräte (≤ 767 px). Empfohlen, ' +
        'wenn das Desktop-Motiv quer komponiert ist und auf Mobil seitlich beschnitten würde. ' +
        'Empfohlene Aspect-Ratio: 4:5 oder 1:1. Ohne Mobile-Bild wird das Desktop-Bild auch auf ' +
        'Mobil verwendet (mit object-cover beschnitten).',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt-Text' }],
    }),
    defineField({
      name: 'bodySections',
      title: 'Body-Sektionen',
      type: 'array',
      description:
        'Storytelling-Blöcke (1–4 Stück). Jeder Eintrag hat einen Sub-Heading (H2) und ' +
        'einen Rich-Text-Body. Zielwortmenge gesamt: ~400–600 Wörter.',
      validation: (rule) => rule.min(1).max(4),
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'heading',
              title: 'Sub-Heading (H2)',
              type: 'string',
              validation: (rule) => rule.required().max(120),
            }),
            defineField({
              name: 'body',
              title: 'Inhalt',
              type: 'portableText',
            }),
          ],
          preview: {
            select: { title: 'heading' },
          },
        },
      ],
    }),
    defineField({
      name: 'faq',
      title: 'FAQ-Einträge',
      type: 'array',
      description:
        'Optionale Frage/Antwort-Liste (max 8). Wird als Accordion gerendert und ' +
        'erzeugt zusätzlich Schema.org FAQPage-JSON-LD für Google Rich Results.',
      validation: (rule) => rule.max(8),
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'question',
              title: 'Frage',
              type: 'string',
              validation: (rule) => rule.required().max(220),
            }),
            defineField({
              name: 'answer',
              title: 'Antwort',
              type: 'text',
              rows: 4,
              validation: (rule) => rule.required().max(800),
            }),
          ],
          preview: {
            select: { title: 'question' },
          },
        },
      ],
    }),
    defineField({
      name: 'metaTitle',
      title: 'Meta-Titel (SEO)',
      type: 'string',
      description: 'Wird als <title> und Open-Graph-Title genutzt. Max 60 Zeichen für Google-Snippets.',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta-Beschreibung (SEO)',
      type: 'text',
      rows: 3,
      description: 'Wird als <meta description> und OG-Description genutzt. Max 160 Zeichen.',
      validation: (rule) => rule.required().max(160),
    }),
    defineField({
      name: 'ctaPosterType',
      title: 'CTA-Editor-Typ',
      type: 'string',
      description:
        'Bestimmt, ob der primäre „Eigenes Poster gestalten"-CTA in den Stadtposter- ' +
        'oder Sternenposter-Editor führt. Default: Stadtposter.',
      options: {
        list: [
          { title: 'Stadtposter (Map)', value: 'map' },
          { title: 'Sternenposter (Star-Map)', value: 'star-map' },
        ],
        layout: 'radio',
      },
      initialValue: 'map',
    }),
  ],
  orderings: [
    {
      title: 'Sprache + Anlass',
      name: 'languageOccasion',
      by: [
        { field: 'language', direction: 'asc' },
        { field: 'occasion', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: {
      language: 'language',
      occasion: 'occasion',
      title: 'pageTitle',
      media: 'heroImage',
    },
    prepare: ({ language, occasion, title, media }) => ({
      title: title ?? '(ohne Titel)',
      subtitle: `${language ? language.toUpperCase() : '?'} · ${occasion ?? '–'}`,
      media,
    }),
  },
})
