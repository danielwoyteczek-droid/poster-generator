'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { calculateMetrics } from '@/lib/business-case/calculations'
import { formatDate, formatEUR, formatNum, formatPct } from '@/lib/business-case/format'
import {
  loadActuals,
  syncActuals,
  updateActivePlanDistribution,
  type ActualRow,
} from '@/lib/business-case/storage'
import type { BusinessPlan } from '@/lib/business-case/types'

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
]

interface PlanVsActualsProps {
  plan: BusinessPlan | null
  onPlanChange: () => Promise<void> | void
}

export function PlanVsActuals({ plan, onPlanChange }: PlanVsActualsProps) {
  const [year] = useState(() => new Date().getUTCFullYear())
  const [actuals, setActuals] = useState<ActualRow[]>([])
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [distributionDraft, setDistributionDraft] = useState<number[]>(
    plan?.monthlyDistribution ?? Array.from({ length: 12 }, () => 100 / 12),
  )
  const [savingDistribution, setSavingDistribution] = useState(false)

  useEffect(() => {
    setDistributionDraft(plan?.monthlyDistribution ?? Array.from({ length: 12 }, () => 100 / 12))
  }, [plan])

  const reloadActuals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await loadActuals(year)
      setActuals(res.actuals)
      setLastSyncedAt(res.lastSyncedAt)
    } catch (err) {
      toast.error(`Ist-Daten konnten nicht geladen werden: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    if (plan) reloadActuals()
    else setLoading(false)
  }, [plan, reloadActuals])

  if (!plan) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-3">
          <h3 className="text-lg font-medium">Noch kein aktiver Plan</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Verabschiede zuerst ein Szenario als aktiven Plan. Du findest den Button im
            Editor eines Szenarios oben rechts.
          </p>
        </CardContent>
      </Card>
    )
  }

  const distributionSum = distributionDraft.reduce((a, n) => a + n, 0)
  const distributionValid = Math.abs(distributionSum - 100) < 0.01

  async function handleSaveDistribution() {
    if (!distributionValid) {
      toast.error(`Verteilung summiert auf ${distributionSum.toFixed(1)} %, muss 100 % sein`)
      return
    }
    setSavingDistribution(true)
    try {
      await updateActivePlanDistribution(distributionDraft)
      await onPlanChange()
      toast.success('Monatsverteilung gespeichert')
    } catch (err) {
      toast.error(`Speichern fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSavingDistribution(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await syncActuals(year)
      toast.success(
        `Sync OK: ${res.ordersConsidered} bezahlte Bestellungen → ${res.rowsWritten} Aggregate`,
      )
      await reloadActuals()
    } catch (err) {
      toast.error(`Sync fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PlanHeader
        plan={plan}
        lastSyncedAt={lastSyncedAt}
        syncing={syncing}
        onSync={handleSync}
      />

      <DistributionEditor
        distribution={distributionDraft}
        onChange={setDistributionDraft}
        onSave={handleSaveDistribution}
        saving={savingDistribution}
        valid={distributionValid}
        sum={distributionSum}
      />

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <PlanVsActualsBody plan={plan} actuals={actuals} year={year} />
      )}
    </div>
  )
}

function PlanHeader({
  plan,
  lastSyncedAt,
  syncing,
  onSync,
}: {
  plan: BusinessPlan
  lastSyncedAt: string | null
  syncing: boolean
  onSync: () => void
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5 flex-wrap">
        <div>
          <h3 className="font-medium">{plan.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verabschiedet am {formatDate(plan.approvedAt)}
            {lastSyncedAt
              ? ` · Letzter Sync: ${new Date(lastSyncedAt).toLocaleString('de-DE')}`
              : ' · Noch nie synchronisiert'}
          </p>
        </div>
        <Button onClick={onSync} disabled={syncing} variant="outline">
          {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Ist-Daten synchronisieren
        </Button>
      </CardContent>
    </Card>
  )
}

function DistributionEditor({
  distribution,
  onChange,
  onSave,
  saving,
  valid,
  sum,
}: {
  distribution: number[]
  onChange: (next: number[]) => void
  onSave: () => void
  saving: boolean
  valid: boolean
  sum: number
}) {
  function setMonth(i: number, value: number) {
    const next = [...distribution]
    next[i] = value
    onChange(next)
  }

  function evenize() {
    onChange(Array.from({ length: 12 }, () => 100 / 12))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monatsverteilung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Anteil der Jahresbestellungen pro Monat. Standard ist Gleichverteilung (8,33 % je Monat). Bei
          Saisonalität die stärkeren Monate erhöhen, schwächere senken — Summe muss 100 % sein.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {distribution.map((v, i) => (
            <div key={i} className="space-y-1">
              <label className="text-xs text-muted-foreground block text-center">{MONTH_LABELS[i]}</label>
              <Input
                type="number"
                step={0.5}
                min={0}
                max={100}
                value={Number(v.toFixed(2))}
                onChange={(e) => setMonth(i, parseFloat(e.target.value) || 0)}
                className="text-right tabular-nums text-sm"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          <div className={`text-sm tabular-nums ${valid ? 'text-emerald-600' : 'text-orange-600'}`}>
            Summe: {sum.toFixed(2)} %
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={evenize}>
              Gleichverteilung
            </Button>
            <Button size="sm" onClick={onSave} disabled={!valid || saving}>
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Speichern
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PlanVsActualsBody({
  plan,
  actuals,
  year,
}: {
  plan: BusinessPlan
  actuals: ActualRow[]
  year: number
}) {
  const data = useMemo(() => buildMonthlyData(plan, actuals, year), [plan, actuals, year])
  const { rows, planAnnualRevenue, planAnnualOrders, ytdIstRevenue, ytdIstOrders, forecastAnnualRevenue, currentMonth } = data

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KPI
          title="Plan Jahresumsatz"
          value={formatEUR(planAnnualRevenue)}
          hint={`${formatNum(planAnnualOrders)} Bestellungen`}
        />
        <KPI
          title="Ist YTD"
          value={formatEUR(ytdIstRevenue)}
          hint={`${formatNum(ytdIstOrders)} Bestellungen bis ${MONTH_LABELS[currentMonth - 1]}`}
        />
        <KPI
          title="Forecast 2026"
          value={formatEUR(forecastAnnualRevenue)}
          hint={
            planAnnualRevenue > 0
              ? `${formatPct((forecastAnnualRevenue - planAnnualRevenue) / planAnnualRevenue)} vs. Plan`
              : 'Kein Plan-Vergleich'
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verlauf {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="monthLabel" stroke="#737373" fontSize={12} />
                <YAxis
                  stroke="#737373"
                  fontSize={12}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) => (typeof v === 'number' ? formatEUR(v) : String(v ?? ''))}
                  labelFormatter={(label) => `${label} ${year}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="planCum"
                  name="Plan kumuliert"
                  stroke="#1F3A44"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="istCum"
                  name="Ist kumuliert"
                  stroke="#15803d"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecastCum"
                  name="Forecast"
                  stroke="#ca8a04"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Monat</TableHead>
                <TableHead className="text-right">Plan-Bestellungen</TableHead>
                <TableHead className="text-right">Plan-Umsatz</TableHead>
                <TableHead className="text-right">Ist-Bestellungen</TableHead>
                <TableHead className="text-right">Ist-Umsatz</TableHead>
                <TableHead className="text-right">Δ Umsatz</TableHead>
                <TableHead className="text-right">Δ %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const isPast = r.month <= currentMonth
                const delta = isPast ? r.istRevenue - r.planRevenue : null
                const deltaPct = isPast && r.planRevenue > 0 ? delta! / r.planRevenue : null
                return (
                  <TableRow key={r.month}>
                    <TableCell className="font-medium">{r.monthLabel}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatNum(r.planOrders, 1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatEUR(r.planRevenue)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {isPast ? formatNum(r.istOrders) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {isPast ? formatEUR(r.istRevenue) : '—'}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        delta === null ? 'text-muted-foreground' : delta >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {delta === null ? '—' : (delta >= 0 ? '+' : '') + formatEUR(delta)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        deltaPct === null ? 'text-muted-foreground' : deltaPct >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {deltaPct === null ? '—' : (deltaPct >= 0 ? '+' : '') + formatPct(deltaPct)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Plan-Bestellungen basieren auf dem mittleren Volumen-Szenario aus dem verabschiedeten Plan
        ({formatNum(planAnnualOrders)} Bestellungen/Jahr). Forecast verwendet die Plan-Monatsverteilung
        als Saisonalitäts-Hinweis.
      </p>
    </div>
  )
}

function KPI({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
        <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  )
}

interface MonthlyRow {
  month: number
  monthLabel: string
  planOrders: number
  planRevenue: number
  istOrders: number
  istRevenue: number
  planCum: number
  istCum: number | null
  forecastCum: number | null
}

interface BuildResult {
  rows: MonthlyRow[]
  planAnnualOrders: number
  planAnnualRevenue: number
  ytdIstOrders: number
  ytdIstRevenue: number
  forecastAnnualRevenue: number
  currentMonth: number
}

function buildMonthlyData(plan: BusinessPlan, actuals: ActualRow[], year: number): BuildResult {
  const metrics = calculateMetrics(plan.data)
  const middleVolume = plan.data.volumes[1]?.orders ?? 0
  const planAnnualOrders = middleVolume
  const planAnnualRevenue = middleVolume * metrics.aov

  const now = new Date()
  const currentMonth =
    now.getUTCFullYear() === year
      ? now.getUTCMonth() + 1
      : now.getUTCFullYear() < year
        ? 0
        : 12

  const istByMonth = new Map<number, { orders: number; revenue: number }>()
  for (const a of actuals) {
    const bucket = istByMonth.get(a.month) ?? { orders: 0, revenue: 0 }
    bucket.orders += a.ordersCount
    bucket.revenue += a.revenueCents / 100
    istByMonth.set(a.month, bucket)
  }

  const dist = plan.monthlyDistribution
  const ytdPlanShare = dist.slice(0, currentMonth).reduce((a, n) => a + n, 0)
  const ytdIstRevenue = Array.from(istByMonth.entries())
    .filter(([m]) => m <= currentMonth)
    .reduce((a, [, b]) => a + b.revenue, 0)
  const ytdIstOrders = Array.from(istByMonth.entries())
    .filter(([m]) => m <= currentMonth)
    .reduce((a, [, b]) => a + b.orders, 0)

  const forecastAnnualRevenue =
    ytdPlanShare > 0 ? (ytdIstRevenue / ytdPlanShare) * 100 : planAnnualRevenue

  let planCumRunning = 0
  let istCumRunning = 0
  let forecastCumRunning = ytdIstRevenue

  const rows: MonthlyRow[] = []
  for (let m = 1; m <= 12; m += 1) {
    const planOrders = (planAnnualOrders * dist[m - 1]) / 100
    const planRevenue = (planAnnualRevenue * dist[m - 1]) / 100
    const ist = istByMonth.get(m) ?? { orders: 0, revenue: 0 }
    planCumRunning += planRevenue
    let istCum: number | null = null
    let forecastCum: number | null = null
    if (m <= currentMonth) {
      istCumRunning += ist.revenue
      istCum = istCumRunning
      forecastCum = m === currentMonth ? istCumRunning : null
    } else {
      const forecastMonthly = (forecastAnnualRevenue * dist[m - 1]) / 100
      forecastCumRunning += forecastMonthly
      forecastCum = forecastCumRunning
    }
    rows.push({
      month: m,
      monthLabel: MONTH_LABELS[m - 1],
      planOrders,
      planRevenue,
      istOrders: ist.orders,
      istRevenue: ist.revenue,
      planCum: planCumRunning,
      istCum,
      forecastCum,
    })
  }

  return {
    rows,
    planAnnualOrders,
    planAnnualRevenue,
    ytdIstOrders,
    ytdIstRevenue,
    forecastAnnualRevenue,
    currentMonth,
  }
}
