'use client'

import { useMemo } from 'react'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  calculateMetrics,
  calculateThresholds,
  calculateVolume,
  calculateFulfillmentCeiling,
} from '@/lib/business-case/calculations'
import { FIXED_COST_LABELS } from '@/lib/business-case/defaults'
import {
  formatEUR,
  formatNum,
  formatPct,
} from '@/lib/business-case/format'
import type { Scenario, ScenarioData, Tier } from '@/lib/business-case/types'
import type { SaveState } from '@/hooks/useBusinessScenarios'

interface ScenarioEditorProps {
  scenario: Scenario
  saveState: SaveState
  onChange: (data: ScenarioData) => void
  onBack: () => void
  onApproveAsPlan: () => void
  isActivePlan: boolean
}

export function ScenarioEditor({
  scenario,
  saveState,
  onChange,
  onBack,
  onApproveAsPlan,
  isActivePlan,
}: ScenarioEditorProps) {
  const data = scenario.data
  const metrics = useMemo(() => calculateMetrics(data), [data])
  const thresholds = useMemo(() => calculateThresholds(metrics), [metrics])
  const fulfillmentCeiling = useMemo(() => calculateFulfillmentCeiling(metrics), [metrics])

  function patchTier(idx: number, patch: Partial<Tier>) {
    const tiers = data.tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t))
    onChange({ ...data, tiers })
  }

  function patchFixed(key: keyof typeof data.fixed, value: number) {
    onChange({ ...data, fixed: { ...data.fixed, [key]: value } })
  }

  function patchMarketing(key: keyof typeof data.marketing, value: number) {
    onChange({ ...data, marketing: { ...data.marketing, [key]: value } })
  }

  function patchVolume(idx: number, orders: number) {
    const volumes = data.volumes.map((v, i) => (i === idx ? { ...v, orders } : v))
    onChange({ ...data, volumes })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Zur Szenario-Liste
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{scenario.name}</h2>
            {scenario.description && (
              <p className="text-xs text-muted-foreground">{scenario.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator state={saveState} />
          <Button
            variant="outline"
            disabled={isActivePlan}
            onClick={onApproveAsPlan}
            title={isActivePlan ? 'Bereits aktiver Plan' : 'Als aktiven Plan verabschieden'}
          >
            {isActivePlan ? 'Aktiver Plan' : 'Als Plan verabschieden'}
          </Button>
        </div>
      </div>

      <TiersBlock data={data} metrics={metrics} onChange={patchTier} />

      <KPICards metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FixedCostsBlock data={data} fixedMonthly={metrics.fixedMonthly} fixedYearly={metrics.fixedYearly} onChange={patchFixed} />
        <MarketingBlock data={data} metrics={metrics} onChange={patchMarketing} />
      </div>

      <VolumeScenariosBlock data={data} metrics={metrics} onChange={patchVolume} />

      <BreakEvenCards metrics={metrics} />

      <ThresholdsList thresholds={thresholds} fulfillmentCeiling={fulfillmentCeiling} />
    </div>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Speichern …
      </span>
    )
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-emerald-600">
        <CheckCircle2 className="size-3.5" />
        Gespeichert
      </span>
    )
  }
  return null
}

function NumInput({
  value,
  onChange,
  step = 0.5,
  min = 0,
  max,
  warn,
  className,
  ...rest
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  warn?: boolean
  className?: string
  id?: string
}) {
  return (
    <Input
      type="number"
      step={step}
      min={min}
      max={max}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => {
        const v = parseFloat(e.target.value)
        onChange(isNaN(v) ? 0 : v)
      }}
      className={`text-right tabular-nums ${warn ? 'border-orange-500 bg-orange-50' : ''} ${className ?? ''}`}
      {...rest}
    />
  )
}

