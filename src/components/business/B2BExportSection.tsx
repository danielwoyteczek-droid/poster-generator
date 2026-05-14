'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Loader2, FileImage, FileText, Lock, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useB2BSubscription } from '@/hooks/useB2BSubscription'
import { isTrialTier, stripTrialPrefix } from '@/lib/b2b-subscription'
import { UpgradeModal } from './UpgradeModal'
import type { PrintFormat } from '@/lib/print-formats'

type AuthorizeResponse = {
  ok: boolean
  watermark: boolean
  isReExport: boolean
  creditSource: string | null
  tier: string | null
  reason: 'free_exhausted' | 'trial_exhausted' | 'invalid_format' | null
}

type RenderPreview = (
  format: PrintFormat,
  options?: { watermark?: boolean },
) => Promise<string>

interface B2BExportSectionProps {
  posterType: 'map' | 'star-map' | 'photo'
  format: PrintFormat
  projectId: string | null
  renderPreview: RenderPreview
  title?: string
}

function dataUrlToBlob(dataUrl: string): Blob {
  // PNG-DataURL: 'data:image/png;base64,...'
  const [meta, b64] = dataUrl.split(',')
  const mimeMatch = meta.match(/data:([^;]+)/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * PROJ-50: B2B-Export-Section, eingebettet oben in jedem ExportTab.
 *
 * Funnel:
 * - Subscribed / Trial → "Direkt herunterladen" (watermark-frei)
 * - Free mit Credits → "Free-Download mit Watermark" + "Upgrade fuer
 *   Watermark-frei"-CTA
 * - Free, 0 Credits → "Upgrade"-CTA (oeffnet Modal mit free_exhausted-Copy)
 * - Past_due (Zahlung fehlgeschlagen) → "Konto pausiert, Karte aktualisieren"-Banner
 * - Visitor (nicht eingeloggt) → component blendet sich ganz aus
 *
 * Bei fehlendem projectId blockt die Section mit Hinweis "Bitte speichern".
 */
export function B2BExportSection({
  posterType,
  format,
  projectId,
  renderPreview,
  title,
}: B2BExportSectionProps) {
  const router = useRouter()
  const locale = useLocale()
  const { status, loading, refresh } = useB2BSubscription()
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeVariant, setUpgradeVariant] =
    useState<'free_exhausted' | 'watermark_blocker' | 'cta'>('cta')

  // Nicht eingeloggt → Section unsichtbar (Visitor laeuft ueber den
  // bestehenden Cart-Flow drunter).
  if (loading || !status) return null

  const baseTier = stripTrialPrefix(status.tier)
  const isTrial = isTrialTier(status.tier)
  const totalCredits = status.creditsRemaining + status.rolloverCredits
  const isPastDue = status.status === 'past_due'

  // Past_due-Pause: alle Exporte blockiert bis Karte erneuert.
  if (isPastDue) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertTitle>Abo pausiert</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>
            Die letzte Zahlung ist fehlgeschlagen. Bitte aktualisiere deine
            Zahlungsmethode, um wieder zu exportieren.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const res = await fetch('/api/business/portal-session', {
                method: 'POST',
                credentials: 'include',
              })
              const data = (await res.json()) as { url?: string }
              if (data.url) window.location.href = data.url
            }}
          >
            Zahlungsmethode aktualisieren
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const handleExport = async (fileType: 'png' | 'pdf') => {
    if (!projectId) {
      toast.error('Bitte speichere dein Projekt zuerst (oben rechts).')
      return
    }
    setBusy(fileType)
    try {
      // 1. Server-Authorize: prueft Credits + bucht ab (bzw. erkennt Re-Export)
      const authRes = await fetch('/api/business/authorize-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId, format: fileType }),
      })
      const auth = (await authRes.json()) as AuthorizeResponse
      if (!authRes.ok || !auth.ok) {
        if (auth.reason === 'free_exhausted') {
          setUpgradeVariant('free_exhausted')
          setUpgradeOpen(true)
          return
        }
        if (auth.reason === 'trial_exhausted') {
          toast.error('Deine Trial-Credits sind aufgebraucht. Konvertiere zu einem Paid-Plan, um weiter zu exportieren.')
          return
        }
        throw new Error('Export-Berechtigung verweigert')
      }

      // 2. Client-Render mit Watermark-Flag aus Server-Antwort
      const dataUrl = await renderPreview(format, { watermark: auth.watermark })

      // 3. Browser-Download. PDF-Variante: hier rendern wir derzeit ueber
      // dieselbe PNG-Pipeline → PDF-Conversion ist out-of-scope und wird
      // separat im /frontend-Pass nachgereicht (das B2B-MVP setzt auf PNG).
      const blob = dataUrlToBlob(dataUrl)
      const titlePart = title ? title.replace(/[^\w-]+/g, '-').slice(0, 40) : posterType
      const filename = `petite-moment-${titlePart}-${format}.${fileType}`
      triggerDownload(blob, filename)

      // 4. Status refreshen damit Credit-Counter aktualisiert ist
      void refresh()

      if (auth.watermark) {
        toast.success('Free-Export bereit. Upgrade fuer Watermark-frei.', {
          action: {
            label: 'Pro werden',
            onClick: () => {
              setUpgradeVariant('watermark_blocker')
              setUpgradeOpen(true)
            },
          },
        })
      } else if (auth.isReExport) {
        toast.success('Re-Download (kein Credit verbraucht).')
      } else {
        toast.success('Export erfolgreich. 1 Credit verbraucht.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export fehlgeschlagen')
    } finally {
      setBusy(null)
    }
  }

  const SectionWrap = ({ children }: { children: React.ReactNode }) => (
    <>
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            {baseTier === 'free' ? 'Direkt-Download (Free)' : `Direkt-Download (${baseTier[0].toUpperCase() + baseTier.slice(1)})`}
            {isTrial && (
              <span className="text-xs font-normal text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                Trial
              </span>
            )}
          </h3>
          <span className="text-xs text-muted-foreground">
            {totalCredits}/{status.monthlyQuota} Credits
          </span>
        </div>
        {children}
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        variant={upgradeVariant}
      />
    </>
  )

  // Free-User, 0 Credits → reine Upgrade-CTA
  if (baseTier === 'free' && totalCredits === 0) {
    return (
      <SectionWrap>
        <Alert>
          <Lock className="w-4 h-4" />
          <AlertTitle>Keine Free-Credits mehr</AlertTitle>
          <AlertDescription>
            Du hast deine 3 monatlichen Free-Credits aufgebraucht. Upgrade zu
            Pro fuer bis zu 300 Designs/Monat ohne Watermark.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => {
            setUpgradeVariant('free_exhausted')
            setUpgradeOpen(true)
          }}
          className="w-full"
        >
          Auf Pro upgraden — 7 Tage kostenlos testen
        </Button>
      </SectionWrap>
    )
  }

  // Paid / Trial / Free-with-credits → Export-Buttons
  const downloadHint =
    baseTier === 'free'
      ? `Free-Exporte tragen ein dezentes Watermark. Du hast noch ${totalCredits} Credits dieser Period.`
      : isTrial
        ? `Trial-Exporte sind voll funktional inkl. Commercial License. Trial-Credits: ${totalCredits}.`
        : `Credits werden pro neuem Projekt verbraucht. Re-Downloads desselben Projekts sind gratis.`

  return (
    <SectionWrap>
      <Button
        onClick={() => handleExport('png')}
        disabled={busy !== null || !projectId}
        className="w-full"
      >
        {busy === 'png' ? (
          <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
        ) : (
          <FileImage className="w-4 h-4 mr-1.5" />
        )}
        {busy === 'png' ? 'Wird erstellt…' : 'PNG herunterladen'}
      </Button>

      {!projectId && (
        <p className="text-xs text-amber-700">
          Bitte speichere dein Projekt zuerst, bevor du exportieren kannst.
        </p>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">{downloadHint}</p>

      {baseTier === 'free' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setUpgradeVariant('watermark_blocker')
            setUpgradeOpen(true)
          }}
          className="w-full"
        >
          Watermark entfernen — Pro werden
        </Button>
      )}
    </SectionWrap>
  )
}
