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
  // Phase 2a (2026-05-11): +10 DE-Städte für volle Topic-Authority.
  // Bremen, Hannover, Dortmund, Essen (Tier-A Population-Top-14 die fehlten)
  // Heidelberg, Freiburg, Münster, Bonn, Lübeck, Mainz (Tier-B Tourismus +
  // Wedding/Keepsake-Relevanz, mittelgroße Städte mit hoher Such-Intent).
  {
    slug_base: 'bremen',
    name: 'Bremen',
    country_code: 'DE',
    region: 'Bremen',
    latitude: 53.079296,
    longitude: 8.801694,
    population: 570000,
    aliases: [],
  },
  {
    slug_base: 'hannover',
    name: 'Hannover',
    country_code: 'DE',
    region: 'Niedersachsen',
    latitude: 52.374478,
    longitude: 9.738553,
    population: 535000,
    aliases: ['Hanover'],
  },
  {
    slug_base: 'dortmund',
    name: 'Dortmund',
    country_code: 'DE',
    region: 'Nordrhein-Westfalen',
    latitude: 51.513587,
    longitude: 7.465298,
    population: 590000,
    aliases: [],
  },
  {
    slug_base: 'essen',
    name: 'Essen',
    country_code: 'DE',
    region: 'Nordrhein-Westfalen',
    latitude: 51.455643,
    longitude: 7.011555,
    population: 582000,
    aliases: [],
  },
  {
    slug_base: 'heidelberg',
    name: 'Heidelberg',
    country_code: 'DE',
    region: 'Baden-Württemberg',
    latitude: 49.398752,
    longitude: 8.672434,
    population: 160000,
    aliases: [],
  },
  {
    slug_base: 'freiburg',
    name: 'Freiburg',
    country_code: 'DE',
    region: 'Baden-Württemberg',
    latitude: 47.999008,
    longitude: 7.842104,
    population: 234000,
    aliases: ['Freiburg im Breisgau'],
  },
  {
    slug_base: 'muenster',
    name: 'Münster',
    country_code: 'DE',
    region: 'Nordrhein-Westfalen',
    latitude: 51.960665,
    longitude: 7.626134,
    population: 320000,
    aliases: ['Muenster'],
  },
  {
    slug_base: 'bonn',
    name: 'Bonn',
    country_code: 'DE',
    region: 'Nordrhein-Westfalen',
    latitude: 50.737430,
    longitude: 7.098207,
    population: 336000,
    aliases: [],
  },
  {
    slug_base: 'luebeck',
    name: 'Lübeck',
    country_code: 'DE',
    region: 'Schleswig-Holstein',
    latitude: 53.865467,
    longitude: 10.686559,
    population: 218000,
    aliases: ['Luebeck'],
  },
  {
    slug_base: 'mainz',
    name: 'Mainz',
    country_code: 'DE',
    region: 'Rheinland-Pfalz',
    latitude: 49.992862,
    longitude: 8.247253,
    population: 218000,
    aliases: [],
  },
  // Phase 3 Vorbereitung (2026-05-11): +20 internationale Top-Reiseziele.
  // Wishlist-Klassiker + Travel-Bucket-List. Sortierung egal — wird in
  // der DB nach population sortiert ausgegeben.
  // Render-Jobs werden bewusst NICHT geseedet — warten auf Font-Entscheidung
  // fuer den Title-textBlock. Drafts werden separat via drafts:cities in
  // allen 5 Locales generiert (~$1.30 Anthropic-Cost).
  {
    slug_base: 'paris',
    name: 'Paris',
    country_code: 'FR',
    region: 'Île-de-France',
    latitude: 48.856613,
    longitude: 2.352222,
    population: 2161000,
    aliases: [],
  },
  {
    slug_base: 'new-york',
    name: 'New York',
    country_code: 'US',
    region: 'New York',
    latitude: 40.712776,
    longitude: -74.005974,
    population: 8336000,
    aliases: ['NYC', 'Nueva York'],
  },
  {
    slug_base: 'london',
    name: 'London',
    country_code: 'GB',
    region: 'England',
    latitude: 51.507351,
    longitude: -0.127758,
    population: 8982000,
    aliases: ['Londres', 'Londra'],
  },
  {
    slug_base: 'tokyo',
    name: 'Tokyo',
    country_code: 'JP',
    region: 'Kanto',
    latitude: 35.676192,
    longitude: 139.650311,
    population: 13960000,
    aliases: ['Tokio', '東京'],
  },
  {
    slug_base: 'bangkok',
    name: 'Bangkok',
    country_code: 'TH',
    region: 'Bangkok',
    latitude: 13.756331,
    longitude: 100.501762,
    population: 10539000,
    aliases: ['กรุงเทพ'],
  },
  {
    slug_base: 'sydney',
    name: 'Sydney',
    country_code: 'AU',
    region: 'New South Wales',
    latitude: -33.868820,
    longitude: 151.209290,
    population: 5312000,
    aliases: [],
  },
  {
    slug_base: 'rio-de-janeiro',
    name: 'Rio de Janeiro',
    country_code: 'BR',
    region: 'Rio de Janeiro',
    latitude: -22.906847,
    longitude: -43.172897,
    population: 6748000,
    aliases: ['Rio'],
  },
  {
    slug_base: 'los-angeles',
    name: 'Los Angeles',
    country_code: 'US',
    region: 'California',
    latitude: 34.052235,
    longitude: -118.243683,
    population: 3898000,
    aliases: ['LA'],
  },
  {
    slug_base: 'vancouver',
    name: 'Vancouver',
    country_code: 'CA',
    region: 'British Columbia',
    latitude: 49.282730,
    longitude: -123.120735,
    population: 675000,
    aliases: [],
  },
  {
    slug_base: 'stockholm',
    name: 'Stockholm',
    country_code: 'SE',
    region: 'Stockholm County',
    latitude: 59.329323,
    longitude: 18.068581,
    population: 975000,
    aliases: [],
  },
  {
    slug_base: 'barcelona',
    name: 'Barcelona',
    country_code: 'ES',
    region: 'Catalonia',
    latitude: 41.385063,
    longitude: 2.173404,
    population: 1620000,
    aliases: [],
  },
  {
    slug_base: 'rome',
    name: 'Rome',
    country_code: 'IT',
    region: 'Lazio',
    latitude: 41.902782,
    longitude: 12.496366,
    population: 2873000,
    aliases: ['Roma', 'Rom'],
  },
  {
    slug_base: 'amsterdam',
    name: 'Amsterdam',
    country_code: 'NL',
    region: 'North Holland',
    latitude: 52.367573,
    longitude: 4.904139,
    population: 872000,
    aliases: [],
  },
  {
    slug_base: 'istanbul',
    name: 'Istanbul',
    country_code: 'TR',
    region: 'Istanbul Province',
    latitude: 41.008240,
    longitude: 28.978359,
    population: 15636000,
    aliases: ['İstanbul'],
  },
  {
    slug_base: 'dubai',
    name: 'Dubai',
    country_code: 'AE',
    region: 'Dubai Emirate',
    latitude: 25.204849,
    longitude: 55.270782,
    population: 3500000,
    aliases: ['Dubaï'],
  },
  {
    slug_base: 'cape-town',
    name: 'Cape Town',
    country_code: 'ZA',
    region: 'Western Cape',
    latitude: -33.924869,
    longitude: 18.424055,
    population: 4710000,
    aliases: ['Kapstadt', 'Le Cap', 'Città del Capo', 'Ciudad del Cabo'],
  },
  {
    slug_base: 'singapore',
    name: 'Singapore',
    country_code: 'SG',
    region: 'Singapore',
    latitude: 1.352083,
    longitude: 103.819839,
    population: 5917000,
    aliases: ['Singapur', 'Singapour'],
  },
  {
    slug_base: 'marrakech',
    name: 'Marrakech',
    country_code: 'MA',
    region: 'Marrakech-Safi',
    latitude: 31.629472,
    longitude: -7.981084,
    population: 928000,
    aliases: ['Marrakesch', 'Marrakesh'],
  },
  {
    slug_base: 'reykjavik',
    name: 'Reykjavik',
    country_code: 'IS',
    region: 'Capital Region',
    latitude: 64.146660,
    longitude: -21.942610,
    population: 140000,
    aliases: ['Reykjavík'],
  },
  {
    slug_base: 'buenos-aires',
    name: 'Buenos Aires',
    country_code: 'AR',
    region: 'Buenos Aires',
    latitude: -34.603722,
    longitude: -58.381592,
    population: 2890000,
    aliases: [],
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
