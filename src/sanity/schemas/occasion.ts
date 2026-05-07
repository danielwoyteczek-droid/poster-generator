import { defineType, defineField } from 'sanity'

/**
 * Anlass (Occasion) — Stammdaten-Schema fuer Anlass-Tags.
 *
 * Bisher waren Anlaesse hardcoded in `src/lib/occasions.ts`. Dieses Schema
 * verschiebt die Definition ins Sanity Studio: Operator pflegt neue
 * Anlaesse, ohne dass ein Code-Deploy noetig ist.
 *
 * Anbindung:
 *  - galleryPage.categories[].tag → string-Code, validiert gegen die Liste
 *    der `occasion`-Docs (per Custom-Picker, Iteration 2)
 *  - occasionPage.occasion → analog
 *  - presets.occasions[]-Spalte (DB) → in Iteration 3 wird der starre
 *    CHECK-Constraint durch Application-Layer-Validierung ersetzt, die
 *    gegen die aktuelle Sanity-Liste prueft.
 *
 * Single Source of Truth fuer Anlass-Codes ab dem Abschluss von
 * PROJ-29 / PROJ-11-Refactor.
 */
export const occasion = defineType({
  name: 'occasion',
  title: 'Anlass',
  type: 'document',
  fields: [
    defineField({
      name: 'code',
      title: 'Code (Slug, intern)',
      type: 'slug',
      description:
        'Eindeutiger Identifier (z.B. "muttertag"). Wird in der Datenbank, in Sanity-Referenzen und in URLs ' +
        'verwendet. Nach Anlegen NICHT aendern — bricht sonst alle Verweise.',
      options: {
        source: 'title',
        maxLength: 64,
        slugify: (input) =>
          input
            .toLowerCase()
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Bezeichnung (Deutsch)',
      type: 'string',
      description:
        'Anzeigename in der Default-Sprache. Wird auch im Studio in Listen verwendet. Lokalisierte ' +
        'Varianten siehe Feld "Uebersetzungen".',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'displayOrder',
      title: 'Reihenfolge',
      type: 'number',
      description:
        'Niedrigere Werte zuerst (z.B. 1 = oben in Filter-Chips). Mehrere Anlaesse koennen denselben Wert ' +
        'haben — bei Gleichstand entscheidet das alphabetische Sortieren.',
      initialValue: 99,
    }),
    defineField({
      name: 'localizedTitles',
      title: 'Uebersetzungen',
      type: 'array',
      description:
        'Pro Locale ein Eintrag mit der lokalisierten Bezeichnung. Faellt eine Locale, faellt das Frontend ' +
        'auf die Default-Bezeichnung (Feld "Bezeichnung") zurueck.',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'locale',
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
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'title',
              title: 'Bezeichnung',
              type: 'string',
              validation: (rule) => rule.required().max(60),
            }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'locale' },
            prepare: ({ title, subtitle }) => ({
              title: title ?? '(leer)',
              subtitle: subtitle?.toUpperCase(),
            }),
          },
        },
      ],
    }),
    defineField({
      name: 'description',
      title: 'Beschreibung (intern, optional)',
      type: 'text',
      rows: 2,
      description:
        'Notiz fuer Operatoren (nicht oeffentlich). Z.B. "Saisonal", "Geschenk-Kategorie", oder warum ' +
        'dieser Anlass sich von einem aehnlichen unterscheidet.',
    }),
  ],
  orderings: [
    {
      title: 'Reihenfolge',
      name: 'displayOrderAsc',
      by: [{ field: 'displayOrder', direction: 'asc' }, { field: 'title', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'title', code: 'code.current', order: 'displayOrder' },
    prepare: ({ title, code, order }) => ({
      title: title ?? '(ohne Bezeichnung)',
      subtitle: code ? `${code} · #${order ?? '—'}` : 'kein Code gesetzt',
    }),
  },
})
