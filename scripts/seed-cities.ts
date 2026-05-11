#!/usr/bin/env tsx
/**
 * Seed Supabase `cities` mit den Top-10-DE-Phase-1-Staedten (PROJ-42).
 *
 * Re-Runs sind safe: jeder Eintrag verwendet `slug_base` als natuerlichen
 * Schluessel (Unique-Index `(country_code, slug_base)`). Bestehende Zeilen
 * werden via UPSERT idempotent aktualisiert.
 *
 * Usage:
 *   npm run seed:cities
 *
 * Voraussetzungen:
 *   - .env.local mit NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

function required(name: string): string {
  const v = process.env[name]
  if (!v || v.length === 0) {
    console.error(`[seed-cities] Fehlende Env-Variable: ${name}`)
    process.exit(1)
  }
  return v
}

interface CitySeed {
  slug_base: string
  name: string
  country_code: string
  region: string | null
  latitude: number
  longitude: number
  population: number
  aliases: string[]
}

/**
 * Top-10 DE-Phase-1-Staedte fuer V1-Launch.
 * Geokoordinaten: Stadtzentrum/Rathaus (manuell verifiziert via OpenStreetMap).
 * Bevoelkerungszahlen: Stand 2024 (Statistisches Bundesamt, gerundet).
 */
const CITIES_DE: CitySeed[] = [
  {
    slug_base: 'berlin',
    name: 'Berlin',
    country_code: 'DE',
    region: 'Berlin',
    latitude: 52.520008,
    longitude: 13.404954,
    population: 3677000,
    aliases: [],
  },
  {
    slug_base: 'hamburg',
    name: 'Hamburg',
    country_code: 'DE',
    region: 'Hamburg',
    latitude: 53.551086,
    longitude: 9.993682,
    population: 1906000,
    aliases: [],
  },
  {
    slug_base: 'muenchen',
    name: 'München',
    country_code: 'DE',
    region: 'Bayern',
    latitude: 48.137154,
    longitude: 11.576124,
    population: 1488000,
    aliases: ['Munich'],
  },
  {
    slug_base: 'koeln',
    name: 'Köln',
    country_code: 'DE',
    region: 'Nordrhein-Westfalen',
    latitude: 50.937531,
    longitude: 6.960279,
    population: 1085000,
    aliases: ['Cologne'],
  },
  {
    slug_base: 'frankfurt-am-main',
    name: 'Frankfurt am Main',
    country_code: 'DE',
    region: 'Hessen',
    latitude: 50.110924,
    longitude: 8.682127,
    population: 773000,
    aliases: ['Frankfurt'],
  },
  {
    slug_base: 'stuttgart',
    name: 'Stuttgart',
    country_code: 'DE',
    region: 'Baden-Württemberg',
    latitude: 48.775845,
    longitude: 9.182932,
    population: 633000,
    aliases: [],
  },
  {
    slug_base: 'duesseldorf',
    name: 'Düsseldorf',
    country_code: 'DE',
    region: 'Nordrhein-Westfalen',
    latitude: 51.227741,
    longitude: 6.773456,
    population: 629000,
    aliases: ['Duesseldorf'],
  },
  {
    slug_base: 'leipzig',
    name: 'Leipzig',
    country_code: 'DE',
    region: 'Sachsen',
    latitude: 51.339695,
    longitude: 12.373075,
    population: 624000,
    aliases: [],
  },
  {
    slug_base: 'dresden',
    name: 'Dresden',
    country_code: 'DE',
    region: 'Sachsen',
    latitude: 51.050407,
    longitude: 13.737262,
    population: 567000,
    aliases: [],
  },
  {
    slug_base: 'nuernberg',
    name: 'Nürnberg',
    country_code: 'DE',
    region: 'Bayern',
    latitude: 49.452103,
    longitude: 11.076665,
    population: 522000,
    aliases: ['Nuremberg'],
  },
]

async function main() {
  const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseKey = required('SUPABASE_SECRET_KEY')

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`[seed-cities] Upsert ${CITIES_DE.length} DE-Staedte…`)

  // UPSERT auf (country_code, slug_base) — bestehende Zeilen werden aktualisiert,
  // neue eingefuegt. ID wird DB-seitig generiert (gen_random_uuid).
  const { data, error } = await supabase
    .from('cities')
    .upsert(CITIES_DE, { onConflict: 'country_code,slug_base' })
    .select('id, slug_base, name')

  if (error) {
    console.error('[seed-cities] UPSERT fehlgeschlagen:', error.message)
    process.exit(1)
  }

  console.log(`[seed-cities] ✓ ${data?.length ?? 0} Staedte aktualisiert/eingefuegt:`)
  for (const c of data ?? []) {
    console.log(`  - ${c.name} (${c.slug_base}) [${c.id}]`)
  }
}

main().catch((err) => {
  console.error('[seed-cities] Fataler Fehler:', err)
  process.exit(1)
})
