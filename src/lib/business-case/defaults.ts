import type { ScenarioData, Tier } from './types'

export function getDefaultTiers(): Tier[] {
  return [
    { key: 'digital', label: 'Digital-Download', price: 4, mix: 40, cost: 0.5 },
    { key: 'poster_a4', label: 'A4 Poster', price: 15, mix: 25, cost: 9.5 },
    { key: 'poster_a3', label: 'A3 Poster', price: 20, mix: 10, cost: 12 },
    { key: 'frame_a4', label: 'A4 mit Rahmen', price: 35, mix: 15, cost: 22 },
    { key: 'frame_a3', label: 'A3 mit Rahmen', price: 50, mix: 10, cost: 32 },
  ]
}

export function isPhysicalTier(key: string): boolean {
  return key !== 'digital'
}

export const DEFAULT_SCENARIO_DATA: ScenarioData = {
  tiers: getDefaultTiers(),
  fixed: {
    vercel: 20,
    supabase: 25,
    maptiler: 50,
    sentry: 0,
    sanity: 0,
    misc: 5,
  },
  marketing: {
    cac: 3,
    paidShare: 30,
  },
  volumes: [
    { label: 'Konservativ', orders: 1500 },
    { label: 'Mittel', orders: 6000 },
    { label: 'Optimistisch', orders: 20000 },
  ],
}

export const DEFAULT_MONTHLY_DISTRIBUTION = Array.from({ length: 12 }, () => 100 / 12)

export const FIXED_COST_LABELS: Array<{ key: keyof ScenarioData['fixed']; label: string }> = [
  { key: 'vercel', label: 'Vercel Hosting' },
  { key: 'supabase', label: 'Supabase' },
  { key: 'maptiler', label: 'MapTiler API' },
  { key: 'sentry', label: 'Sentry / Monitoring' },
  { key: 'sanity', label: 'Sanity CMS' },
  { key: 'misc', label: 'Domain / Sonstiges' },
]

export const REVENUE_THRESHOLDS = [50000, 100000, 250000, 500000]
export const FULFILLMENT_LIMIT_PER_DAY = 50

/**
 * Maps an order item to its scenario tier_key.
 * Aligned with PRODUCTS catalog in src/lib/products.ts and PrintFormat in src/lib/print-formats.ts.
 * Currently: download=digital, poster=poster_{format}, frame=frame_{format}.
 */
export function mapOrderItemToTier(productId: string, format: string | null | undefined): string | null {
  if (productId === 'download') return 'digital'
  if (productId === 'poster' && (format === 'a4' || format === 'a3')) return `poster_${format}`
  if (productId === 'frame' && (format === 'a4' || format === 'a3')) return `frame_${format}`
  return null
}
