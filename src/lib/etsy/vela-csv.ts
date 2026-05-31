/**
 * PROJ-53: Vela-/Etsy-CSV-Builder.
 *
 * Erzeugt eine import-fertige CSV im EXAKTEN Spalten-Format der Vela-Etsy-
 * Importvorlage (46 Spalten). Pro Listing:
 *   - Variante 1 „Format & Ausführung" (preis-tragend, FORMAT_OPTIONS)
 *   - Variante 2 „Farbe" (die im Admin gewählten Paletten-Looks)
 *   - eine Zeile pro (Format × Farbe); Listing-Felder nur in der ersten Zeile.
 *
 * Reine Funktion, ohne DB/Netz — unit-testbar.
 */
import {
  type ListingTemplate,
  FORMAT_OPTIONS,
  BASE_PRICE_EUR,
} from './listing-templates'

/** Spalten EXAKT wie die Vela-Etsy-Importvorlage (Reihenfolge ist bindend). */
export const VELA_COLUMNS = [
  'Title', 'Description', 'Category', 'Who made it?', 'What is it?',
  'When was it made?', 'Renewal options', 'Product type', 'Tags', 'Materials',
  'Production partners', 'Section', 'Price', 'Quantity', 'SKU',
  'Variation 1', 'V1 Option', 'Variation 2', 'V2 Option', 'Var Price',
  'Var Quantity', 'Var SKU', 'Var Visibility', 'Var Photo', 'Shipping profile',
  'Weight', 'Length', 'Width', 'Height', 'Return policy',
  'Photo 1', 'Photo 2', 'Photo 3', 'Photo 4', 'Photo 5', 'Photo 6', 'Photo 7',
  'Photo 8', 'Photo 9', 'Photo 10', 'Video 1',
  'Digital file 1', 'Digital file 2', 'Digital file 3', 'Digital file 4', 'Digital file 5',
] as const

export type VelaColumn = (typeof VELA_COLUMNS)[number]
export type VelaRow = Partial<Record<VelaColumn, string>>

/** Ein Farb-Look = eine Option der Variante 2 + dessen flaches Render. */
export interface ColorLook {
  paletteId: string
  /** Anzeigename → V2 Option (aus map_palettes.name) */
  paletteName: string
  /** Var Photo für diesen Look (flaches Render-URL) */
  flatRenderUrl: string
}

export interface ListingInput {
  template: ListingTemplate
  /** SKU-Basis, z. B. "<listing-def-id-kurz>" oder ein sprechender Slug */
  skuBase: string
  /** Listing-Fotos (Photo 1..10): Mockups des Default-Looks (flach, gerahmt, lifestyle, grid) */
  photos: string[]
  /** Farb-Looks = Variante-2-Optionen */
  colorLooks: ColorLook[]
  /** optionaler Titel-Override (sonst Template-Titel) */
  title?: string
  video?: string
  digitalFiles?: string[]
}

const ETSY_MAX_TAGS = 13
const ETSY_MAX_MATERIALS = 13
const ETSY_MAX_TITLE = 140
export const VELA_LISTINGS_PER_FILE = 500

function money(n: number): string {
  return n.toFixed(2)
}

