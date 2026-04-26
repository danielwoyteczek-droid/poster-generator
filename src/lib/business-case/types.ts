export type TierKey = string

export interface Tier {
  key: TierKey
  label: string
  price: number
  mix: number
  cost: number
}

export interface FixedCosts {
  vercel: number
  supabase: number
  maptiler: number
  sentry: number
  sanity: number
  misc: number
}

export interface Marketing {
  cac: number
  paidShare: number
}

export interface VolumeScenario {
  label: string
  orders: number
}

export interface ScenarioData {
  tiers: Tier[]
  fixed: FixedCosts
  marketing: Marketing
  volumes: VolumeScenario[]
}

export interface Scenario {
  id: string
  name: string
  description: string | null
  data: ScenarioData
  createdAt: string
  updatedAt: string
}

export interface BusinessPlan {
  id: string
  name: string
  sourceScenarioId: string | null
  data: ScenarioData
  monthlyDistribution: number[]
  status: 'active' | 'archived'
  approvedAt: string
  validUntil: string | null
}
