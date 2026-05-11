import { defineType, defineField } from 'sanity'
import { CityIdInput } from '../components/CityIdInput'

/**
 * PROJ-42: Programmatic City Landing Pages — lokalisierte SEO-Hubs pro
 * Stadt × Locale. Analog zu PROJ-29 occasionPage, aber mit
 * String-FK auf cities.slug_base (Supabase) statt Anlass-Code.
 *
 * Pro `(language × cityId)`-Kombination kann max. ein Dokument existieren.
 * Slugs sind keyword-recherchiert pro Locale (nicht 1:1 uebersetzt) und
 * leben im Sanity-Doc, nicht im Code — Marketing kann sie eigenstaendig
 * pflegen.
 *
 * Visibility: kein Per-Field-Fallback auf DE. Fehlt das Locale-Doc → 404.
 * SEO-Seite ohne markt-spezifischen Content schadet mehr als sie nutzt.
 *
 * cityId-Validierung erfolgt zur Save-Zeit gegen den
 * /api/cities/validate-slug-base-Endpoint, der die Existenz in der
 * Supabase-cities-Tabelle prueft (String-FK-Pattern).
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

interface CityValidationResponse {
  valid: boolean
  name?: string
  country_code?: string
  error?: string
}

export const cityPage = defineType({
  name: 'cityPage',
  title: 'Stadt-Seite',
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
      name: 'cityId',
      title: 'Stadt',
      type: 'string',
      description:
        'Bestimmt, fuer welche Stadt diese Seite gilt. Auswahl aus der DB ' +
        '(cities-Tabelle). Pro Sprache + Stadt darf nur ein Dokument existieren. ' +
        'Wenn die gewuenschte Stadt fehlt, leg sie zuerst im Admin-Bereich an.',
      components: { input: CityIdInput },
      validation: (rule) =>
        rule.required().custom(async (value, context) => {
          if (!value) return true
          if (typeof value !== 'string') return 'CityId muss ein String sein.'

          // Pruefe Existenz in der DB (String-FK-Validator).
          try {
            const res = await fetch(
              `/api/cities/validate-slug-base?slug_base=${encodeURIComponent(value)}`,
              { headers: { Accept: 'application/json' } },
            )
            if (!res.ok) {
              return `Stadt-Validierung fehlgeschlagen (HTTP ${res.status}). ` +
                `Bitte pruefe, ob die Stadt in der DB existiert.`
            }
            const data = (await res.json()) as CityValidationResponse
            if (!data.valid) {
              return `Stadt "${value}" existiert nicht in der cities-Tabelle. ` +
                `Lege sie zuerst im Admin-Bereich an oder waehle eine andere.`
            }
          } catch (err) {
            return `Stadt-Validierung fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`
          }

          // Pruefe Eindeutigkeit (language, cityId).
          const language = (context.document?.language as string | undefined) ?? null
          if (!language) return true
          const id = (context.document?._id as string | undefined) ?? ''
          const baseId = id.replace(/^drafts\./, '')
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const dupes = await client.fetch<string[]>(
            `*[_type == "cityPage"
              && language == $language
              && cityId == $value
              && _id != $baseId
              && _id != $draftId]._id`,
            { language, value, baseId, draftId: `drafts.${baseId}` },
          )
          if (dupes && dupes.length > 0) {
            return 'Fuer diese Sprache + Stadt-Kombination existiert bereits ein Dokument.'
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
        '"stadtkarte-hamburg", EN: "city-map-london". Default-Vorschlag baut ' +
        'sich aus "<locale-prefix>-<cityId>" zusammen, kann hier angepasst werden.',
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
            `*[_type == "cityPage"
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
            return 'Slug darf nur a-z, 0-9 und Bindestriche enthalten (kein fuehrender / abschliessender Bindestrich, kein doppelter).'
          }
          return true
        }),
    }),
    defineField({
      name: 'previousSlugs',
      title: 'Frühere Slugs',
      type: 'array',
      description:
        'Optionale Liste alter Slugs fuer 301-Redirects nach Umbenennung. Wenn ' +
        'der Slug oben geaendert wird, alten Wert hier eintragen — die App leitet ' +
        'alte URLs automatisch um, SEO-Saft bleibt erhalten.',
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
              return `„${entry}" ist kein gueltiger Slug.`
            }
            if (currentSlug && entry === currentSlug) {
              return 'Aktueller Slug darf nicht in den frueheren Slugs stehen.'
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
      description: 'Beispiel: "Stadtkarte Hamburg als Poster".',
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
      name: 'bodySections',
      title: 'Body-Sektionen',
      type: 'array',
      description:
        'Storytelling-Bloecke (1–4 Stueck) mit Sub-Heading (H2) + Rich-Text-Body. ' +
        'Zielwortmenge gesamt: ~200–300 Woerter. Themen z. B.: Wahrzeichen, ' +
        'Geschichte/Charakter, Stadtviertel/Atmosphaere.',
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
      name: 'metaTitle',
      title: 'Meta-Titel (SEO)',
      type: 'string',
      description: 'Wird als <title> und Open-Graph-Title genutzt. Max 60 Zeichen fuer Google-Snippets.',
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
      name: 'aiDraftStatus',
      title: 'Draft-Status',
      type: 'string',
      description:
        'Marketing-internes Tracking: "draft" = AI-generiert und nicht reviewt; ' +
        '"reviewed" = Marketing hat editiert/abgesegnet; "published" = Optional ' +
        'erweiterter Status. Frontend prueft das NICHT — Live-Schaltung haengt ' +
        'an der Doc-Existenz, dieser Status ist nur Workflow-Hilfe.',
      options: {
        list: [
          { title: 'Draft (ungeprueft)', value: 'draft' },
          { title: 'Reviewed (Marketing geprueft)', value: 'reviewed' },
          { title: 'Published (gepflegt)', value: 'published' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
    }),
  ],
  orderings: [
    {
      title: 'Sprache + Stadt',
      name: 'languageCity',
      by: [
        { field: 'language', direction: 'asc' },
        { field: 'cityId', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: {
      language: 'language',
      cityId: 'cityId',
      title: 'pageTitle',
      status: 'aiDraftStatus',
    },
    prepare: ({ language, cityId, title, status }) => {
      const statusBadge =
        status === 'draft' ? ' [DRAFT]' : status === 'reviewed' ? ' [REVIEWED]' : ''
      return {
        title: (title ?? '(ohne Titel)') + statusBadge,
        subtitle: `${language ? language.toUpperCase() : '?'} · ${cityId ?? '–'}`,
      }
    },
  },
})
