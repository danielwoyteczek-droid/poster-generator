import { promises as fs } from 'node:fs'
import path from 'node:path'
import { env } from './env'

interface BudgetEntry {
  timestamp: string
  topic: string
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

const LOG_PATH = path.resolve(process.cwd(), 'scripts/blog-automation/.budget.json')

// Anthropic pricing per 1M tokens (as of April 2026)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
}

async function readLog(): Promise<BudgetEntry[]> {
  try {
    const raw = await fs.readFile(LOG_PATH, 'utf-8')
    return JSON.parse(raw) as BudgetEntry[]
  } catch {
    return []
  }
}

async function writeLog(entries: BudgetEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true })
  await fs.writeFile(LOG_PATH, JSON.stringify(entries, null, 2), 'utf-8')
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model]
  if (!price) return 0
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output
}

export async function getMonthlySpend(): Promise<number> {
  const entries = await readLog()
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  return entries
    .filter((e) => {
      const d = new Date(e.timestamp)
      return d.getUTCFullYear() === year && d.getUTCMonth() === month
    })
    .reduce((sum, e) => sum + e.costUsd, 0)
}

export async function checkBudget(): Promise<{ ok: boolean; spent: number; cap: number }> {
  const spent = await getMonthlySpend()
  return { ok: spent < env.monthlyBudgetUsd, spent, cap: env.monthlyBudgetUsd }
}

export async function recordSpend(entry: Omit<BudgetEntry, 'costUsd'>): Promise<BudgetEntry> {
  const cost = estimateCost(entry.model, entry.inputTokens, entry.outputTokens)
  const full: BudgetEntry = { ...entry, costUsd: cost }
  const entries = await readLog()
  entries.push(full)
  await writeLog(entries)
  return full
}
