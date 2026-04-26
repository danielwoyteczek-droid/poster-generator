'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  calculateVolume,
} from '@/lib/business-case/calculations'
import { formatEUR, formatPct } from '@/lib/business-case/format'
import type { Scenario } from '@/lib/business-case/types'

interface ScenarioComparisonProps {
  scenarios: Scenario[]
}

export function ScenarioComparison({ scenarios }: ScenarioComparisonProps) {
  const [selected, setSelected] = useState<string[]>(scenarios.slice(0, 2).map((s) => s.id))

  const picked = useMemo(
    () => selected.map((id) => scenarios.find((s) => s.id === id)).filter((s): s is Scenario => !!s),
    [selected, scenarios],
  )

  const computed = useMemo(
    () =>
      picked.map((s) => {
        const metrics = calculateMetrics(s.data)
        const middleVolume = s.data.volumes[1]?.orders ?? 0
        const middle = calculateVolume(middleVolume, metrics)
        return { scenario: s, metrics, middle }
      }),
    [picked],
  )

  function addSlot(id: string) {
    if (selected.length >= 3) return
    if (selected.includes(id)) return
    setSelected([...selected, id])
  }

  function removeSlot(id: string) {
    setSelected(selected.filter((s) => s !== id))
  }

  const available = scenarios.filter((s) => !selected.includes(s.id))

  if (scenarios.length < 2) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Mindestens zwei Szenarien nötig, um sie zu vergleichen.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Szenarien:</span>
        {selected.map((id) => {
          const s = scenarios.find((x) => x.id === id)
          if (!s) return null
          return (
            <Badge key={id} variant="secondary" className="gap-1.5 pl-2.5 pr-1.5 py-1">
              {s.name}
              <button
                type="button"
                onClick={() => removeSlot(id)}
                className="hover:bg-foreground/10 rounded p-0.5"
                aria-label="Entfernen"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )
        })}
        {selected.length < 3 && available.length > 0 && (
          <Select value="" onValueChange={addSlot}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="+ Szenario hinzufügen" />
            </SelectTrigger>
            <SelectContent>
              {available.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {computed.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Wähle mindestens ein Szenario aus, um Kennzahlen zu vergleichen.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Kennzahl</TableHead>
                  {computed.map((c) => (
                    <TableHead key={c.scenario.id} className="text-right">{c.scenario.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <ComparisonRow label="Ø Bestellwert" cells={computed.map((c) => formatEUR(c.metrics.aov, 2))} />
                <ComparisonRow label="Ø Marge" cells={computed.map((c) => formatEUR(c.metrics.avgMargin, 2))} />
                <ComparisonRow label="Marge nach CAC" cells={computed.map((c) => formatEUR(c.metrics.marginAfterCac, 2))} />
                <ComparisonRow label="Anteil physisch" cells={computed.map((c) => formatPct(c.metrics.physicalShare))} />
                <ComparisonRow label="Digital-Marge-Anteil" cells={computed.map((c) => formatPct(c.metrics.digitalMarginShare))} />
                <ComparisonRow label="Fixkosten / Jahr" cells={computed.map((c) => formatEUR(c.metrics.fixedYearly))} />
                <ComparisonRow
                  label="Break-Even Bestellungen/Jahr"
                  cells={computed.map((c) => isFinite(c.metrics.breakEvenOrders) ? c.metrics.breakEvenOrders.toLocaleString('de-DE') : '∞')}
                />
                <ComparisonRow
                  label="Break-Even Umsatz/Jahr"
                  cells={computed.map((c) => formatEUR(c.metrics.breakEvenRevenue))}
                />
                <ComparisonRow
                  label="Umsatz @ Mittel-Szenario"
                  cells={computed.map((c) => formatEUR(c.middle.revenue))}
                  highlight
                />
                <ComparisonRow
                  label="Deckungsbeitrag @ Mittel-Szenario"
                  cells={computed.map((c) => formatEUR(c.middle.profit))}
                  highlight
                  colorize={computed.map((c) => (c.middle.profit > 0 ? 'pos' : c.middle.profit < 0 ? 'neg' : 'neutral'))}
                />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ComparisonRow({
  label,
  cells,
  highlight,
  colorize,
}: {
  label: string
  cells: string[]
  highlight?: boolean
  colorize?: Array<'pos' | 'neg' | 'neutral'>
}) {
  return (
    <TableRow className={highlight ? 'bg-muted/30' : ''}>
      <TableCell className={highlight ? 'font-medium' : 'text-muted-foreground'}>{label}</TableCell>
      {cells.map((c, i) => {
        const color = colorize?.[i]
        const colorClass =
          color === 'pos' ? 'text-emerald-600' : color === 'neg' ? 'text-red-600' : ''
        return (
          <TableCell key={i} className={`text-right tabular-nums ${highlight ? 'font-semibold' : ''} ${colorClass}`}>
            {c}
          </TableCell>
        )
      })}
    </TableRow>
  )
}
