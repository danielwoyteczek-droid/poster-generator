import type { BusinessPlan, Scenario, ScenarioData } from './types'

const BASE = '/api/admin/business-case'

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (body as { error?: string }).error ?? `${res.status} ${res.statusText}`
    throw new Error(msg)
  }
  return body as T
}

export async function loadScenarios(): Promise<Scenario[]> {
  const { scenarios } = await jsonFetch<{ scenarios: ApiScenario[] }>(`${BASE}/scenarios`)
  let list = scenarios.map(fromApiScenario)
  if (list.length === 0) {
    const created = await createScenario('Standard')
    list = [created]
  }
  return list
}

export async function createScenario(name: string, cloneFromId?: string): Promise<Scenario> {
  const { scenario } = await jsonFetch<{ scenario: ApiScenario }>(`${BASE}/scenarios`, {
    method: 'POST',
    body: JSON.stringify({ name, ...(cloneFromId ? { cloneFromId } : {}) }),
  })
  return fromApiScenario(scenario)
}

export async function updateScenario(
  id: string,
  patch: Partial<Pick<Scenario, 'name' | 'description' | 'data'>>,
): Promise<Scenario> {
  const { scenario } = await jsonFetch<{ scenario: ApiScenario }>(`${BASE}/scenarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return fromApiScenario(scenario)
}

export async function deleteScenario(id: string): Promise<void> {
  await jsonFetch(`${BASE}/scenarios/${id}`, { method: 'DELETE' })
}

export async function patchScenarioData(id: string, dataPatch: Partial<ScenarioData>): Promise<Scenario> {
  const current = await jsonFetch<{ scenario: ApiScenario }>(`${BASE}/scenarios/${id}`)
  return updateScenario(id, { data: { ...current.scenario.data, ...dataPatch } })
}

export async function approveScenarioAsPlan(scenarioId: string): Promise<BusinessPlan> {
  const { plan } = await jsonFetch<{ plan: ApiPlan }>(
    `${BASE}/scenarios/${scenarioId}/approve-as-plan`,
    { method: 'POST' },
  )
  return fromApiPlan(plan)
}

export async function loadActivePlan(): Promise<BusinessPlan | null> {
  const { plan } = await jsonFetch<{ plan: ApiPlan | null }>(`${BASE}/active-plan`)
  return plan ? fromApiPlan(plan) : null
}

export async function updateActivePlanDistribution(distribution: number[]): Promise<BusinessPlan> {
  const { plan } = await jsonFetch<{ plan: ApiPlan }>(`${BASE}/active-plan/distribution`, {
    method: 'PATCH',
    body: JSON.stringify({ monthlyDistribution: distribution }),
  })
  return fromApiPlan(plan)
}

export interface ActualRow {
  year: number
  month: number
  tierKey: string
  ordersCount: number
  revenueCents: number
  syncedAt: string
}

export async function loadActuals(year: number): Promise<{ year: number; actuals: ActualRow[]; lastSyncedAt: string | null }> {
  const res = await jsonFetch<{
    year: number
    actuals: Array<{ year: number; month: number; tier_key: string; orders_count: number; revenue_cents: number; synced_at: string }>
    lastSyncedAt: string | null
  }>(`${BASE}/actuals?year=${year}`)
  return {
    year: res.year,
    lastSyncedAt: res.lastSyncedAt,
    actuals: res.actuals.map((a) => ({
      year: a.year,
      month: a.month,
      tierKey: a.tier_key,
      ordersCount: a.orders_count,
      revenueCents: a.revenue_cents,
      syncedAt: a.synced_at,
    })),
  }
}

export async function syncActuals(year: number): Promise<{ year: number; syncedAt: string; ordersConsidered: number; rowsWritten: number }> {
  return jsonFetch(`${BASE}/actuals/sync?year=${year}`, { method: 'POST' })
}

interface ApiScenario {
  id: string
  name: string
  description: string | null
  data: ScenarioData
  created_at: string
  updated_at: string
  created_by: string | null
}

interface ApiPlan {
  id: string
  name: string
  source_scenario_id: string | null
  data: ScenarioData
  monthly_distribution: number[]
  status: 'active' | 'archived'
  approved_at: string
  valid_until: string | null
  approved_by: string | null
}

function fromApiScenario(s: ApiScenario): Scenario {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    data: s.data,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }
}

function fromApiPlan(p: ApiPlan): BusinessPlan {
  return {
    id: p.id,
    name: p.name,
    sourceScenarioId: p.source_scenario_id,
    data: p.data,
    monthlyDistribution: p.monthly_distribution,
    status: p.status,
    approvedAt: p.approved_at,
    validUntil: p.valid_until,
  }
}
