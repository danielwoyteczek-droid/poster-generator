#!/usr/bin/env tsx
/**
 * Seed Sanity with DE-language occasionPage drafts (PROJ-29 Phase 1).
 *
 * Creates one draft document per OCCASION_CODES entry. Drafts deliberately
 * skip heroImage — the user supplies images in the Studio before publishing.
 * All other required fields (pageTitle, slug, bodySections, metaTitle,
 * metaDescription) are pre-filled with marketing-ready DE copy that the user
 * can review and tweak.
 *
 * Re-running is safe: createIfNotExists is idempotent on `_id`. To overwrite,
 * delete the draft in Studio first.
 *
 * Usage:
 *   npm run seed:occasion-pages
 */

import { config } from 'dotenv'
import path from 'node:path'
import { createClient } from '@sanity/client'

config({ path: path.resolve(process.cwd(), '.env.local') })
config({ path: path.resolve(process.cwd(), '.env') })

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var ${name}`)
  return v
}

const sanity = createClient({
  projectId: required('NEXT_PUBLIC_SANITY_PROJECT_ID'),
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: required('SANITY_API_WRITE_TOKEN'),
  useCdn: false,
})

interface BodySectionInput {
  heading: string
  paragraphs: string[]
}

interface FaqInput {
  question: string
  answer: string
}

interface OccasionContent {
  occasion: string
  slug: string
  pageTitle: string
  pageSubline: string
  metaTitle: string
  metaDescription: string
  ctaPosterType: 'map' | 'star-map'
  bodySections: BodySectionInput[]
  faq: FaqInput[]
}

// Deterministic Portable-Text block keys so re-runs produce identical docs
// (clean diffs in Studio, no spurious _key churn).
function block(text: string, key: string) {
  return {
    _type: 'block' as const,
    _key: key,
    style: 'normal' as const,
    markDefs: [],
    children: [{ _type: 'span' as const, _key: `${key}-s`, text, marks: [] as string[] }],
  }
}

function buildBodySections(occasion: string, sections: BodySectionInput[]) {
  return sections.map((sec, sIdx) => ({
    _type: 'object',
    _key: `${occasion}-s${sIdx}`,
    heading: sec.heading,
    body: sec.paragraphs.map((p, pIdx) => block(p, `${occasion}-s${sIdx}-p${pIdx}`)),
  }))
}

function buildFaq(occasion: string, items: FaqInput[]) {
  return items.map((f, idx) => ({
    _type: 'object',
    _key: `${occasion}-faq${idx}`,
    question: f.question,
    answer: f.answer,
  }))
}

const CONTENT: OccasionContent[] = [
  {
    occasion: 'muttertag',
    slug: 'geschenkideen-zum-muttertag',
    pageTitle: 'Geschenkideen zum Muttertag, die wirklich berühren',
    pageSubline:
      'Ein Poster ihres Lieblingsorts — persönlicher als jede Pralinenschachtel.',
    metaTitle: 'Geschenkideen zum Muttertag — Persönliche Karten-Poster',
    metaDescription:
      'Persönliche Muttertagsgeschenke mit Bedeutung. Verwandle ihren Lieblingsort in ein hochwertiges Wandbild — schnell gestaltet, präzise gedruckt.',
    ctaPosterType: 'map',
    bodySections: [
      {
        heading: 'Mehr als ein Geschenk — ein Stück Geschichte',
        paragraphs: [
          'Blumen verwelken, Pralinen sind in einer Woche aufgegessen. Ein Karten-Poster bleibt. Es zeigt den Ort, an dem sie aufgewachsen ist, das Krankenhaus, in dem du das erste Mal in ihren Armen lagst, das Café, in dem ihr euch sonntags trefft. Solche Orte tragen Geschichten — und ein Poster macht sie sichtbar.',
          'Petite-moment verwandelt jeden Punkt der Welt in ein hochwertiges Wandbild. Du wählst den Ausschnitt, den Stil und den Text. Wir liefern eine druckfertige Datei oder das fertige Poster nach Hause.',
        ],
      },
      {
        heading: 'So gestaltest du das Muttertags-Poster',
        paragraphs: [
          'Such den Ort, der für sie zählt. Das kann ihre Heimatstadt sein, der Lieblingsstrand aus dem letzten Familienurlaub oder die Adresse, an der sie früher gewohnt hat. Im Editor bewegst du die Karte, bis der Ausschnitt sitzt — wie ein Fotoausschnitt.',
          'Dann wählst du einen Karten-Stil: minimalistisch in Schwarz-Weiß, warm in Erdtönen, oder klassisch elegant. Füge Namen, Datum oder eine kleine Widmung hinzu. Das Layout passt sich automatisch an, du musst kein Designer sein.',
        ],
      },
      {
        heading: 'Druck, Versand & Liefertermin',
        paragraphs: [
          'Wir drucken auf 250 g/m² mattem Premium-Papier in den Formaten A4, A3 und 50 × 70 cm. Lieferung innerhalb Deutschlands typischerweise in 3 – 5 Werktagen. Wer es schneller braucht, lädt sich die druckfertige PDF-Datei sofort herunter und druckt vor Ort.',
        ],
      },
    ],
    faq: [
      {
        question: 'Wann muss ich bestellen, damit das Poster zum Muttertag ankommt?',
        answer:
          'Für eine Lieferung innerhalb Deutschlands solltest du spätestens 7 Tage vor dem Muttertag bestellen. Wenn es enger wird, ist der Sofort-Download (PDF) eine sichere Alternative — du druckst selbst oder beim Copyshop um die Ecke.',
      },
      {
        question: 'Welche Größen gibt es?',
        answer:
          'A4 (21 × 29,7 cm) für kleine Wände oder Geschenke. A3 (29,7 × 42 cm) für eine deutlichere Präsenz. 50 × 70 cm für ein echtes Statement-Bild über dem Sofa oder im Flur.',
      },
      {
        question: 'Kann ich das Poster auch nur als digitale Datei haben?',
        answer:
          'Ja. Statt ein gedrucktes Poster zu bestellen, kannst du eine druckfertige hochauflösende PDF herunterladen — perfekt, wenn du selbst drucken oder digital verschenken möchtest.',
      },
      {
        question: 'Welchen Karten-Stil sollte ich wählen?',
        answer:
          'Für klassisch-zeitlose Wohnungen passt der minimalistische Schwarz-Weiß-Stil. Für warme, gemütliche Räume eignen sich die Erdton-Paletten. Im Editor kannst du jeden Stil live in der Vorschau testen, bevor du dich entscheidest.',
      },
    ],
  },

  {
    occasion: 'geburt',
    slug: 'sternenkarte-zur-geburt',
    pageTitle: 'Eine Sternenkarte zur Geburt — der Himmel des ersten Tages',
    pageSubline:
      'Halte fest, wie der Himmel über deinem Kind stand — exakt am Tag und Ort der Geburt.',
    metaTitle: 'Sternenkarte zur Geburt — Personalisiertes Geschenk',
    metaDescription:
      'Halte den Sternenhimmel über dem Geburtsort und Geburtsdatum deines Kindes fest. Ein einzigartiges Geschenk zur Geburt — präzise berechnet und elegant gestaltet.',
    ctaPosterType: 'star-map',
    bodySections: [
      {
        heading: 'Der Augenblick, der alles verändert hat',
        paragraphs: [
          'Es gibt diesen einen Moment, in dem das Leben sich teilt: davor und danach. Die Sternenkarte zur Geburt hält genau diesen Moment fest — den Himmel, wie er sich am Geburtsort und zur Geburtszeit deines Kindes gezeigt hat. Astronomisch präzise berechnet, dezent gestaltet.',
          'Das Poster wird so individuell, wie der Moment selbst war: kein zweites sieht aus wie deins, weil sich der Himmel jede Sekunde verändert.',
        ],
      },
      {
        heading: 'So gestaltest du die Sternenkarte',
        paragraphs: [
          'Im Editor gibst du Geburtsort und Geburtszeitpunkt ein — die Karte berechnet automatisch die exakte Sternenkonstellation. Du wählst die Farben (Tiefblau, Schwarz, Petrol), entscheidest, ob die Sternbilder als Linien sichtbar sein sollen, ob die Milchstraße angedeutet wird und wie viele Sterne du überhaupt zeigen möchtest.',
          'Darunter passen Name, Datum und Koordinaten — drei Zeilen, die später die Geschichte erzählen.',
        ],
      },
      {
        heading: 'Geschenk zur Geburt, Taufe oder zum ersten Geburtstag',
        paragraphs: [
          'Eine Sternenkarte begleitet das Kind oft jahrzehntelang — über dem Bett im Kinderzimmer, später im Studentenzimmer, irgendwann an der Wand des ersten eigenen Zuhauses. Beliebt ist sie als Geschenk zur Geburt, zur Taufe oder zum ersten Geburtstag, gerne von Großeltern oder Paten.',
        ],
      },
    ],
    faq: [
      {
        question: 'Wie genau ist die Sternenkarte?',
        answer:
          'Die Berechnung verwendet astronomisch korrekte Daten (Sternenkatalog mit über 9.000 Sternen, Konstellations-Geometrie, Milchstraßen-Position) und projiziert sie auf den exakten Beobachtungsort und Zeitpunkt, den du eingibst.',
      },
      {
        question: 'Welche Daten brauche ich?',
        answer:
          'Geburtsort (Stadt reicht — wir geocodieren automatisch) und Geburtszeit (Datum + Uhrzeit). Wenn die genaue Uhrzeit unbekannt ist, funktioniert auch ein Tagesdurchschnitt — der Sternenhimmel verändert sich innerhalb eines Tages aber merklich.',
      },
      {
        question: 'Eignet sich das auch als Patenkind- oder Großeltern-Geschenk?',
        answer:
          'Sehr gut sogar. Die Sternenkarte funktioniert für jeden bedeutsamen Moment — Geburt, Hochzeit, Jahrestag — und ist eines der häufigsten Geschenke von Großeltern und Paten an Neugeborene.',
      },
      {
        question: 'Kann ich später noch etwas ändern?',
        answer:
          'Solange du das Poster nicht bestellt hast, kannst du im Editor jederzeit anpassen. Nach dem Druck nicht mehr — aber du kannst jederzeit eine zweite Version mit anderen Texten oder Farben gestalten.',
      },
    ],
  },

  {
    occasion: 'hochzeit',
    slug: 'hochzeitsgeschenk-personalisiert',
    pageTitle: 'Persönliche Hochzeitsgeschenke mit Bedeutung',
    pageSubline:
      'Die Karte des großen Tages — als Geschenk fürs Brautpaar oder Erinnerung für euch selbst.',
    metaTitle: 'Hochzeitsgeschenk personalisiert — Karte vom großen Tag',
    metaDescription:
      'Verwandle den Ort der Trauung oder der Hochzeitsfeier in ein elegantes Wandbild. Persönliche Hochzeitsgeschenke, die nicht im Schrank verschwinden.',
    ctaPosterType: 'map',
    bodySections: [
      {
        heading: 'Der Ort, an dem alles begonnen hat',
        paragraphs: [
          'Es gibt einen Punkt auf der Karte, an dem aus zwei Lebenswegen einer wurde — die Kirche, das Standesamt, der Strand, die Burgruine. Ein Karten-Poster macht diesen Punkt für immer sichtbar. Nicht als Foto, das schnell vergilbt, sondern als grafische Karte, die elegant über dem Sofa oder im Flur hängt.',
          'Brautpaare schenken sich das Poster zum Jahrestag selbst, Trauzeugen bringen es als Hochzeitsgeschenk mit, Familien lassen es im Wohnzimmer aufhängen.',
        ],
      },
      {
        heading: 'So gestaltest du das Hochzeits-Poster',
        paragraphs: [
          'Such den Hochzeitsort: Trauungslocation, Festsaal oder den symbolischen Ort, der für euch zählt. Im Editor zoomst du den Kartenausschnitt so, dass die wichtigsten Straßen, der Fluss oder das Gebäude sichtbar sind. Wähle einen passenden Stil — minimalistisch in Schwarz-Weiß, warm in Erdtönen oder romantisch in Pastell.',
          'Darunter passen Namen, Datum und Koordinaten. Wer mag, ergänzt eine kleine Widmung oder ein Zitat aus dem Trauspruch.',
        ],
      },
      {
        heading: 'Als Geschenk oder als Erinnerung an die eigene Hochzeit',
        paragraphs: [
          'Beliebt als Geschenk von Trauzeugen und engen Freunden, weil es zeigt: ich habe zugehört. Beliebt aber auch als persönliche Erinnerung — viele Paare hängen das Poster in der Wohnung auf, in der sie nach der Hochzeit zusammen einziehen, oder verschenken es zum ersten Hochzeitstag an sich selbst.',
        ],
      },
    ],
    faq: [
      {
        question: 'Wann sollte ich das Hochzeits-Poster bestellen?',
        answer:
          'Wenn es ein Geschenk zur Hochzeit ist, plane mindestens 7 – 10 Tage Lieferzeit innerhalb Deutschlands ein. Für die eigene Hochzeit darfst du dir ruhig Zeit lassen — viele Paare gestalten das Poster erst Wochen oder Monate später, mit Ruhe.',
      },
      {
        question: 'Welche Größe passt am besten?',
        answer:
          'A3 (29,7 × 42 cm) ist die häufigste Wahl als Geschenk — präsent genug für eine Wand, aber nicht überdimensioniert. 50 × 70 cm ist ein echtes Statement, wenn das Poster die Hauptwand des Wohnzimmers schmücken soll.',
      },
      {
        question: 'Kann ich mehrere Orte auf ein Poster bringen?',
        answer:
          'Ja, im Dual-Map-Modus kannst du zwei Orte nebeneinander darstellen — etwa den Ort der Trauung und den Festsaal, oder die Heimatstädte von Braut und Bräutigam.',
      },
      {
        question: 'Bekomme ich auch eine digitale Version?',
        answer:
          'Du kannst entweder ein gedrucktes Poster bestellen oder eine druckfertige PDF-Datei herunterladen — letzteres eignet sich gut, wenn du das Poster vor Ort drucken oder rahmen lassen möchtest.',
      },
    ],
  },

  {
    occasion: 'heimat',
    slug: 'stadtposter-heimatstadt',
    pageTitle: 'Stadtposter deiner Heimatstadt',
    pageSubline:
      'Wo du aufgewachsen bist, wo du herkommst — als hochwertiges Wandbild für dein Zuhause.',
    metaTitle: 'Stadtposter Heimatstadt — Dein Lieblingsort als Wandbild',
    metaDescription:
      'Gestalte ein hochwertiges Stadtposter deiner Heimat. Jeder Ort der Welt, jede Straße — präzise gezeichnet, druckfertig in mehreren Formaten.',
    ctaPosterType: 'map',
    bodySections: [
      {
        heading: 'Der Ort, der dich geprägt hat',
        paragraphs: [
          'Heimat ist nicht das Land, sondern die Straßen, durch die du als Kind gerannt bist. Der Park, in dem du Fahrrad gelernt hast. Der Bäcker, bei dem es nach Schule den Schoko-Croissant gab. Ein Stadtposter macht diese Vertrautheit sichtbar — als grafisch reduzierte Karte, die in jedes Wohnzimmer passt.',
          'Egal, ob du noch dort wohnst, ob du längst weggezogen bist oder das Poster für deine Eltern, Geschwister oder Großeltern entwirfst — die Karte erzählt die Geschichte deines Ankommens.',
        ],
      },
      {
        heading: 'Jeder Ort der Welt, frei wählbar',
        paragraphs: [
          'Im Editor suchst du jeden beliebigen Ort: kleine Dörfer in der Eifel genauso wie Berliner Stadtteile, italienische Bergdörfer oder das eine schwedische Schärenviertel. Du zoomst den Ausschnitt so, dass die für dich wichtigen Straßen, Plätze oder Wasserläufe sichtbar werden.',
          'Du wählst den Stil und ergänzt unten Name, Koordinaten und optional ein Datum oder eine Widmung. Der Druck erfolgt in Druckqualität (300 dpi) — auch feinste Straßennamen bleiben gestochen scharf.',
        ],
      },
      {
        heading: 'Als Erinnerung, Geschenk oder Wandbild',
        paragraphs: [
          'Heimatstadt-Poster sind eine der häufigsten Bestellungen — als Wegzieh-Geschenk, als Wohnungseinweihungs-Mitbringsel, als Erinnerung an die Studienstadt oder als sentimentale Wand-Deko über dem Schreibtisch im Homeoffice. Wenn du jemandem zeigen willst, woher du kommst — das hier ist der schnellste Weg.',
        ],
      },
    ],
    faq: [
      {
        question: 'Funktioniert das auch für kleine Dörfer?',
        answer:
          'Ja. Wir nutzen weltweite OpenStreetMap-Daten — auch Orte mit wenigen hundert Einwohnern sind detailliert kartiert. Im Editor reicht es, den Ortsnamen einzugeben, dann zoomst du auf den gewünschten Ausschnitt.',
      },
      {
        question: 'Ich finde meinen Ort nicht über die Suche — was tun?',
        answer:
          'Manche kleine Orte sind nicht direkt suchbar. In dem Fall such die nächstgelegene Stadt und verschiebe dann die Karte manuell — du siehst alle Straßen und kannst genau das richtige Stück wählen.',
      },
      {
        question: 'Wie groß sollte der Kartenausschnitt sein?',
        answer:
          'Für ein Stadtviertel: ungefähr 1 – 2 km Breite. Für eine ganze Stadt: 5 – 15 km. Im Editor siehst du den Ausschnitt live in Postergröße, sodass du sofort erkennst, ob die Details lesbar bleiben.',
      },
      {
        question: 'Kann ich einen Marker setzen, der einen bestimmten Punkt hervorhebt?',
        answer:
          'Ja. Im Marker-Tab kannst du einen Pin oder ein Herz setzen — etwa auf das Elternhaus, die alte Schule oder den Lieblings-Stammtisch.',
      },
    ],
  },

  {
    occasion: 'reise',
    slug: 'reiseposter-personalisiert',
    pageTitle: 'Reise-Erinnerungen, die an der Wand bleiben',
    pageSubline:
      'Der Ort, der dich verändert hat — als hochwertiges Karten-Poster für daheim.',
    metaTitle: 'Reiseposter personalisiert — Erinnerungen als Wandbild',
    metaDescription:
      'Halte deine schönsten Reiseziele als persönliches Karten-Poster fest. Schnell gestaltet, in Druckqualität — perfekt für Wohnzimmer oder Flur.',
    ctaPosterType: 'map',
    bodySections: [
      {
        heading: 'Aus tausend Fotos wird ein einziges Bild',
        paragraphs: [
          'Du kommst von einer Reise zurück, die dich verändert hat. Tausend Fotos im Handy, eine Postkarte am Kühlschrank — und ein Gefühl, das langsam verblasst. Ein Karten-Poster verlängert diese Erinnerung. Es zeigt nicht ein Foto, sondern die Geografie eurer Geschichte: die Inselgruppe in Griechenland, die Wanderwege in den Dolomiten, das Strandstück in Portugal.',
          'Eine grafische Karte ist subtiler als ein Foto und passt sich jedem Wohnstil an — sie bleibt jahrelang an der Wand, ohne aufdringlich zu wirken.',
        ],
      },
      {
        heading: 'Vom Reiseziel zum Wandbild',
        paragraphs: [
          'Im Editor suchst du den Reiseort. Du kannst das große Ganze einfangen (eine ganze Insel, eine Region, einen Küstenabschnitt) oder ganz nah ranzoomen (das Hotel, das Tal, den einen Strand). Stil und Farben wählen, Namen und Datum darunter platzieren — fertig.',
          'Beliebte Kombinationen: Hochzeitsreise + Hochzeitsdatum, Roadtrip-Etappen als Dual-Karte, oder einfach „Sommer in der Toskana".',
        ],
      },
      {
        heading: 'Druck oder digitaler Download',
        paragraphs: [
          'Du wählst zwischen einem hochwertig gedruckten Poster (in 3 Formaten) oder einer druckfertigen PDF-Datei zum Sofort-Download. Letztere ist praktisch, wenn du das Poster vor Ort drucken oder rahmen lassen möchtest — etwa im selben Stil wie deine bestehenden Reise-Bilder.',
        ],
      },
    ],
    faq: [
      {
        question: 'Funktioniert das auch für entlegene Orte?',
        answer:
          'Ja. Egal ob isländische Fjorde, marokkanische Berberdörfer oder vietnamesische Reisterrassen — wir nutzen weltweite Karten-Daten in Druckqualität.',
      },
      {
        question: 'Ich war an mehreren Orten — kann ich die kombinieren?',
        answer:
          'Ja, im Dual-Modus kannst du zwei Orte nebeneinander darstellen. Für mehr Stationen empfehlen wir mehrere Poster in einer Bildwand — das hat sich grafisch besser bewährt als eine überladene Einzelkarte.',
      },
      {
        question: 'Welcher Karten-Stil eignet sich für Reiseposter?',
        answer:
          'Für Strände und Inseln: blaue Wasser-Paletten. Für Berge und Naturreisen: warme Erdtöne. Für Städtereisen: minimalistisch in Schwarz-Weiß. Probier mehrere Stile in der Live-Vorschau aus.',
      },
      {
        question: 'Wie lange dauert der Versand?',
        answer:
          'Innerhalb Deutschlands typischerweise 3 – 5 Werktage nach Bestellung. Wenn du das Poster zu einem bestimmten Termin brauchst, ist der Sofort-Download (PDF) die sicherste Variante.',
      },
    ],
  },

  {
    occasion: 'geschenk',
    slug: 'personalisierte-geschenkideen',
    pageTitle: 'Persönliche Geschenkideen, die berühren',
    pageSubline:
      'Wenn ein Ort eine Geschichte erzählt — Geschenke mit echter Bedeutung.',
    metaTitle: 'Personalisierte Geschenkideen — Lieblingsort als Wandbild',
    metaDescription:
      'Persönliche Geschenkideen für Geburtstag, Umzug, Jubiläum. Verwandle einen bedeutsamen Ort in ein hochwertiges Karten-Poster — schnell gestaltet.',
    ctaPosterType: 'map',
    bodySections: [
      {
        heading: 'Geschenke, die zeigen: ich habe zugehört',
        paragraphs: [
          'Die schönsten Geschenke sind die, bei denen die beschenkte Person merkt: hier hat jemand mitgedacht, hier wurde nicht nur eine Standard-Idee aus dem Online-Shop gewählt. Ein Karten-Poster eines bedeutsamen Ortes ist genau das. Es signalisiert: ich kenne deine Geschichte.',
          'Die Heimatstadt der besten Freundin. Das Café, in dem du dem Lieblingskollegen das erste Mal begegnet bist. Der Lieblingswanderweg deines Vaters. Solche Orte machen aus einem Geschenk eine Erinnerung.',
        ],
      },
      {
        heading: 'Schnell gestaltet — ohne Designkenntnisse',
        paragraphs: [
          'Du brauchst keine Erfahrung mit Bildbearbeitung. Im Editor suchst du den Ort, zoomst den Ausschnitt, wählst Stil und Farben — und siehst das fertige Poster sofort live in der Vorschau. In wenigen Minuten ist das Geschenk druckfertig.',
          'Wenn du nicht sicher bist, welche Stil-Kombi passt: Probier mehrere Designs in der Live-Vorschau aus, bevor du dich entscheidest. Es kostet keinen Cent, bis du wirklich kaufst.',
        ],
      },
      {
        heading: 'Beliebte Geschenkanlässe',
        paragraphs: [
          'Karten-Poster funktionieren als Geburtstagsgeschenk (besonders runde Geburtstage), zum Umzug oder zur ersten eigenen Wohnung, zum Renteneintritt, zum Studienabschluss oder als „Just-because"-Geste. Die Bandbreite an Anlässen ist genau deshalb so groß, weil jeder Mensch Orte hat, die ihm etwas bedeuten.',
        ],
      },
    ],
    faq: [
      {
        question: 'Was schenke ich jemandem, der schon alles hat?',
        answer:
          'Etwas, das es genau in dieser Form nirgendwo zu kaufen gibt. Ein Karten-Poster eines bedeutsamen Ortes ist per Definition einzigartig — niemand sonst hat genau diesen Ausschnitt mit genau diesem Datum.',
      },
      {
        question: 'Wie viel kostet ein personalisiertes Karten-Poster?',
        answer:
          'Der digitale Download startet im niedrigen einstelligen Bereich. Ein hochwertig gedrucktes Poster (250 g/m²) liegt je nach Format zwischen ca. 25 und 60 Euro — schau im Editor unter „Format" für aktuelle Preise.',
      },
      {
        question: 'Kann ich das Poster mit einer persönlichen Widmung versehen?',
        answer:
          'Ja. Im Text-Tab kannst du beliebige Zeilen hinzufügen — Name, Datum, Koordinaten, Zitat, Spitzname. Du wählst Schriftart und Größe, das Layout passt sich automatisch an.',
      },
      {
        question: 'Ist eine Geschenkverpackung enthalten?',
        answer:
          'Wir versenden Poster in einer schützenden Versandhülse. Eine Geschenkverpackung ist nicht standardmäßig dabei, aber die Hülse selbst ist neutral und eignet sich gut zum Weiterreichen.',
      },
    ],
  },

  {
    occasion: 'jahrestag',
    slug: 'jahrestag-geschenk-personalisiert',
    pageTitle: 'Jahrestag-Geschenke, die nicht im Schrank verschwinden',
    pageSubline:
      'Der Ort eures ersten Treffens, eures Antrags, eurer ersten gemeinsamen Wohnung.',
    metaTitle: 'Jahrestag-Geschenk personalisiert — Karten-Poster mit Bedeutung',
    metaDescription:
      'Persönliche Jahrestag-Geschenke mit Bedeutung. Verwandle den Ort eures ersten Treffens oder Antrags in ein elegantes Wandbild — schnell gestaltet.',
    ctaPosterType: 'map',
    bodySections: [
      {
        heading: 'Ein Ort, an dem alles begonnen hat',
        paragraphs: [
          'Jede Beziehung hat einen Punkt auf der Karte, an dem sie begonnen hat. Die Bar, die WG-Party, der Bahnhof, der Strand. Den Ort, an dem ihr zum ersten Mal merklich nicht mehr loslassen wolltet. Ein Karten-Poster macht diesen unsichtbaren Punkt sichtbar — elegant gerahmt über dem Bett, im Flur oder im Wohnzimmer.',
          'Zum Jahrestag, zum Hochzeitstag, zum Verlobungstag — solche Geschenke gewinnen mit jedem Jahr an Wert.',
        ],
      },
      {
        heading: 'Welcher Ort ist der richtige?',
        paragraphs: [
          'Der Ort des ersten Treffens, des ersten Kusses, des Antrags. Eure erste gemeinsame Wohnung. Der Strand, an dem ihr Hochzeitsreise gemacht habt. Das Konzert, auf dem ihr zum ersten Mal alleine wart. Du kennst die Geschichte besser als wir — wir liefern nur das Werkzeug, sie an die Wand zu hängen.',
          'Wer die Wahl hat: Im Dual-Modus passen sogar zwei Orte auf ein Poster — etwa „Erste Begegnung" links und „Antrag" rechts.',
        ],
      },
      {
        heading: 'So gestaltest du es',
        paragraphs: [
          'Im Editor wählst du Ort, Zoom-Stufe und Stil. Darunter passen Namen, Datum (z. B. „Seit dem 14. Februar 2017") und Koordinaten als feine kleine Zeile. Wer mag, fügt eine kleine Widmung oder ein Zitat aus dem Lied hinzu, zu dem ihr getanzt habt.',
        ],
      },
    ],
    faq: [
      {
        question: 'Eignet sich das auch zum 1. Hochzeitstag?',
        answer:
          'Sehr gut. Das traditionelle Geschenk zum 1. Hochzeitstag ist Papier — ein hochwertig gedrucktes Karten-Poster passt symbolisch perfekt und bleibt anders als Blumen oder Pralinen jahrelang an der Wand.',
      },
      {
        question: 'Können wir das Poster auch nachträglich noch anpassen?',
        answer:
          'Solange du es nicht bestellt hast, kannst du im Editor jederzeit ändern. Nach dem Druck nicht mehr — aber du kannst jederzeit eine Folge-Version mit anderem Layout oder anderem Datum gestalten, etwa zum 5. oder 10. Hochzeitstag.',
      },
      {
        question: 'Welches Format wählen die meisten Paare?',
        answer:
          'A3 (29,7 × 42 cm) ist die häufigste Wahl — präsent genug für eine Wand über dem Sofa oder dem Bett, aber nicht überdimensioniert. 50 × 70 cm wirken eindrucksvoller, brauchen aber eine entsprechend große freie Wandfläche.',
      },
      {
        question: 'Ist auch eine Sternenkarte des Datums möglich?',
        answer:
          'Ja. Wenn du den Sternenhimmel des Jahrestag-Datums festhalten willst, kannst du im Sternen-Editor alternativ eine astronomisch korrekte Sternenkarte gestalten — manche Paare kombinieren beides als Bilder-Diptychon.',
      },
    ],
  },

  {
    occasion: 'weihnachten',
    slug: 'weihnachtsgeschenk-personalisiert',
    pageTitle: 'Weihnachtsgeschenke mit persönlicher Note',
    pageSubline:
      'Mehr als noch ein Buch oder ein Gutschein — ein Wandbild des Lieblingsorts.',
    metaTitle: 'Weihnachtsgeschenk personalisiert — Karten-Poster',
    metaDescription:
      'Persönliche Weihnachtsgeschenke, die im Gedächtnis bleiben. Verwandle einen bedeutsamen Ort in ein elegantes Wandbild — rechtzeitig vor Heiligabend.',
    ctaPosterType: 'map',
    bodySections: [
      {
        heading: 'Wenn Geschenke wieder etwas bedeuten sollen',
        paragraphs: [
          'Weihnachten ist der Anlass, an dem die meisten Geschenke gekauft werden — und gleichzeitig der, an dem die meisten Geschenke später unbenutzt verschenkt werden. Persönliche Karten-Poster brechen aus diesem Kreislauf aus, weil sie auf einen ganz bestimmten Menschen zugeschnitten sind: seine Heimatstadt, sein Lieblingsstrand, der Ort, an dem ihr euch kennengelernt habt.',
          'Solche Geschenke landen nicht im Schrank, sondern an der Wand — und bleiben dort, oft jahrelang.',
        ],
      },
      {
        heading: 'Gestalten in unter 10 Minuten',
        paragraphs: [
          'Du brauchst keine Designerfahrung und keine speziellen Tools. Im Editor suchst du den Ort, wählst Stil und Farben, fügst Name und Datum hinzu — und siehst das fertige Poster live in der Vorschau. Das Ganze dauert im Schnitt unter zehn Minuten.',
          'Wer es eilig hat: Den druckfertigen PDF-Download bekommst du sofort — ideal, wenn du erst kurz vor Weihnachten dran denkst.',
        ],
      },
      {
        heading: 'Lieferzeiten zur Weihnachtssaison',
        paragraphs: [
          'Bestelle gedruckte Poster bis Mitte Dezember, um sicher vor Heiligabend zu liefern. Für Last-Minute-Geschenke ist der digitale Download (PDF) die sichere Variante — du druckst lokal oder verschenkst direkt die Datei mit einer kleinen Notiz.',
        ],
      },
    ],
    faq: [
      {
        question: 'Bis wann muss ich für Heiligabend bestellen?',
        answer:
          'Innerhalb Deutschlands solltest du bis spätestens 18. Dezember bestellen, um sicher vor Heiligabend zu liefern. Sicherer Tipp: Bestellung bis 15. Dezember, dann hast du auch bei Engpässen Puffer.',
      },
      {
        question: 'Kann ich mehrere Poster auf einmal bestellen?',
        answer:
          'Ja, du kannst beliebig viele Poster gleichzeitig bestellen — etwa eines für jedes Familienmitglied. Im Warenkorb siehst du alle Versionen nebeneinander, bevor du zur Kasse gehst.',
      },
      {
        question: 'Ist eine Geschenkverpackung dabei?',
        answer:
          'Poster werden in einer neutralen, schützenden Versandhülse geliefert. Eine spezielle Geschenkverpackung ist nicht enthalten — die Hülse selbst eignet sich aber gut zum direkten Weiterreichen.',
      },
      {
        question: 'Was ist, wenn ich erst am 23. Dezember dran denke?',
        answer:
          'Dann ist der digitale Download (PDF) deine Rettung — sofortiger Bezug, ausdrucken bei einem lokalen Copyshop oder direkt als hochauflösende Datei verschenken (z. B. per E-Mail mit kleiner Notiz).',
      },
    ],
  },
]

async function main() {
  if (CONTENT.length !== 8) {
    throw new Error(`Expected 8 occasions in CONTENT, got ${CONTENT.length}`)
  }

  console.log(`Seeding ${CONTENT.length} DE occasionPage drafts to Sanity...`)
  console.log('')

  let created = 0
  let skipped = 0

  for (const item of CONTENT) {
    const docId = `drafts.occasionPage-de-${item.occasion}`
    const doc = {
      _id: docId,
      _type: 'occasionPage' as const,
      language: 'de',
      occasion: item.occasion,
      slug: { _type: 'slug', current: item.slug },
      pageTitle: item.pageTitle,
      pageSubline: item.pageSubline,
      metaTitle: item.metaTitle,
      metaDescription: item.metaDescription,
      ctaPosterType: item.ctaPosterType,
      bodySections: buildBodySections(item.occasion, item.bodySections),
      faq: buildFaq(item.occasion, item.faq),
      // heroImage intentionally omitted — user fills it in Studio.
    }

    const result = await sanity.createIfNotExists(doc)
    // createIfNotExists returns the existing doc when one was found; compare
    // _updatedAt vs _createdAt to detect that case.
    if (result._createdAt === result._updatedAt) {
      console.log(`✓ Created  ${item.occasion.padEnd(12)} (${item.slug})`)
      created++
    } else {
      console.log(`-  Skipped  ${item.occasion.padEnd(12)} (already exists)`)
      skipped++
    }
  }

  console.log('')
  console.log(`Done: ${created} created, ${skipped} skipped`)
  console.log('')
  console.log('Open https://petite-moment.com/studio (or localhost:3000/studio)')
  console.log('and look under "Anlass-Seiten (Locale × Anlass)" to review.')
  console.log('Each draft still needs a heroImage before publishing.')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
