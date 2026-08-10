/**
 * PROJ-53: Konstante Listing-Templates für den Vela-CSV-Export.
 *
 * Quelle: etsy_listings.csv (Repo-Root) + docs/etsy/. Hier als typisierte
 * Daten gepflegt, damit Compliance an EINER Stelle liegt:
 *   - Rahmen ist Aluminium (schwarz), NICHT Holz (project_frame_material)
 *   - keine g/m², keine exakten Lieferzeiten, keine Spitzenstellungs-Claims
 *     (feedback_haftbare_marketing_claims)
 *
 * Texte/Preise/Varianten sind über alle Design-Listings KONSTANT — variabel
 * sind nur Design + Farb-Looks (Paletten) + Bilder. Die "Farbe"-Optionen
 * (Variante 2) kommen NICHT aus dem Template, sondern aus den im Admin
 * gewählten Paletten (map_palettes.name).
 */

export type TemplateKey = 'stadtkarte' | 'herz' | 'sternenkarte'

/** Variante 1 „Format & Ausführung" — preis-tragende Achse (Etsy: nur eine). */
export interface FormatOption {
  /** V1 Option (Anzeigename in Etsy/Vela) */
  label: string
  /** Var Price (EUR) */
  priceEur: number
}

export interface ListingTemplate {
  key: TemplateKey
  title: string
  description: string
  category: string
  whoMadeIt: string
  whatIsIt: string
  whenMadeIt: string
  renewalOptions: string
  productType: string
  tags: string[]
  materials: string[]
  section: string
  /** Etsy-Versandprofil-NAME (Kosten DE frei / EU 4,90 sind im Profil hinterlegt, nicht im CSV) */
  shippingProfile: string
  /** physische Maße (gerollter Versand) — bei Bedarf pro Shop anpassen */
  weightG: number
  lengthCm: number
  widthCm: number
  heightCm: number
  returnPolicy: string
  variation1Name: string
  variation2Name: string
  quantityPerVariant: number
}

/**
 * Preismatrix (identisch über alle Listings, siehe etsy_listings.csv notizen):
 * Digital 4,90 · A4 9,90 · A3 14,99 · A2 19,99 · A4+Rahmen 14,90 · A3+Rahmen 24,99.
 * KEIN A2+Rahmen (kein A2-Rahmen vorhanden).
 */
export const FORMAT_OPTIONS: FormatOption[] = [
  { label: 'Digitaler Download', priceEur: 4.9 },
  { label: 'Poster A4', priceEur: 9.9 },
  { label: 'Poster A3', priceEur: 14.99 },
  { label: 'Poster A2', priceEur: 19.99 },
  { label: 'Poster A4 mit Rahmen', priceEur: 14.9 },
  { label: 'Poster A3 mit Rahmen', priceEur: 24.99 },
]

/** Listing-Grundpreis (Etsy „Price") = günstigste Variante. */
export const BASE_PRICE_EUR = Math.min(...FORMAT_OPTIONS.map((o) => o.priceEur))

const COMMON = {
  category: 'Art & Collectibles > Prints',
  whoMadeIt: 'i_did',
  whatIsIt: 'a_finished_product',
  whenMadeIt: 'made_to_order',
  renewalOptions: 'automatic',
  productType: 'Physical item',
  materials: ['Mattes Premiumpapier', 'Pigmenttinte', 'Aluminiumrahmen'],
  shippingProfile: 'Standard',
  weightG: 300,
  lengthCm: 35,
  widthCm: 8,
  heightCm: 8,
  returnPolicy:
    'Keine Rücknahme oder Umtausch (personalisierte Anfertigung). Bei Druckfehler oder Transportschaden kostenfreier Ersatz.',
  variation1Name: 'Format & Ausführung',
  variation2Name: 'Farbe',
  quantityPerVariant: 999,
}

