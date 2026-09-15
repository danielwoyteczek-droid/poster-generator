'use client'

/**
 * PROJ-31: Zuordnung Amazon-SKU → Design-Preset und Feld-Schema.
 *
 * Aufbau nach Dringlichkeit: offene Zuordnungen stehen oben, danach die
 * mit den meisten wartenden Bestellungen. Wer die Seite öffnet, sieht als
 * Erstes, was Arbeit macht.
 *
 * Der Schema-Editor ist bewusst eingeklappt. Für die meisten SKUs stimmt
 * das Standard-Schema; wer es aufklappt, will wirklich etwas ändern.
 */

import { Fragment, useCallback, useEffect, useState } from 'react'
import { Loader2, ChevronDown, ChevronRight, RefreshCw, AlertTriangle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import type { SkuRow, SkusResponse } from '@/app/api/admin/amazon/skus/route'

const NO_PRESET = '__none__'

interface ResolveSummary {
  geprueft: number
  bereit: number
  pruefung: number
  preset_fehlt: number
  fehler: string[]
}

export function AdminAmazonSkus() {
  const [data, setData] = useState<SkusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [schemaDraft, setSchemaDraft] = useState<string>('')
  const [schemaError, setSchemaError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/amazon/skus')
      if (!r.ok) throw new Error((await r.json()).error ?? 'Laden fehlgeschlagen')
      setData(await r.json())
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const patch = async (row: SkuRow, body: Record<string, unknown>, successNote: string) => {
    setSavingId(row.id)
    try {
      const r = await fetch(`/api/admin/amazon/skus/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error ?? 'Speichern fehlgeschlagen')

      const resolved = json.resolved as ResolveSummary | null
      if (resolved && resolved.geprueft > 0) {
        const teile = [`${resolved.geprueft} Bestellung(en) neu ausgewertet`]
        if (resolved.bereit) teile.push(`${resolved.bereit} bereit`)
        if (resolved.pruefung) teile.push(`${resolved.pruefung} zur Prüfung`)
        if (resolved.preset_fehlt) teile.push(`${resolved.preset_fehlt} ohne Preset`)
        toast.success(`${successNote} — ${teile.join(', ')}`)
      } else {
        toast.success(successNote)
      }
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSavingId(null)
    }
  }

  const openSchema = (row: SkuRow) => {
    if (expanded === row.id) { setExpanded(null); return }
    setExpanded(row.id)
    setSchemaError(null)
    // Gepflegtes Schema zeigen, sonst das Standard-Schema als Ausgangspunkt —
    // so hat man beim Anpassen eine vollständige Vorlage vor sich.
    const start = row.personalization_schema ?? data?.default_schema ?? []
    setSchemaDraft(JSON.stringify(start, null, 2))
  }

  const saveSchema = async (row: SkuRow) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(schemaDraft)
    } catch (e) {
      setSchemaError(`Kein gültiges JSON: ${(e as Error).message}`)
      return
    }
    setSchemaError(null)
    await patch(row, { personalization_schema: parsed }, `Schema für ${row.sku} gespeichert`)
  }

  const resetSchema = async (row: SkuRow) => {
    await patch(row, { personalization_schema: null }, `${row.sku} nutzt wieder das Standard-Schema`)
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Lade Zuordnungen …
      </div>
    )
  }
  if (!data) return null

  const offen = data.items.filter((i) => !i.preset_id)
  const wartend = data.items.reduce((n, i) => n + (i.preset_id ? 0 : i.orders_waiting), 0)

  return (
    <div className="space-y-6">
      {offen.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {offen.length} Artikelnummer(n) ohne Design
              </p>
              <p className="text-muted-foreground mt-1">
                {wartend > 0
                  ? `${wartend} Bestellung(en) warten darauf und werden nicht gerendert.`
                  : 'Noch keine Bestellungen betroffen — Zuordnung trotzdem sinnvoll, bevor eine hereinkommt.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.items.length} Artikelnummern · {data.presets.length} Karten-Presets zur Auswahl
        </p>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Neu laden
        </Button>
      </div>

      <div className="rounded-lg border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[170px]">SKU</TableHead>
              <TableHead className="w-[150px]">Variante</TableHead>
              <TableHead className="min-w-[240px]">Design-Preset</TableHead>
              <TableHead className="w-[110px] text-right">Bestellungen</TableHead>
              <TableHead className="w-[130px]">Feld-Schema</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((row) => (
              <Fragment key={row.id}>
                <TableRow className={!row.preset_id ? 'bg-amber-50/50 dark:bg-amber-950/10' : undefined}>
                  <TableCell className="font-mono text-xs align-top pt-4">
                    {row.sku}
                    {row.asin && (
                      <div className="text-muted-foreground mt-1">{row.asin}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm align-top pt-4">
                    {row.variant_label ?? <span className="text-muted-foreground">—</span>}
                    {row.notes && (
                      <div className="text-xs text-muted-foreground mt-1 max-w-[180px]">{row.notes}</div>
                    )}
                  </TableCell>
                  <TableCell className="align-top pt-3">
                    <Select
                      value={row.preset_id ?? NO_PRESET}
                      disabled={savingId === row.id}
                      onValueChange={(v) =>
                        void patch(
                          row,
                          { preset_id: v === NO_PRESET ? null : v },
                          v === NO_PRESET
                            ? `Zuordnung für ${row.sku} entfernt`
                            : `${row.sku} zugeordnet`,
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Design wählen …" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PRESET}>
                          <span className="text-muted-foreground">— nicht zugeordnet —</span>
                        </SelectItem>
                        {data.presets.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.mask && p.mask !== 'none' && (
                              <span className="text-muted-foreground"> · {p.mask}</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {savingId === row.id && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> speichert und wertet neu aus …
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right align-top pt-4 text-sm">
                    <div>{row.orders_total}</div>
                    {row.orders_waiting > 0 && (
                      <Badge variant={row.preset_id ? 'secondary' : 'destructive'} className="mt-1">
                        {row.orders_waiting} offen
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="align-top pt-3">
                    <Button variant="ghost" size="sm" onClick={() => openSchema(row)}>
                      {expanded === row.id
                        ? <ChevronDown className="w-4 h-4 mr-1" />
                        : <ChevronRight className="w-4 h-4 mr-1" />}
                      {row.has_custom_schema
                        ? <span className="text-amber-700 dark:text-amber-400">eigenes</span>
                        : <span className="text-muted-foreground">Standard</span>}
                    </Button>
                  </TableCell>
                </TableRow>

                {expanded === row.id && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-muted/40">
                      <div className="py-2 space-y-3">
                        <div className="text-sm text-muted-foreground">
                          Legt fest, welches Amazon-Feld auf welches Poster-Element geht.
                          <code className="mx-1 text-xs">label</code> ist die Kundenansicht bei Amazon,
                          <code className="mx-1 text-xs">fallbacks</code> enthält Amazons internen Feldnamen —
                          abgeglichen wird der interne Name zuerst, weil er eine Überarbeitung
                          des Listing-Textes überlebt.
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Zulässige Schlüssel:{' '}
                          {Object.entries(data.field_keys).map(([k, beschreibung]) => (
                            <span key={k} className="inline-block mr-3">
                              <code className="text-foreground">{k}</code> — {beschreibung}
                            </span>
                          ))}
                        </div>
                        <Textarea
                          value={schemaDraft}
                          onChange={(e) => { setSchemaDraft(e.target.value); setSchemaError(null) }}
                          rows={16}
                          className="font-mono text-xs"
                          spellCheck={false}
                        />
                        {schemaError && (
                          <p className="text-sm text-destructive">{schemaError}</p>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => void saveSchema(row)} disabled={savingId === row.id}>
                            <Check className="w-4 h-4 mr-2" />
                            Schema speichern
                          </Button>
                          {row.has_custom_schema && (
                            <Button
                              size="sm" variant="outline"
                              onClick={() => void resetSchema(row)}
                              disabled={savingId === row.id}
                            >
                              Auf Standard zurücksetzen
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>
                            Schliessen
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
