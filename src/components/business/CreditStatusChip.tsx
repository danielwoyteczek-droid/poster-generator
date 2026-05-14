'use client'

import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useB2BSubscription } from '@/hooks/useB2BSubscription'
import { isTrialTier, stripTrialPrefix } from '@/lib/b2b-subscription'

/**
 * PROJ-50: Persistenter Credit-Status fuer die Editor-Toolbar.
 * Zeigt aktuelles Tier + verbleibende Credits + Tooltip mit Rollover-Info.
 *
 * Hidden fuer:
 * - Nicht-eingeloggte User (Visitor)
 * - Loading-Phase (verhindert Layout-Shift)
 */
export function CreditStatusChip() {
  const { status, loading } = useB2BSubscription()

  if (loading || !status) return null

  const isTrial = isTrialTier(status.tier)
  const baseTier = stripTrialPrefix(status.tier)
  const tierLabel = isTrial
    ? `Trial ${baseTier === 'free' ? '' : baseTier[0].toUpperCase() + baseTier.slice(1)}`
    : baseTier === 'free'
      ? 'Free'
      : baseTier[0].toUpperCase() + baseTier.slice(1)

  const totalAvailable = status.creditsRemaining + status.rolloverCredits
  const isLow = totalAvailable <= Math.max(1, Math.floor(status.monthlyQuota * 0.2))
  const isExhausted = totalAvailable === 0

  // Farb-Schema:
  // - Trial: distinct accent (orange-ish) als Reminder, dass es zeitlich limitiert ist
  // - Paid + healthy: brand-tiefpetrol
  // - Free + healthy: neutral
  // - Low/Exhausted: warn-red
  let badgeClass = ''
  if (isExhausted) {
    badgeClass = 'bg-red-100 text-red-900 border-red-300'
  } else if (isLow) {
    badgeClass = 'bg-amber-100 text-amber-900 border-amber-300'
  } else if (isTrial) {
    badgeClass = 'bg-orange-100 text-orange-900 border-orange-300'
  } else if (baseTier !== 'free') {
    badgeClass = 'bg-primary/10 text-primary border-primary/20'
  } else {
    badgeClass = 'bg-muted text-foreground border-border'
  }

  const tooltipBody = (
    <div className="space-y-1 text-xs leading-relaxed">
      <p className="font-medium">{tierLabel}-Plan</p>
      <p>
        {status.creditsRemaining}/{status.monthlyQuota} Credits in dieser Period
      </p>
      {status.rolloverCredits > 0 && status.rolloverExpiresAt && (
        <p>
          +{status.rolloverCredits} Rollover-Credits, verfallen am{' '}
          {new Date(status.rolloverExpiresAt).toLocaleDateString('de-DE')}
        </p>
      )}
      {status.trialEnd && (
        <p>
          Trial endet am {new Date(status.trialEnd).toLocaleDateString('de-DE')}
        </p>
      )}
      {status.currentPeriodEnd && !status.trialEnd && (
        <p>
          {status.cancelAtPeriodEnd ? 'Abo endet am' : 'Naechster Reset:'}{' '}
          {new Date(status.currentPeriodEnd).toLocaleDateString('de-DE')}
        </p>
      )}
      {baseTier === 'free' && (
        <p className="pt-1 italic text-muted-foreground">
          Free-Exporte haben ein Watermark. Pro werden fuer Clean-Downloads.
        </p>
      )}
    </div>
  )

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gap-1.5 cursor-help font-medium ${badgeClass}`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{tierLabel}</span>
            <span className="opacity-70">·</span>
            <span>{totalAvailable}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-xs">
          {tooltipBody}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
