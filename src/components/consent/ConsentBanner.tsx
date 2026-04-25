'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { readConsent, writeConsent } from '@/lib/analytics'

export function ConsentBanner() {
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const stored = readConsent()
    if (!stored) {
      setOpen(true)
      return
    }
    writeConsent(stored)
  }, [])

  useEffect(() => {
    const listener = () => {
      setDetails(true)
      setOpen(true)
    }
    window.addEventListener('open-consent-settings', listener)
    return () => window.removeEventListener('open-consent-settings', listener)
  }, [])

  const acceptAll = () => {
    writeConsent({ analytics: 'granted', marketing: 'granted' })
    setOpen(false)
  }
  const rejectAll = () => {
    writeConsent({ analytics: 'denied', marketing: 'denied' })
    setOpen(false)
  }
  const saveChoices = () => {
    writeConsent({
      analytics: analytics ? 'granted' : 'denied',
      marketing: marketing ? 'granted' : 'denied',
    })
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none">
      <div className="mx-auto max-w-2xl bg-white border border-border rounded-2xl shadow-xl p-6 pointer-events-auto">
        {!details ? (
          <>
            <h2 className="text-base font-semibold text-foreground mb-2">Cookies & Tracking</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Wir verwenden Cookies, um unsere Seite zu verbessern und Werbung messbar zu machen.
              Notwendige Cookies sind immer aktiv. Analyse- und Marketing-Cookies nur mit deiner Einwilligung.
              Details in unserer <Link href="/cookie-richtlinie" className="underline">Cookie-Richtlinie</Link>.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={acceptAll} className="flex-1">Alle akzeptieren</Button>
              <Button onClick={rejectAll} variant="outline" className="flex-1">Nur notwendige</Button>
              <Button onClick={() => setDetails(true)} variant="ghost" className="flex-1">Einstellungen</Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-foreground mb-4">Einstellungen</h2>
            <div className="space-y-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">Notwendig</div>
                  <div className="text-xs text-muted-foreground">Für Warenkorb, Login und Checkout – immer aktiv.</div>
                </div>
                <Switch checked disabled />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">Analyse</div>
                  <div className="text-xs text-muted-foreground">Hilft uns zu verstehen, wie die Seite genutzt wird (z. B. Google Analytics).</div>
                </div>
                <Switch checked={analytics} onCheckedChange={setAnalytics} />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">Marketing</div>
                  <div className="text-xs text-muted-foreground">Messung und Remarketing für Google Ads, Meta, TikTok.</div>
                </div>
                <Switch checked={marketing} onCheckedChange={setMarketing} />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={saveChoices} className="flex-1">Auswahl speichern</Button>
              <Button onClick={() => setDetails(false)} variant="outline" className="flex-1">Zurück</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function openConsentSettings() {
  window.dispatchEvent(new Event('open-consent-settings'))
}