export const LISTING_TEMPLATES: Record<TemplateKey, ListingTemplate> = {
  stadtkarte: {
    ...COMMON,
    key: 'stadtkarte',
    section: 'Stadtposter',
    title:
      'Personalisierte Stadtkarte Poster | Heimatstadt Geschenk | individuelles Wandbild | A4 A3 A2 oder Digital | Lieblingsort',
    description: `Halte deinen Lieblingsort für immer fest.

Ob Heimatstadt, der Ort des ersten Treffens oder das Reiseziel, das ihr nie vergessen wollt — dieses personalisierte Stadtkarten-Poster macht aus einem besonderen Ort ein zeitloses Wandbild.

SO FUNKTIONIERT'S
Du gibst uns Stadt, Titel und einen kurzen Untertitel. Wähle deinen Wunsch-Look (Farbe und Stil) und dein Format — wir gestalten dein Poster individuell.

DEINE AUSWAHL
• Digitaler Download — Druckdatei für A4, A3 und A2, verfügbar nach dem Kauf
• Posterdruck — auf mattem Premiumpapier
• Posterdruck mit Aluminiumrahmen — aufhängefertig

VERSAND & BEARBEITUNG
Jedes Poster wird individuell für dich gefertigt. Die digitale Datei erhältst du nach dem Kauf, gedruckte Poster werden sorgfältig gerollt versendet. Versand innerhalb Deutschlands ist kostenlos.

Ein Geschenk, das bleibt — zum Einzug, zur Hochzeit, zum Jahrestag oder einfach für dich selbst.

Gestalte jetzt deinen Lieblingsort.`,
    tags: [
      'Stadtkarte', 'Stadtplan Poster', 'Heimatstadt Karte', 'personalisiert',
      'Umzugsgeschenk', 'Lieblingsort', 'Karten Poster', 'Wandbild Stadt',
      'Einzugsgeschenk', 'Reise Geschenk', 'Stadt Wandkunst', 'individuelles Bild',
      'Geschenk Paar',
    ],
  },

  herz: {
    ...COMMON,
    key: 'herz',
    section: 'Stadtposter',
    title:
      'Personalisierte Herz-Stadtkarte | Paar Geschenk Hochzeit Jahrestag | Wo alles begann | A4 A3 A2 oder Digital',
    description: `Wo alles begann — als Karte in Herzform.

Der Ort eures ersten Dates, eurer Verlobung oder eures Zuhauses: Diese personalisierte Stadtkarte in Herzform verwandelt euren besonderen Ort in ein romantisches Wandbild.

SO FUNKTIONIERT'S
Nenne uns Ort, Titel und einen kurzen Untertitel (zum Beispiel euer Datum). Wähle Look und Format — den Rest gestalten wir individuell für euch.

DEINE AUSWAHL
• Digitaler Download — Druckdatei für A4, A3 und A2, verfügbar nach dem Kauf
• Posterdruck — auf mattem Premiumpapier
• Posterdruck mit Aluminiumrahmen — aufhängefertig

VERSAND & BEARBEITUNG
Jedes Poster wird individuell gefertigt. Die digitale Datei erhältst du nach dem Kauf, gedruckte Poster werden sorgfältig gerollt versendet. Versand innerhalb Deutschlands ist kostenlos.

Das perfekte Geschenk zur Hochzeit, zur Verlobung, zum Jahrestag oder zum Valentinstag.

Gestaltet jetzt euren Ort.`,
    tags: [
      'Herzkarte', 'Herz Stadtplan', 'Stadtkarte Herz', 'Paar Geschenk',
      'Hochzeitsgeschenk', 'Verlobung Geschenk', 'Jahrestag Geschenk', 'Liebesgeschenk',
      'Valentinstag', 'Wo alles begann', 'Hochzeit Poster', 'personalisiert',
      'wir zwei',
    ],
  },

  sternenkarte: {
    ...COMMON,
    key: 'sternenkarte',
    section: 'Sternenposter',
    title:
      'Personalisierte Sternenkarte Poster | Sternenhimmel Geschenk Geburt Hochzeit | Nachthimmel | A4 A3 A2 oder Digital',
    description: `Der Himmel eines besonderen Moments — für immer festgehalten.

Die Geburt eures Kindes, eure Hochzeit, ein Jahrestag: Diese personalisierte Sternenkarte zeigt den Sternenhimmel exakt so, wie er an deinem Ort und zu deiner Zeit stand.

SO FUNKTIONIERT'S
Nenne uns Datum, Uhrzeit und Ort des Moments — dazu Titel und Untertitel. Wähle deinen Look und dein Format. Wir berechnen den passenden Sternenhimmel und gestalten dein Poster.

DEINE AUSWAHL
• Digitaler Download — Druckdatei für A4, A3 und A2, verfügbar nach dem Kauf
• Posterdruck — auf mattem Premiumpapier
• Posterdruck mit Aluminiumrahmen — aufhängefertig

VERSAND & BEARBEITUNG
Jede Sternenkarte wird individuell für dich berechnet und gefertigt. Die digitale Datei erhältst du nach dem Kauf, gedruckte Poster werden sorgfältig gerollt versendet. Versand innerhalb Deutschlands ist kostenlos.

Ein bewegendes Geschenk zur Geburt, zur Hochzeit, zum Jahrestag oder zur Taufe.

Halte deinen Moment unter den Sternen fest.`,
    tags: [
      'Sternenkarte', 'Sternenhimmel', 'Sternkarte Geburt', 'personalisiert',
      'Hochzeitsgeschenk', 'Geburtsgeschenk', 'Jahrestag Geschenk', 'Nachthimmel',
      'Sterne Poster', 'Sternbild Poster', 'Liebesgeschenk', 'Babygeschenk',
      'Sternenhimmel Karte',
    ],
  },
}

export function getListingTemplate(key: TemplateKey): ListingTemplate {
  const tpl = LISTING_TEMPLATES[key]
  if (!tpl) throw new Error(`Unbekannter template_key: ${key}`)
  return tpl
}
