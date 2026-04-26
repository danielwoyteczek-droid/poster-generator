import type { ScenarioData, Tier } from './types'
import { FULFILLMENT_LIMIT_PER_DAY, isPhysicalTier } from './defaults'

export interface TierMetrics {
  margin: number
  marginPct: number
}

export interface ScenarioMetrics {
  aov: number
  avgCost: number
  avgMargin: number
  avgMarginPct: number
  physicalShare: number
  digitalMarginShare: number
  fixedMonthly: number
  fixedYearly: number
  effectiveCac: number
  marginAfterCac: number
  breakEvenOrders: number
  breakEvenDaily: number
  breakEvenRevenue: number
  tierMetrics: Record<string, TierMetrics>
  mixSum: number
}

export interface VolumeMetrics {
  orders: number
  ordersPerDay: number
  packagesPerDay: number
  revenue: number
  grossMargin: number
  marketing: number
  fixed: number
  profit: number
  profitMargin: number
}

export interface ThresholdRow {
  revenue: number
  orders: number
  ordersPerDay: number
  packagesPerDay: number
}

export function calculateTierMetrics(tier: Tier): TierMetrics {
  const margin = tier.price - tier.cost
  const marginPct = tier.price > 0 ? margin / tier.price : 0
  return { margin, marginPct }
}

export function calculateMetrics(data: ScenarioData): ScenarioMetrics {
  const tiers = data.tiers
  const tierMetrics: Record<string, TierMetrics> = {}
  tiers.forEach((t) => {
    tierMetrics[t.key] = calculateTierMetrics(t)
  })

  const mixSum = tiers.reduce((a, t) => a + t.mix, 0)
  const norm = mixSum > 0 ? mixSum : 1

  const aov = tiers.reduce((a, t) => a + t.price * (t.mix / norm), 0)
  const avgCost = tiers.reduce((a, t) => a + t.cost * (t.mix / norm), 0)
  const avgMargin = aov - avgCost
  const avgMarginPct = aov > 0 ? avgMargin / aov : 0

  const physical = tiers.filter((t) => isPhysicalTier(t.key))
  const physicalShare = physical.reduce((a, t) => a + t.mix, 0) / norm

  const digitalTier = tiers.find((t) => !isPhysicalTier(t.key))
  const digitalContribution = digitalTier
    ? tierMetrics[digitalTier.key].margin * (digitalTier.mix / norm)
    : 0
  const totalContribution = tiers.reduce(
    (a, t) => a + tierMetrics[t.key].margin * (t.mix / norm),
    0,
  )
  const digitalMarginShare = totalContribution > 0 ? digitalContribution / totalContribution : 0

  const fixedMonthly =
    data.fixed.vercel +
    data.fixed.supabase +
    data.fixed.maptiler +
    data.fixed.sentry +
    data.fixed.sanity +
    data.fixed.misc
  const fixedYearly = fixedMonthly * 12

  const effectiveCac = data.marketing.cac * (data.marketing.paidShare / 100)
  const marginAfterCac = avgMargin - effectiveCac

  const breakEvenOrders =
    marginAfterCac > 0 ? Math.ceil(fixedYearly / marginAfterCac) : Number.POSITIVE_INFINITY
  const breakEvenDaily = isFinite(breakEvenOrders) ? breakEvenOrders / 365 : Number.POSITIVE_INFINITY
  const breakEvenRevenue = isFinite(breakEvenOrders)
    ? breakEvenOrders * aov
    : Number.POSITIVE_INFINITY

  return {
    aov,
    avgCost,
    avgMargin,
    avgMarginPct,
    physicalShare,
    digitalMarginShare,
    fixedMonthly,
    fixedYearly,
    effectiveCac,
    marginAfterCac,
    breakEvenOrders,
    breakEvenDaily,
    breakEvenRevenue,
    tierMetrics,
    mixSum,
  }
}

export function calculateVolume(
  orders: number,
  metrics: ScenarioMetrics,
): VolumeMetrics {
  const perDay = orders / 365
  const packagesPerDay = perDay * metrics.physicalShare
  const revenue = orders * metrics.aov
  const grossMargin = orders * metrics.avgMargin
  const marketing = orders * metrics.effectiveCac
  const fixed = metrics.fixedYearly
  const profit = grossMargin - marketing - fixed
  const profitMargin = revenue > 0 ? profit / revenue : 0
  return {
    orders,
    ordersPerDay: perDay,
    packagesPerDay,
    revenue,
    grossMargin,
    marketing,
    fixed,
    profit,
    profitMargin,
  }
}

export function calculateThresholds(metrics: ScenarioMetrics): ThresholdRow[] {
  const targets = [50000, 100000, 250000, 500000]
  if (metrics.aov <= 0) return []
  return targets.map((revenue) => {
    const orders = revenue / metrics.aov
    const ordersPerDay = orders / 365
    const packagesPerDay = ordersPerDay * metrics.physicalShare
    return { revenue, orders, ordersPerDay, packagesPerDay }
  })
}

export function calculateFulfillmentCeiling(metrics: ScenarioMetrics): number | null {
  if (metrics.physicalShare <= 0 || metrics.aov <= 0) return null
  const ordersAtLimit = (FULFILLMENT_LIMIT_PER_DAY / metrics.physicalShare) * 365
  return ordersAtLimit * metrics.aov
}