function TiersBlock({
  data,
  metrics,
  onChange,
}: {
  data: ScenarioData
  metrics: ReturnType<typeof calculateMetrics>
  onChange: (idx: number, patch: Partial<Tier>) => void
}) {
  const mixWarn = metrics.mixSum !== 100
  return (
    <Card>
      <CardHeader>
        <CardTitle>Produkt-Tiers</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Parameter</TableHead>
              {data.tiers.map((t) => (
                <TableHead key={t.key} className="text-center min-w-[120px]">{t.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-muted-foreground">Verkaufspreis (€)</TableCell>
              {data.tiers.map((t, i) => (
                <TableCell key={t.key}>
                  <NumInput value={t.price} step={0.5} onChange={(v) => onChange(i, { price: v })} />
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">Mix-Anteil (%)</TableCell>
              {data.tiers.map((t, i) => (
                <TableCell key={t.key}>
                  <NumInput
                    value={t.mix}
                    step={1}
                    max={100}
                    warn={mixWarn}
                    onChange={(v) => onChange(i, { mix: v })}
                  />
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">
                Stückkosten (€)
                <p className="text-xs text-muted-foreground/70 font-normal mt-0.5">
                  Druck + Verpackung + Versand + Payment
                </p>
              </TableCell>
              {data.tiers.map((t, i) => (
                <TableCell key={t.key}>
                  <NumInput value={t.cost} step={0.1} onChange={(v) => onChange(i, { cost: v })} />
                </TableCell>
              ))}
            </TableRow>
            <TableRow className="border-t-2">
              <TableCell className="text-muted-foreground text-xs">Marge je Bestellung</TableCell>
              {data.tiers.map((t) => {
                const m = metrics.tierMetrics[t.key].margin
                return (
                  <TableCell key={t.key} className={`text-right tabular-nums font-semibold ${m < 0 ? 'text-red-600' : ''}`}>
                    {formatEUR(m, 2)}
                  </TableCell>
                )
              })}
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground text-xs">Marge in %</TableCell>
              {data.tiers.map((t) => (
                <TableCell key={t.key} className="text-right tabular-nums text-sm text-muted-foreground">
                  {formatPct(metrics.tierMetrics[t.key].marginPct)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
        {mixWarn && (
          <div className="mt-3 rounded border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-700">
            ⚠️ Mix-Summe ist {formatNum(metrics.mixSum)}% statt 100%. Anteile werden für die Berechnung normalisiert.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function KPICards({ metrics }: { metrics: ReturnType<typeof calculateMetrics> }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KPICard title="Ø Bestellwert" value={formatEUR(metrics.aov, 2)} hint="gewichtet nach Mix" />
      <KPICard
        title="Ø Marge"
        value={formatEUR(metrics.avgMargin, 2)}
        hint={`${formatPct(metrics.avgMarginPct)} Bruttomarge`}
      />
      <KPICard
        title="Anteil physisch"
        value={formatPct(metrics.physicalShare)}
        hint="manuell zu versenden"
      />
      <KPICard
        title="Digital-Marge-Anteil"
        value={formatPct(metrics.digitalMarginShare)}
        hint="von Gesamtmarge"
      />
    </div>
  )
}

function KPICard({ title, value, hint }: { title: string; value: string; hint: string }) {
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

function FixedCostsBlock({
  data,
  fixedMonthly,
  fixedYearly,
  onChange,
}: {
  data: ScenarioData
  fixedMonthly: number
  fixedYearly: number
  onChange: (key: keyof ScenarioData['fixed'], value: number) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fixkosten (monatlich)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {FIXED_COST_LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <Label htmlFor={`fix-${key}`} className="text-muted-foreground font-normal">
              {label}
            </Label>
            <NumInput
              id={`fix-${key}`}
              value={data.fixed[key]}
              step={1}
              onChange={(v) => onChange(key, v)}
              className="w-32"
            />
          </div>
        ))}
        <div className="border-t pt-3 mt-3 space-y-1">
          <div className="flex items-center justify-between font-medium">
            <span>Summe / Monat</span>
            <span className="tabular-nums">{formatEUR(fixedMonthly)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Summe / Jahr</span>
            <span className="tabular-nums">{formatEUR(fixedYearly)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MarketingBlock({
  data,
  metrics,
  onChange,
}: {
  data: ScenarioData
  metrics: ReturnType<typeof calculateMetrics>
  onChange: (key: keyof ScenarioData['marketing'], value: number) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketing (CAC)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Label htmlFor="cac" className="text-muted-foreground font-normal pt-2">
            CAC pro Bestellung (€)
            <p className="text-xs text-muted-foreground/70 font-normal mt-0.5">
              auf alle Bestellungen angewendet
            </p>
          </Label>
          <NumInput
            id="cac"
            value={data.marketing.cac}
            step={0.1}
            onChange={(v) => onChange('cac', v)}
            className="w-32"
          />
        </div>
        <div className="flex items-start justify-between gap-3">
          <Label htmlFor="paidShare" className="text-muted-foreground font-normal pt-2">
            Anteil bezahlte Akquise (%)
            <p className="text-xs text-muted-foreground/70 font-normal mt-0.5">
              Rest = organisch (CAC = 0)
            </p>
          </Label>
          <NumInput
            id="paidShare"
            value={data.marketing.paidShare}
            step={5}
            max={100}
            onChange={(v) => onChange('paidShare', v)}
            className="w-32"
          />
        </div>
        <div className="border-t pt-3 mt-3 space-y-1">
          <div className="flex items-center justify-between font-medium">
            <span>Effektiver Ø-CAC</span>
            <span className="tabular-nums">{formatEUR(metrics.effectiveCac, 2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Marge nach CAC</span>
            <span className="tabular-nums">{formatEUR(metrics.marginAfterCac, 2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function VolumeScenariosBlock({
  data,
  metrics,
  onChange,
}: {
  data: ScenarioData
  metrics: ReturnType<typeof calculateMetrics>
  onChange: (idx: number, orders: number) => void
}) {
  const volumeMetrics = data.volumes.map((v) => calculateVolume(v.orders, metrics))
  return (
    <Card>
      <CardHeader>
        <CardTitle>Volumen-Szenarien</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kennzahl</TableHead>
              {data.volumes.map((v) => (
                <TableHead key={v.label} className="text-center">{v.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-muted-foreground">Bestellungen / Jahr</TableCell>
              {data.volumes.map((v, i) => (
                <TableCell key={v.label}>
                  <NumInput value={v.orders} step={100} onChange={(val) => onChange(i, val)} />
                </TableCell>
              ))}
            </TableRow>
            <Row label="Bestellungen / Tag" muted>
              {volumeMetrics.map((m, i) => (
                <td key={i} className="text-right tabular-nums text-sm text-muted-foreground py-2 px-2">
                  {formatNum(m.ordersPerDay, 1)}
                </td>
              ))}
            </Row>
            <Row label="Pakete / Tag (physisch)" muted>
              {volumeMetrics.map((m, i) => (
                <td key={i} className="text-right tabular-nums text-sm text-muted-foreground py-2 px-2">
                  {formatNum(m.packagesPerDay, 1)}
                </td>
              ))}
            </Row>
            <Row label="Umsatz / Jahr" strong>
              {volumeMetrics.map((m, i) => (
                <td key={i} className="text-right tabular-nums font-semibold py-2 px-2">
                  {formatEUR(m.revenue)}
                </td>
              ))}
            </Row>
            <Row label="Bruttomarge / Jahr" muted>
              {volumeMetrics.map((m, i) => (
                <td key={i} className="text-right tabular-nums text-sm text-muted-foreground py-2 px-2">
                  {formatEUR(m.grossMargin)}
                </td>
              ))}
            </Row>
            <Row label="− Marketing / Jahr" muted>
              {volumeMetrics.map((m, i) => (
                <td key={i} className="text-right tabular-nums text-sm text-muted-foreground py-2 px-2">
                  − {formatEUR(m.marketing)}
                </td>
              ))}
            </Row>
            <Row label="− Fixkosten / Jahr" muted>
              {volumeMetrics.map((m, i) => (
                <td key={i} className="text-right tabular-nums text-sm text-muted-foreground py-2 px-2">
                  − {formatEUR(m.fixed)}
                </td>
              ))}
            </Row>
            <Row label="Deckungsbeitrag / Jahr" highlight>
              {volumeMetrics.map((m, i) => (
                <td
                  key={i}
                  className={`text-right tabular-nums font-semibold py-3 px-2 ${
                    m.profit > 0 ? 'text-emerald-600' : m.profit < 0 ? 'text-red-600' : ''
                  }`}
                >
                  {formatEUR(m.profit)}
                </td>
              ))}
            </Row>
            <Row label="Profit-Marge" muted>
              {volumeMetrics.map((m, i) => (
                <td key={i} className="text-right tabular-nums text-sm text-muted-foreground py-2 px-2">
                  {m.profit !== 0 ? formatPct(m.profitMargin) : '—'}
                </td>
              ))}
            </Row>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function Row({
  label,
  children,
  muted,
  strong,
  highlight,
}: {
  label: string
  children: React.ReactNode
  muted?: boolean
  strong?: boolean
  highlight?: boolean
}) {
  const labelClass = muted
    ? 'text-muted-foreground text-xs'
    : strong
      ? 'font-medium'
      : highlight
        ? 'text-foreground font-semibold'
        : 'text-muted-foreground'
  return (
    <tr className={highlight ? 'bg-muted/30 border-t' : ''}>
      <td className={`py-2 px-2 ${labelClass}`}>{label}</td>
      {children}
    </tr>
  )
}

function BreakEvenCards({ metrics }: { metrics: ReturnType<typeof calculateMetrics> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <KPICard
        title="Break-Even (Bestellungen/Jahr)"
        value={formatNum(metrics.breakEvenOrders)}
        hint="Fixkosten ÷ Marge nach CAC"
      />
      <KPICard
        title="Break-Even (Bestellungen/Tag)"
        value={formatNum(metrics.breakEvenDaily, 1)}
        hint="um Fixkosten zu decken"
      />
      <KPICard
        title="Break-Even Umsatz/Jahr"
        value={formatEUR(metrics.breakEvenRevenue)}
        hint="minimaler Jahresumsatz"
      />
    </div>
  )
}

function ThresholdsList({
  thresholds,
  fulfillmentCeiling,
}: {
  thresholds: Array<{ revenue: number; orders: number; ordersPerDay: number; packagesPerDay: number }>
  fulfillmentCeiling: number | null
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operative Schwellen</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {thresholds.map((t) => (
            <li key={t.revenue} className="text-muted-foreground">
              Bei <strong className="text-foreground">{formatEUR(t.revenue)}</strong> Umsatz/Jahr:{' '}
              {formatNum(t.orders)} Bestellungen, {formatNum(t.ordersPerDay, 1)} pro Tag,{' '}
              <strong className="text-foreground">{formatNum(t.packagesPerDay, 1)} Pakete/Tag</strong>{' '}
              manuell zu versenden.
            </li>
          ))}
          {fulfillmentCeiling !== null && (
            <li className="text-muted-foreground pt-2 border-t">
              Versand-Belastungsgrenze (50 Pakete/Tag manuell): ~
              <strong className="text-foreground">{formatEUR(fulfillmentCeiling)}</strong> Umsatz/Jahr —
              darüber wird Druck-Partner / Hilfskraft nötig.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
