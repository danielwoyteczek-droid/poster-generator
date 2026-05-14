'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient as createBrowserClient } from '@/lib/supabase-browser'

interface LedgerEntry {
  id: string
  project_id: string
  format: 'png' | 'pdf'
  credit_source: 'free' | 'regular' | 'rollover' | 'overage' | 'trial' | 're_export'
  tier_at_time: string
  created_at: string
}

const SOURCE_LABELS: Record<LedgerEntry['credit_source'], string> = {
  free: 'Free-Tier',
  regular: 'Abo-Credit',
  rollover: 'Rollover',
  overage: 'Overage',
  trial: 'Trial',
  re_export: 'Re-Download',
}

const SOURCE_VARIANTS: Record<LedgerEntry['credit_source'], string> = {
  free: 'bg-muted text-foreground border-border',
  regular: 'bg-primary/10 text-primary border-primary/20',
  rollover: 'bg-blue-50 text-blue-900 border-blue-200',
  overage: 'bg-amber-50 text-amber-900 border-amber-200',
  trial: 'bg-orange-50 text-orange-900 border-orange-200',
  re_export: 'bg-emerald-50 text-emerald-900 border-emerald-200',
}

/**
 * PROJ-50: Liste der letzten Export-Verbraeuche (max 30 Eintraege).
 * Liest direkt aus b2b_credit_ledger via RLS (User darf nur seine eigenen
 * Eintraege sehen, durchgesetzt durch ledger_owner_read-Policy).
 */
export function UsageLedger() {
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const supabase = createBrowserClient()
      const { data, error: err } = await supabase
        .from('b2b_credit_ledger')
        .select('id, project_id, format, credit_source, tier_at_time, created_at')
        .order('created_at', { ascending: false })
        .limit(30)

      if (cancelled) return
      if (err) {
        setError(err.message)
        return
      }
      setEntries((data ?? []) as LedgerEntry[])
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Letzte Exporte</CardTitle>
        <CardDescription>
          Die letzten 30 Credit-Verbraeuche. Re-Downloads desselben Projekts kosten keinen Credit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-red-600">Konnte Verbraeuche nicht laden: {error}</p>
        )}
        {entries === null && !error && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}
        {entries && entries.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Noch keine Exporte. Erstelle dein erstes Poster im Editor.
          </p>
        )}
        {entries && entries.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Projekt</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Quelle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm">
                    {new Date(entry.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {entry.project_id.slice(0, 8)}…
                  </TableCell>
                  <TableCell className="uppercase text-sm">{entry.format}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={SOURCE_VARIANTS[entry.credit_source]}
                    >
                      {SOURCE_LABELS[entry.credit_source]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
