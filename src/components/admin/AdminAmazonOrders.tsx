'use client'

/**
 * PROJ-31: Arbeitsliste der importierten Amazon-Bestellungen.
 *
 * Beim Öffnen steht der Filter auf „offen" — alles, was noch Arbeit ist.
 * Erledigtes muss man bewusst holen.
 *
 * Käufertexte stehen nur in der Detailansicht, nicht in der Liste: eine
 * Übersicht, die Namen und Wunschadressen ausbreitet, will man nicht offen
 * auf dem Bildschirm liegen haben.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Loader2, RefreshCw, ChevronRight, AlertTriangle, Printer, Undo2, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import type {
  AmazonOrderRow, AmazonOrdersResponse, AmazonQueueStatus,
} from '@/app/api/admin/amazon/orders/route'

const STATUS_LABEL: Record<string, string> = {
  offen: 'Offen',
  alle: 'Alle',
  neu: 'Noch nicht ausgewertet',
  preset_fehlt: 'Design fehlt',
  pruefung: 'Prüfen',
  bereit: 'Druckfertig',
  entwurf: 'Entwurf',
  gedruckt: 'Gedruckt',
  storniert: 'Storniert',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  neu: 'secondary',
  preset_fehlt: 'outline',
  pruefung: 'destructive',
  bereit: 'default',
  entwurf: 'secondary',
  gedruckt: 'secondary',
  storniert: 'outline',
}

const FILTER_ORDER = ['offen', 'pruefung', 'preset_fehlt', 'bereit', 'neu', 'gedruckt', 'storniert', 'alle']

function datum(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
  } catch { return iso }
}

interface OrderDetail {
  id: string
  amazon_order_id: string
  order_item_id: string
  sku: string
  asin: string | null
  queue_status: string
  order_state: string
  quantity: number
  purchase_date: string | null
  parse_result: {
    ok?: boolean
    parsed?: Record<string, string>
    missing?: string[]
    invalid?: Array<{ key: string; reason: string }>
    unmatchedLines?: string[]
    matchedAs?: Record<string, { label: string; mode: string }>
  } | null
  design_hints: Array<{
    groupKey: string
    fontFamily: string | null
    fontUrl: string | null
    colorName: string | null
    colorHex: string | null
    textKeys: string[]
  }> | null
  map_lat: number | null
  map_lng: number | null
  map_place: string | null
  preset: { id: string; name: string } | null
  preview_url: string | null
  svg_url: string | null
  page_url: string | null
  ingest_warnings: string[]
  resolve_warnings: string[]
  printed_at: string | null
  customization_item: unknown
}

export function AdminAmazonOrders() {
  const [data, setData] = useState<AmazonOrdersResponse | null>(null)
  const [filter, setFilter] = useState('offen')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [edits, setEdits] = useState<Record<string, string>>({})

  const load = useCallback(async (status: string) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/amazon/orders?status=${encodeURIComponent(status)}`)
      if (!r.ok) throw new Error((await r.json()).error ?? 'Laden fehlgeschlagen')
      setData(await r.json())
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(filter) }, [load, filter])

  const openDetail = async (row: AmazonOrderRow) => {
    setDetailLoading(true)
    setEdits({})
    try {
      const r = await fetch(`/api/admin/amazon/orders/${row.id}`)
      if (!r.ok) throw new Error((await r.json()).error ?? 'Laden fehlgeschlagen')
      setDetail(await r.json())
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDetailLoading(false)
    }
  }

  const act = async (id: string, body: Record<string, unknown>, note: string) => {
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/amazon/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error ?? 'Fehlgeschlagen')
      toast.success(json.status ? `${note} — jetzt „${STATUS_LABEL[json.status] ?? json.status}"` : note)
      await load(filter)
      if (detail?.id === id) {
        const fresh = await fetch(`/api/admin/amazon/orders/${id}`)
        if (fresh.ok) setDetail(await fresh.json())
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Lade Bestellungen …
      </div>
    )
  }
  if (!data) return null

  const zuPruefen = data.status_counts.pruefung ?? 0
  const ohneDesign = data.status_counts.preset_fehlt ?? 0

  return (
    <div className="space-y-6">
      {(zuPruefen > 0 || ohneDesign > 0) && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              {zuPruefen > 0 && (
                <p className="font-medium text-foreground">
                  {zuPruefen} Bestellung(en) brauchen eine Entscheidung
                </p>
              )}
              {ohneDesign > 0 && (
                <p className="text-muted-foreground mt-1">
                  {ohneDesign} warten auf eine SKU-Zuordnung —{' '}
                  <a href="/private/admin/amazon/skus" className="underline">
                    zu den Amazon-SKUs
                  </a>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_ORDER.map((s) => {
          const n = data.status_counts[s] ?? 0
          if (n === 0 && s !== filter && s !== 'offen') return null
          return (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? 'default' : 'outline'}
              onClick={() => setFilter(s)}
            >
              {STATUS_LABEL[s] ?? s}
              <span className="ml-2 opacity-70">{n}</span>
            </Button>
          )
        })}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Letzter Eingang: {datum(data.last_ingest_at)}
          </span>
          <Button variant="outline" size="sm" onClick={() => void load(filter)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {data.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {filter === 'offen'
              ? 'Nichts offen. Alles abgearbeitet.'
              : `Keine Bestellungen mit Status „${STATUS_LABEL[filter] ?? filter}".`}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Bestellung</TableHead>
                <TableHead className="w-[150px]">Artikel</TableHead>
                <TableHead className="w-[140px]">Zustand</TableHead>
                <TableHead className="w-[160px]">Design</TableHead>
                <TableHead className="w-[100px] text-center">Felder</TableHead>
                <TableHead className="w-[140px]">Gekauft</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.id} className={row.queue_status === 'pruefung' ? 'bg-red-50/40 dark:bg-red-950/10' : undefined}>
                  <TableCell className="font-mono text-xs">
                    {row.amazon_order_id}
                    <div className="text-muted-foreground mt-0.5">Pos. {row.position}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-mono text-xs">{row.sku}</div>
                    {row.variant_label && (
                      <div className="text-muted-foreground text-xs mt-0.5">{row.variant_label}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[row.queue_status] ?? 'secondary'}>
                      {STATUS_LABEL[row.queue_status] ?? row.queue_status}
                    </Badge>
                    {row.warnings.length > 0 && (
                      <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        {row.warnings.length} Hinweis(e)
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.preset_name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {row.fields_found > 0 ? (
                      <span className={row.parse_ok ? '' : 'text-amber-700 dark:text-amber-400'}>
                        {row.fields_found}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {datum(row.purchase_date)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => void openDetail(row)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(detail) || detailLoading} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          {detailLoading && !detail ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-base">{detail.amazon_order_id}</DialogTitle>
                <DialogDescription>
                  {detail.sku}
                  {detail.asin && ` · ${detail.asin}`}
                  {detail.preset && ` · Design: ${detail.preset.name}`}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6">
                  {[...detail.ingest_warnings, ...detail.resolve_warnings].length > 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3">
                      <p className="text-sm font-medium mb-1">Hinweise</p>
                      <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
                        {[...detail.ingest_warnings, ...detail.resolve_warnings].map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Unser Poster</h3>
                        {/*
                          Eigene Seite im Rahmen statt Bild aus dem Speicher: Das
                          Poster wird beim Ansehen gebaut, kann also nicht veralten,
                          wenn sich Zuordnung oder Preset ändern. Der Rahmen hält
                          außerdem den Editor-Store aus dieser Oberfläche heraus.
                          `key` erzwingt einen frischen Aufbau je Bestellung.
                        */}
                        <iframe
                          key={detail.id}
                          src={`/private/admin/amazon/orders/${detail.id}/vorschau`}
                          title="Vorschau des Posters dieser Bestellung"
                          className="w-full aspect-[1/1.414] rounded-md border bg-white"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Aus den Angaben des Käufers gebaut — dasselbe Bild, das der
                          Editor zeigt. Die Druckdatei entsteht erst bei der Freigabe.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium mb-2">Amazons Vorschau</h3>
                        {detail.preview_url ? (
                          <img
                            src={detail.preview_url}
                            alt="Vorschau von Amazon"
                            className="w-full rounded-md border bg-white"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">Kein Bild geliefert.</p>
                        )}
                        {detail.page_url && (
                          <a
                            href={detail.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline text-muted-foreground mt-2 inline-flex items-center gap-1"
                          >
                            Bei Amazon ansehen <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Erkannte Angaben</h3>
                        <div className="space-y-2">
                          {Object.entries(detail.parse_result?.parsed ?? {}).map(([k, v]) => (
                            <div key={k}>
                              <label className="text-xs text-muted-foreground">
                                {k}
                                {detail.parse_result?.matchedAs?.[k]?.mode === 'manual' && (
                                  <span className="ml-1 text-amber-700 dark:text-amber-400">
                                    (korrigiert)
                                  </span>
                                )}
                              </label>
                              <div className="flex gap-2 mt-0.5">
                                <Input
                                  value={edits[k] ?? v}
                                  onChange={(e) => setEdits({ ...edits, [k]: e.target.value })}
                                  className="h-8 text-sm"
                                  disabled={Boolean(detail.printed_at)}
                                />
                                {(edits[k] ?? v) !== v && (
                                  <Button
                                    size="sm" className="h-8"
                                    disabled={busy}
                                    onClick={() => void act(
                                      detail.id,
                                      { action: 'correct_field', key: k, value: edits[k] },
                                      `${k} korrigiert`,
                                    )}
                                  >
                                    Speichern
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          {Object.keys(detail.parse_result?.parsed ?? {}).length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              Noch nichts ausgewertet.
                            </p>
                          )}
                        </div>
                      </div>

                      {detail.map_lat !== null && (
                        <div>
                          <h3 className="text-sm font-medium mb-1">Kartenmitte</h3>
                          <p className="text-sm text-muted-foreground">
                            {detail.map_lat?.toFixed(5)}, {detail.map_lng?.toFixed(5)}
                            {detail.map_place && <span className="block">{detail.map_place}</span>}
                          </p>
                        </div>
                      )}

                      {detail.design_hints && detail.design_hints.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium mb-2">Gestaltung</h3>
                          <div className="space-y-2">
                            {detail.design_hints.map((h) => (
                              <div key={h.groupKey} className="text-sm flex items-center gap-2">
                                {h.colorHex && (
                                  <span
                                    className="w-4 h-4 rounded border shrink-0"
                                    style={{ backgroundColor: h.colorHex }}
                                  />
                                )}
                                <span className="text-muted-foreground">
                                  {h.textKeys.join(', ') || h.groupKey} —{' '}
                                  {h.fontFamily ?? 'ohne Schrift'}
                                  {h.colorName && `, ${h.colorName}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {(detail.parse_result?.missing?.length ||
                    detail.parse_result?.unmatchedLines?.length) && (
                    <div className="text-sm">
                      {detail.parse_result?.missing?.length ? (
                        <p className="text-destructive">
                          Fehlende Pflichtfelder: {detail.parse_result.missing.join(', ')}
                        </p>
                      ) : null}
                      {detail.parse_result?.unmatchedLines?.length ? (
                        <p className="text-muted-foreground mt-1">
                          Nicht zugeordnet: {detail.parse_result.unmatchedLines.join(' | ')}
                        </p>
                      ) : null}
                    </div>
                  )}

                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      Rohdaten der Anpassung
                    </summary>
                    <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto max-h-80">
                      {JSON.stringify(detail.customization_item, null, 2)}
                    </pre>
                  </details>

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button size="sm" asChild disabled={!detail.preset}>
                      <a href={`/de/map?amazon_order=${detail.id}`}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Im Editor öffnen
                      </a>
                    </Button>
                    <Button
                      variant="outline" size="sm" disabled={busy || Boolean(detail.printed_at)}
                      onClick={() => void act(detail.id, { action: 'reresolve' }, 'Neu ausgewertet')}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Neu auswerten
                    </Button>
                    {detail.printed_at ? (
                      <Button
                        variant="outline" size="sm" disabled={busy}
                        onClick={() => void act(detail.id, { action: 'unmark_printed' }, 'Druck zurückgenommen')}
                      >
                        <Undo2 className="w-4 h-4 mr-2" />
                        Doch nicht gedruckt
                      </Button>
                    ) : (
                      <Button
                        size="sm" disabled={busy}
                        onClick={() => void act(detail.id, { action: 'mark_printed' }, 'Als gedruckt abgehakt')}
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Gedruckt
                      </Button>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
