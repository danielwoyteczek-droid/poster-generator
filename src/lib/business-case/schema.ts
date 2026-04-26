import { z } from 'zod'

const tierSchema = z.object({
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  price: z.number().min(0).max(10000),
  mix: z.number().min(0).max(100),
  cost: z.number().min(0).max(10000),
})

const fixedSchema = z.object({
  vercel: z.number().min(0).max(100000),
  supabase: z.number().min(0).max(100000),
  maptiler: z.number().min(0).max(100000),
  sentry: z.number().min(0).max(100000),
  sanity: z.number().min(0).max(100000),
  misc: z.number().min(0).max(100000),
})

const marketingSchema = z.object({
  cac: z.number().min(0).max(10000),
  paidShare: z.number().min(0).max(100),
})

const volumeSchema = z.object({
  label: z.string().min(1).max(100),
  orders: z.number().int().min(0).max(100_000_000),
})

export const scenarioDataSchema = z.object({
  tiers: z.array(tierSchema).min(1).max(20),
  fixed: fixedSchema,
  marketing: marketingSchema,
  volumes: z.array(volumeSchema).length(3),
})

export const createScenarioSchema = z.object({
  name: z.string().min(1).max(100),
  cloneFromId: z.string().uuid().optional(),
})

export const updateScenarioSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  data: scenarioDataSchema.optional(),
})

export const monthlyDistributionSchema = z
  .array(z.number().min(0).max(100))
  .length(12)
  .refine(
    (arr) => Math.abs(arr.reduce((a, n) => a + n, 0) - 100) < 0.01,
    { message: 'Monatsverteilung muss sich auf 100% summieren' },
  )

export const updateDistributionSchema = z.object({
  monthlyDistribution: monthlyDistributionSchema,
})

export const syncActualsSchema = z.object({
  year: z.number().int().min(2020).max(2100),
})
