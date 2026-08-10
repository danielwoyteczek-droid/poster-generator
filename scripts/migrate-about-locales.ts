#!/usr/bin/env tsx
/**
 * One-shot migration:
 *  1. Patch existing aboutPage (id="aboutPage"):
 *     - set language="de"
 *     - rewrite block 6 (Druckqualität) to drop "in Deutschland"
 *     - rewrite block 9 (Über uns paragraph) to drop placeholders
 *  2. Create 4 new docs (en/fr/it/es) with translated title, metaDescription
 *     and full body. Body structure mirrors the DE doc (h2/normal/strong+text/
 *     email link via markDef).
 *
 * Run: npx tsx scripts/migrate-about-locales.ts          (dry-run, prints plan)
 *      npx tsx scripts/migrate-about-locales.ts --apply  (write to Sanity)
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { randomUUID } from 'node:crypto'

loadEnv({ path: '.env.local' })

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  useCdn: false,
})

const APPLY = process.argv.includes('--apply')

// ---------------------------------------------------------------------------
// Block-builder helpers — short ids so keys stay readable in Studio.
// ---------------------------------------------------------------------------
const key = () => randomUUID().replace(/-/g, '').slice(0, 12)

type Span = { text: string; marks?: string[] }
type MarkDef = { _key: string; _type: string; href?: string }

function block(style: 'h2' | 'normal', spans: Span[], markDefs: MarkDef[] = []) {
  return {
    _key: key(),
    _type: 'block',
    style,
    markDefs,
    children: spans.map((s) => ({
      _key: key(),
      _type: 'span',
      marks: s.marks ?? [],
      text: s.text,
    })),
  }
}

/** Paragraph with **bold lead-in**, then trailing text. */
function leadIn(lead: string, rest: string) {
  return block('normal', [
    { text: lead, marks: ['strong'] },
    { text: rest },
  ])
}

/** Paragraph with trailing `email` rendered as mailto link. */
function paraWithEmail(prefix: string, email: string, suffix: string) {
  const linkKey = key()
  return {
    _key: key(),
    _type: 'block',
    style: 'normal',
    markDefs: [{ _key: linkKey, _type: 'link', href: `mailto:${email}` }],
    children: [
      { _key: key(), _type: 'span', marks: [], text: prefix },
      { _key: key(), _type: 'span', marks: [linkKey], text: email },
      { _key: key(), _type: 'span', marks: [], text: suffix },
    ],
  }
}

// ---------------------------------------------------------------------------
// Locale content
// ---------------------------------------------------------------------------

type LocaleCopy = {
  language: 'de' | 'en' | 'fr' | 'it' | 'es'
  title: string
  metaDescription: string
  h2_hero: string
  p_origin: string
  p_what: string
  h2_values: string
  v_simplicity_lead: string
  v_simplicity_rest: string
  v_print_lead: string
  v_print_rest: string
  v_honesty_lead: string
  v_honesty_rest: string
  h2_about: string
  p_about: string
  p_contact_prefix: string
  p_contact_suffix: string
}

const CONTACT_EMAIL = 'love@petite-moment.com'