/** SKU-tauglicher Slug aus einem Label/Namen. */
export function skuSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function csvCell(v: string | undefined): string {
  const s = v ?? ''
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

/** Baut die Zeilen (eine pro Format × Farbe) für EIN Listing. */
export function buildListingRows(input: ListingInput): VelaRow[] {
  const { template: t, skuBase, photos, colorLooks } = input
  const title = input.title ?? t.title

  const rows: VelaRow[] = []
  let first = true

  for (const fmt of FORMAT_OPTIONS) {
    const fmtSlug = skuSlug(fmt.label)
    for (const look of colorLooks) {
      const row: VelaRow = {
        'Variation 1': t.variation1Name,
        'V1 Option': fmt.label,
        'Variation 2': t.variation2Name,
        'V2 Option': look.paletteName,
        'Var Price': money(fmt.priceEur),
        'Var Quantity': String(t.quantityPerVariant),
        'Var SKU': `${skuBase}-${fmtSlug}-${skuSlug(look.paletteId)}`,
        'Var Visibility': 'on',
        'Var Photo': look.flatRenderUrl || '',
      }

      if (first) {
        row['Title'] = title
        row['Description'] = t.description
        row['Category'] = t.category
        row['Who made it?'] = t.whoMadeIt
        row['What is it?'] = t.whatIsIt
        row['When was it made?'] = t.whenMadeIt
        row['Renewal options'] = t.renewalOptions
        row['Product type'] = t.productType
        row['Tags'] = t.tags.slice(0, ETSY_MAX_TAGS).join(', ')
        row['Materials'] = t.materials.slice(0, ETSY_MAX_MATERIALS).join(', ')
        row['Section'] = t.section
        row['Price'] = money(BASE_PRICE_EUR)
        row['Quantity'] = String(t.quantityPerVariant)
        row['SKU'] = skuBase
        row['Shipping profile'] = t.shippingProfile
        row['Weight'] = String(t.weightG)
        row['Length'] = String(t.lengthCm)
        row['Width'] = String(t.widthCm)
        row['Height'] = String(t.heightCm)
        row['Return policy'] = t.returnPolicy
        photos.slice(0, 10).forEach((url, i) => {
          row[`Photo ${i + 1}` as VelaColumn] = url
        })
        if (input.video) row['Video 1'] = input.video
        ;(input.digitalFiles ?? []).slice(0, 5).forEach((url, i) => {
          row[`Digital file ${i + 1}` as VelaColumn] = url
        })
        first = false
      }

      rows.push(row)
    }
  }

  return rows
}

/** Serialisiert Zeilen zu CSV (BOM + CRLF, Header in fixer Spaltenreihenfolge). */
export function rowsToCsv(rows: VelaRow[]): string {
  const header = VELA_COLUMNS.map(csvCell).join(',')
  const lines = rows.map((r) => VELA_COLUMNS.map((c) => csvCell(r[c])).join(','))
  return '﻿' + [header, ...lines].join('\r\n') + '\r\n'
}

export interface BuildWarnings {
  longTitles: string[]
  missingImages: string[]
}

/**
 * Baut die komplette CSV für mehrere Listings. Gibt zusätzlich Warnungen
 * (zu lange Titel, fehlende Bild-URLs) zurück, damit die UI nichts „still"
 * unvollständig exportiert.
 */
export function buildVelaCsv(inputs: ListingInput[]): {
  csv: string
  listingCount: number
  rowCount: number
  warnings: BuildWarnings
} {
  const warnings: BuildWarnings = { longTitles: [], missingImages: [] }
  const allRows: VelaRow[] = []

  for (const input of inputs) {
    const title = input.title ?? input.template.title
    if (title.length > ETSY_MAX_TITLE) {
      warnings.longTitles.push(`${title.length} Zeichen | ${title}`)
    }
    if (input.photos.filter(Boolean).length === 0) {
      warnings.missingImages.push(`${input.skuBase}: keine Listing-Fotos`)
    }
    for (const look of input.colorLooks) {
      if (!look.flatRenderUrl) {
        warnings.missingImages.push(`${input.skuBase} / ${look.paletteName}: kein Render`)
      }
    }
    allRows.push(...buildListingRows(input))
  }

  return {
    csv: rowsToCsv(allRows),
    listingCount: inputs.length,
    rowCount: allRows.length,
    warnings,
  }
}

/** Teilt Listings in Gruppen ≤ VELA_LISTINGS_PER_FILE (Vela-Empfehlung). */
export function splitListings<T>(inputs: T[], perFile = VELA_LISTINGS_PER_FILE): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < inputs.length; i += perFile) {
    chunks.push(inputs.slice(i, i + perFile))
  }
  return chunks
}
