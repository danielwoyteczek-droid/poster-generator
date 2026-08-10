'use client'

/**
 * PROJ-49: Admin OAuth-Setup-Panel.
 *
 * Three states:
 *   1. Not connected + no client_id env  → setup-warning + .env hint
 *   2. Not connected + client_id present → "Connect Etsy"-button
 *   3. Connected                          → shop info card + Disconnect button
 *
 * The page server-redirects here from /api/etsy/oauth/callback with query
 * params `status=success|error&reason=...&shop_name=...` after the
 * authorization round-trip. We surface those as a one-time banner.
 */

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, ExternalLink, Loader2, Unplug, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { OAuthStatusResponse } from '@/app/api/admin/etsy/oauth-status/route'

interface Props {
  callbackStatus: string | null
  callbackReason: string | null
  callbackShopName: string | null
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('de-DE', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function AdminEtsyOAuthPanel({
  callbackStatus,
  callbackReason,
  callbackShopName,
}: Props) {
  const [status, setStatus] = useState<OAuthStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncRunning, setSyncRunning] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/etsy/oauth-status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as OAuthStatusResponse
      setStatus(data)
    } catch (e) {
      toast.error('Status konnte nicht geladen werden', {
        description: (e as Error).message,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  // Surface the callback result as a toast once on first render, then clean
  // the URL so a reload doesn't replay the banner.
  useEffect(() => {
    if (!callbackStatus) return
    if (callbackStatus === 'success') {
      toast.success(
        `Etsy verbunden${callbackShopName ? ` (${callbackShopName})` : ''}`,
      )
    } else {
      toast.error('OAuth fehlgeschlagen', {
        description: callbackReason ?? 'Unbekannter Fehler',
      })
    }
    // Strip query params client-side so refresh doesn't re-toast.
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/private/admin/etsy/oauth')
    }
  }, [callbackStatus, callbackReason, callbackShopName])

  const handleConnect = () => {
    // Full-page navigation — the start route sets a cookie and redirects to
    // Etsy, which we can't do via fetch().
    window.location.href = '/api/etsy/oauth/start'
  }

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/admin/etsy/oauth-status', {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Verbindung getrennt')
      await fetchStatus()
    } catch (e) {
      toast.error('Disconnect fehlgeschlagen', {
        description: (e as Error).message,
      })
    }
  }

  const handleSyncNow = async () => {
    setSyncRunning(true)
    try {
      const res = await fetch('/api/admin/etsy/sync-now', { method: 'POST' })
      const body = (await res.json()) as {
        ok: boolean
        summary?: {
          fetched: number
          upserted: number
          parsed_ok: number
          parsed_manual_review: number
          parsed_no_mapping: number
          errors: string[]
        }
      }
      if (!res.ok || !body.ok) {
        toast.error('Sync-Lauf fehlgeschlagen', {
          description: body.summary?.errors[0] ?? `HTTP ${res.status}`,
        })
      } else {
        const s = body.summary!
        toast.success('Sync-Lauf fertig', {
          description: `${s.fetched} Receipts geladen, ${s.parsed_ok} OK, ${s.parsed_manual_review} manual_review, ${s.parsed_no_mapping} ohne Mapping`,
        })
      }
    } catch (e) {
      toast.error('Sync-Lauf fehlgeschlagen', {
        description: (e as Error).message,
      })
    } finally {
      setSyncRunning(false)
    }
  }

  if (loading || !status) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Status wird geladen…
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {!status.client_id_configured && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Setup unvollständig</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              <code>ETSY_OAUTH_CLIENT_ID</code> ist nicht gesetzt. Trag den
              Keystring aus{' '}
              <a
                href="https://www.etsy.com/developers/your-apps"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                etsy.com/developers/your-apps
              </a>{' '}
              in <code>.env.local</code> ein und starte den Dev-Server neu.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {status.connected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Verbunden mit {status.shop_name ?? 'Etsy-Shop'}
              {status.expires_soon && (
                <Badge variant="destructive" className="ml-2">
                  läuft bald ab
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm mb-6">
              <dt className="text-muted-foreground">Shop-ID</dt>
              <dd className="font-mono">{status.shop_id ?? '—'}</dd>
              <dt className="text-muted-foreground">Verbunden seit</dt>
              <dd>{formatDateTime(status.authorized_at)}</dd>
              <dt className="text-muted-foreground">Letzter Token-Refresh</dt>
              <dd>{formatDateTime(status.refreshed_at)}</dd>
              <dt className="text-muted-foreground">Token läuft ab</dt>
              <dd>{formatDateTime(status.expires_at)}</dd>
              <dt className="text-muted-foreground">Scopes</dt>
              <dd className="flex flex-wrap gap-1">
                {status.scopes.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  status.scopes.map((s) => (
                    <Badge key={s} variant="secondary" className="font-mono text-xs">
                      {s}
                    </Badge>
                  ))
                )}
              </dd>
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSyncNow} disabled={syncRunning}>
                {syncRunning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Jetzt synchronisieren
              </Button>
              <Button variant="outline" onClick={handleConnect}>
                Neu autorisieren
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive">
                    <Unplug className="w-4 h-4 mr-2" />
                    Trennen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Etsy-Verbindung trennen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Der Refresh-Token wird gelöscht. Künftige Cron-Läufe
                      schlagen fehl, bis du erneut autorisierst. Bestehende
                      etsy_orders-Daten bleiben unberührt.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect}>
                      Trennen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Etsy-Shop verbinden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Klick auf den Button startet den Etsy-Consent-Flow. Du landest auf
              der Etsy-Seite, autorisierst die App für deinen Shop und kommst
              automatisch hierher zurück. Der Refresh-Token (90 Tage gültig,
              rotiert) wird in der DB gespeichert.
            </p>
            <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
              <li>
                In{' '}
                <a
                  href="https://www.etsy.com/developers/your-apps"
                  target="_blank"
                  rel="noreferrer"
                  className="underline inline-flex items-center gap-1"
                >
                  deiner Etsy-App
                  <ExternalLink className="w-3 h-3" />
                </a>{' '}
                muss die Callback-URL{' '}
                <code className="text-foreground">
                  {typeof window !== 'undefined' ? window.location.origin : '<deine-domain>'}
                  /api/etsy/oauth/callback
                </code>{' '}
                eingetragen sein.
              </li>
              <li>App-Status muss <strong>"Active"</strong> sein (nicht "Pending Approval").</li>
              <li>Du musst eingeloggt sein als der Etsy-User, dem der Shop gehört.</li>
            </ol>
            <Button onClick={handleConnect} disabled={!status.client_id_configured}>
              Etsy verbinden
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