const COPY: Record<LocaleCopy['language'], LocaleCopy> = {
  de: {
    language: 'de',
    title: 'Über Petite-Moment',
    metaDescription:
      'Kartenposter für Erinnerungen, die bleiben. Handgemacht in München – gestaltet für Menschen, die einen besonderen Ort für immer festhalten möchten.',
    h2_hero: 'Kleine Momente. Große Bedeutung.',
    p_origin:
      'petite-moment ist aus einer simplen Idee entstanden: Manche Orte verdienen mehr als ein Foto im Handyalbum. Der Platz, an dem sich zwei Menschen zum ersten Mal getroffen haben. Die Stadt, in der ein Kind geboren wurde. Der Strand, an dem ein „Ja" gesagt wurde.',
    p_what:
      'Wir machen diese Koordinaten sichtbar. Als Poster. Nicht als Massenware, sondern als ruhige, typografische Erinnerung, die in ein Regal, ein Schlafzimmer oder ein Arbeitszimmer passt, ohne laut zu sein.',
    h2_values: 'Was uns wichtig ist',
    v_simplicity_lead: 'Einfachheit.',
    v_simplicity_rest:
      ' Du suchst einen Ort, passt Stil und Format an, schreibst deinen Text. Fertig. Kein Designstudium nötig.',
    v_print_lead: 'Druckqualität.',
    v_print_rest:
      ' Jedes Poster wird auf Premium-Papier gedruckt und sorgfältig verpackt verschickt.',
    v_honesty_lead: 'Ehrlichkeit.',
    v_honesty_rest:
      ' Wir verwenden Kartendaten von MapTiler, zahlen faire Lizenzen und verstecken keine versteckten Kosten im Checkout.',
    h2_about: 'Über uns',
    p_about:
      'petite-moment ist ein kleines Projekt der UMOI GmbH aus München. Dahinter steht ein kleines Team aus Designern und Entwicklern, das irgendwann beschlossen hat, dass Kartenposter schöner, zugänglicher und persönlicher sein können — ohne dabei Vintage-Tourismusladen-Vibes zu versprühen.',
    p_contact_prefix:
      'Hast du eine Frage, Idee oder möchtest einfach Hallo sagen? Schreib uns an ',
    p_contact_suffix: '.',
  },
  en: {
    language: 'en',
    title: 'About Petite-Moment',
    metaDescription:
      'Map posters for memories that last. Handmade in Munich — designed for people who want to hold on to a special place forever.',
    h2_hero: 'Small moments. Big meaning.',
    p_origin:
      'petite-moment grew from a simple idea: some places deserve more than a photo in your phone gallery. The spot where two people met for the first time. The city where a child was born. The beach where someone said "yes".',
    p_what:
      'We make those coordinates visible. As posters. Not mass-produced, but as quiet, typographic reminders that fit on a shelf, in a bedroom, or on an office wall — without being loud about it.',
    h2_values: 'What matters to us',
    v_simplicity_lead: 'Simplicity.',
    v_simplicity_rest:
      ' You search a place, adjust style and format, write your text. Done. No design degree required.',
    v_print_lead: 'Print quality.',
    v_print_rest:
      ' Every poster is printed on premium paper and shipped carefully packaged.',
    v_honesty_lead: 'Honesty.',
    v_honesty_rest:
      ' We use map data from MapTiler, pay fair licensing fees, and never hide surprise costs at checkout.',
    h2_about: 'About us',
    p_about:
      'petite-moment is a small project by UMOI GmbH, based in Munich. Behind it stands a small team of designers and developers who decided that map posters can be more beautiful, more accessible, and more personal — without the vintage tourist-shop vibes.',
    p_contact_prefix:
      'Got a question, an idea, or just want to say hi? Drop us a line at ',
    p_contact_suffix: '.',
  },
  fr: {
    language: 'fr',
    title: 'À propos de Petite-Moment',
    metaDescription:
      "Posters cartographiques pour des souvenirs qui durent. Faits main à Munich — pensés pour celles et ceux qui veulent immortaliser un lieu cher.",
    h2_hero: 'Petits moments. Grande importance.',
    p_origin:
      "petite-moment est né d'une idée simple : certains lieux méritent mieux qu'une photo dans la galerie du téléphone. L'endroit où deux personnes se sont rencontrées pour la première fois. La ville où un enfant est né. La plage où l'on a dit « oui ».",
    p_what:
      "Nous rendons ces coordonnées visibles. Sous forme d'affiches. Pas en série, mais comme des souvenirs typographiques discrets, qui trouvent leur place sur une étagère, dans une chambre ou un bureau — sans en faire trop.",
    h2_values: 'Ce qui compte pour nous',
    v_simplicity_lead: 'Simplicité.',
    v_simplicity_rest:
      " Tu cherches un lieu, ajustes le style et le format, écris ton texte. Fini. Pas besoin d'études en design.",
    v_print_lead: "Qualité d'impression.",
    v_print_rest:
      ' Chaque poster est imprimé sur du papier premium et expédié dans un emballage soigné.',
    v_honesty_lead: 'Honnêteté.',
    v_honesty_rest:
      " Nous utilisons les données cartographiques de MapTiler, payons des licences justes et n'ajoutons aucun frais caché à la commande.",
    h2_about: 'À propos de nous',
    p_about:
      "petite-moment est un petit projet d'UMOI GmbH, basé à Munich. Derrière, une petite équipe de designers et de développeurs qui ont décidé un jour que les posters cartographiques pouvaient être plus beaux, plus accessibles et plus personnels — sans tomber dans l'esprit boutique de souvenirs vintage.",
    p_contact_prefix:
      "Une question, une idée, ou juste envie de dire bonjour ? Écris-nous à ",
    p_contact_suffix: '.',
  },
  it: {
    language: 'it',
    title: 'Chi siamo — Petite-Moment',
    metaDescription:
      'Poster cartografici per ricordi che restano. Fatti a mano a Monaco di Baviera — pensati per chi vuole immortalare un luogo speciale.',
    h2_hero: 'Piccoli momenti. Grande significato.',
    p_origin:
      "petite-moment è nato da un'idea semplice: alcuni luoghi meritano più di una foto nella galleria del telefono. Il posto dove due persone si sono incontrate per la prima volta. La città in cui è nato un bambino. La spiaggia dove qualcuno ha detto «sì».",
    p_what:
      'Rendiamo visibili quelle coordinate. Come poster. Non in serie, ma come ricordi tipografici discreti, che trovano posto su una mensola, in una camera o in uno studio — senza alzare la voce.',
    h2_values: 'Ciò che ci sta a cuore',
    v_simplicity_lead: 'Semplicità.',
    v_simplicity_rest:
      ' Cerchi un luogo, regoli stile e formato, scrivi il tuo testo. Fatto. Niente laurea in design.',
    v_print_lead: 'Qualità di stampa.',
    v_print_rest:
      ' Ogni poster è stampato su carta premium e spedito con cura.',
    v_honesty_lead: 'Onestà.',
    v_honesty_rest:
      ' Usiamo dati cartografici di MapTiler, paghiamo licenze eque e non nascondiamo costi a sorpresa al checkout.',
    h2_about: 'Chi siamo',
    p_about:
      "petite-moment è un piccolo progetto di UMOI GmbH, con sede a Monaco di Baviera. Dietro c'è un piccolo team di designer e sviluppatori che a un certo punto ha deciso che i poster cartografici possono essere più belli, più accessibili e più personali — senza le vibes da negozio di souvenir vintage.",
    p_contact_prefix:
      "Hai una domanda, un'idea o vuoi solo salutarci? Scrivici a ",
    p_contact_suffix: '.',
  },
  es: {
    language: 'es',
    title: 'Sobre Petite-Moment',
    metaDescription:
      'Pósters cartográficos para recuerdos que duran. Hechos a mano en Múnich — pensados para quienes quieren conservar un lugar especial para siempre.',
    h2_hero: 'Pequeños momentos. Gran significado.',
    p_origin:
      'petite-moment nació de una idea sencilla: algunos lugares merecen más que una foto en la galería del móvil. El sitio donde dos personas se conocieron por primera vez. La ciudad donde nació un niño. La playa donde alguien dijo «sí».',
    p_what:
      'Hacemos visibles esas coordenadas. Como pósters. No en serie, sino como recuerdos tipográficos discretos que encajan en una estantería, un dormitorio o un despacho — sin hacer ruido.',
    h2_values: 'Lo que nos importa',
    v_simplicity_lead: 'Sencillez.',
    v_simplicity_rest:
      ' Buscas un lugar, ajustas estilo y formato, escribes tu texto. Listo. Sin estudios de diseño.',
    v_print_lead: 'Calidad de impresión.',
    v_print_rest:
      ' Cada póster se imprime en papel premium y se envía cuidadosamente embalado.',
    v_honesty_lead: 'Honestidad.',
    v_honesty_rest:
      ' Usamos datos cartográficos de MapTiler, pagamos licencias justas y no escondemos costes sorpresa en el checkout.',
    h2_about: 'Sobre nosotros',
    p_about:
      'petite-moment es un pequeño proyecto de UMOI GmbH, con sede en Múnich. Detrás hay un pequeño equipo de diseñadores y desarrolladores que en algún momento decidió que los pósters cartográficos pueden ser más bonitos, más accesibles y más personales — sin caer en las vibes de tienda de souvenirs vintage.',
    p_contact_prefix:
      '¿Tienes una pregunta, una idea o solo quieres saludar? Escríbenos a ',
    p_contact_suffix: '.',
  },
}

function buildBody(c: LocaleCopy) {
  return [
    block('h2', [{ text: c.h2_hero }]),
    block('normal', [{ text: c.p_origin }]),
    block('normal', [{ text: c.p_what }]),
    block('h2', [{ text: c.h2_values }]),
    leadIn(c.v_simplicity_lead, c.v_simplicity_rest),
    leadIn(c.v_print_lead, c.v_print_rest),
    leadIn(c.v_honesty_lead, c.v_honesty_rest),
    block('h2', [{ text: c.h2_about }]),
    block('normal', [{ text: c.p_about }]),
    paraWithEmail(c.p_contact_prefix, CONTACT_EMAIL, c.p_contact_suffix),
  ]
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

async function main() {
  console.log(APPLY ? '🚀 APPLYING to Sanity' : '🔍 DRY RUN (pass --apply to write)')
  console.log()

  // 1. Patch existing DE doc — full body rebuild keeps it consistent with new docs.
  const dePatch = {
    language: COPY.de.language,
    title: COPY.de.title,
    metaDescription: COPY.de.metaDescription,
    body: buildBody(COPY.de),
  }
  console.log('— Patch aboutPage (DE):')
  console.log('  language    =', dePatch.language)
  console.log('  title       =', dePatch.title)
  console.log('  body blocks =', dePatch.body.length)

  if (APPLY) {
    await sanity.patch('aboutPage').set(dePatch).commit()
    console.log('  ✅ committed')
  }

  // 2. Create 4 new locale docs.
  for (const lang of ['en', 'fr', 'it', 'es'] as const) {
    const c = COPY[lang]
    const doc = {
      _id: `aboutPage-${lang}`,
      _type: 'aboutPage',
      language: c.language,
      title: c.title,
      metaDescription: c.metaDescription,
      body: buildBody(c),
    }
    console.log(`\n— Create aboutPage-${lang}:`)
    console.log('  title       =', doc.title)
    console.log('  body blocks =', doc.body.length)

    if (APPLY) {
      // createOrReplace so re-running the script is idempotent.
      await sanity.createOrReplace(doc)
      console.log('  ✅ committed')
    }
  }

  console.log()
  console.log(APPLY ? '✅ Migration complete.' : '🔍 Dry run only — re-run with --apply.')
}

main().catch((err) => {
  console.error('fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
