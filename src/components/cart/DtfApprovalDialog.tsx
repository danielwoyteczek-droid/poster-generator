'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DTF_MIN_DPI_WARNING,
  DTF_SHEET_FORMATS,
  type DtfSheetFormat,
} from '@/lib/dtf-constants'
import { elementDpi, elementHeightMm, type DtfElement } from '@/hooks/useDtfStore'
import type { CartItem } from '@/hooks/useCartStore'
import { DtfSheetPreview } from './DtfSheetPreview'

/**
 * PROJ-55: Druckfreigabe vor dem Bezahlen.
 *
 * Bewusst ein Dialog VOR dem Checkout statt eines zusätzlichen Schritts IM
 * Checkout. Der bestehende Bestellablauf bleibt damit unverändert — durch
 * ihn läuft jede Bestellung des Shops, und ein Umbau dort wäre das größte
 * vermeidbare Risiko dieses Features. Enthält der Warenkorb keine
 * DTF-Position, erscheint der Dialog gar nicht.
 *
 * Der Kunde bestätigt einmal für die gesamte Bestellung, nicht pro Bogen.
 * Er kann vorher beliebig oft zurück und ändern, ohne eine Freigabe zu
 * entwerten — bestätigt wird der Stand, der im Moment des Bezahlens im
 * Warenkorb liegt.
 */

interface DtfSheetSnapshot {
  kind: 'dtf-sheet'
  format: DtfSheetFormat
  quantity: number
  elements: DtfElement[]
}

/** Erkennt eine DTF-Position an ihrer eingefrorenen Bogenbeschreibung. */
export function readDtfSnapshot(item: CartItem): DtfSheetSnapshot | null {
  if (item.productId !== 'dtf') return null
  const snap = item.snapshot as unknown
  if (!snap || typeof snap !== 'object') return null
  const candidate = snap as Partial<DtfSheetSnapshot>
  if (candidate.kind !== 'dtf-sheet' || !Array.isArray(candidate.elements)) return null
  return candidate as DtfSheetSnapshot
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CartItem[]
  /** Wird mit den beiden Zeitstempeln aufgerufen, wenn der Kunde bestätigt. */
  onConfirm: (approval: { printApprovedAt: string; rightsConfirmedAt: string }) => void
  isSubmitting: boolean
}

export function DtfApprovalDialog({
  open,
  onOpenChange,
  items,
  onConfirm,
  isSubmitting,
}: Props) {
  const t = useTranslations('dtfApproval')
  const [printApproved, setPrintApproved] = useState(false)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)

  // Beim Öffnen immer unangekreuzt starten. Ein Dialog, der die
  // Bestätigung vom letzten Mal mitbringt, ist keine Bestätigung.
  useEffect(() => {
    if (open) {
      setPrintApproved(false)
      setRightsConfirmed(false)
    }
  }, [open])

  const sheets = items
    .map((item) => ({ item, snapshot: readDtfSnapshot(item) }))
    .filter((entry): entry is { item: CartItem; snapshot: DtfSheetSnapshot } => !!entry.snapshot)

  // Motive unterhalb der Warnschwelle noch einmal auflisten. Im Editor
  // stand die Warnung am Motiv; hier ist der letzte Moment, in dem der
  // Kunde sie sehen kann, bevor er verbindlich freigibt.
  const lowDpi = sheets.flatMap(({ snapshot }, sheetIndex) =>
    snapshot.elements
      // elementDpi liefert bei Text null — Text wird mit Druckauflösung
      // gerastert und kann deshalb nicht zu grob sein.
      .filter((el) => {
        const dpi = elementDpi(el)
        return dpi !== null && dpi < DTF_MIN_DPI_WARNING
      })
      .map((el) => ({
        sheetIndex: sheetIndex + 1,
        dpi: elementDpi(el) ?? 0,
        widthCm: (el.widthMm / 10).toFixed(1),
        heightCm: (elementHeightMm(el) / 10).toFixed(1),
      })),
  )

  const canConfirm = printApproved && rightsConfirmed && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('intro')}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-4">
            {sheets.map(({ item, snapshot }, index) => {
              const def = DTF_SHEET_FORMATS[snapshot.format]
              return (
                <div key={item.id} className="flex gap-4 rounded-md border border-border p-3">
                  <DtfSheetPreview
                    format={snapshot.format}
                    elements={snapshot.elements}
                    widthPx={120}
                  />
                  <div className="min-w-0 text-sm">
                    <div className="font-medium">{t('sheetLabel', { index: index + 1 })}</div>
                    <div className="text-muted-foreground text-xs mt-1 space-y-0.5">
                      <div>
                        {def.label} — {def.widthMm / 10} × {def.heightMm / 10} cm
                      </div>
                      <div>{t('quantity', { count: snapshot.quantity })}</div>
                      <div>{t('motifCount', { count: snapshot.elements.length })}</div>
                    </div>
                  </div>
                </div>
              )
            })}

            {lowDpi.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs space-y-1">
                  <p className="font-medium">{t('lowDpiHeading', { count: lowDpi.length })}</p>
                  <ul className="list-disc pl-4">
                    {lowDpi.map((entry, i) => (
                      <li key={i}>
                        {t('lowDpiItem', {
                          sheet: entry.sheetIndex,
                          width: entry.widthCm,
                          height: entry.heightCm,
                          dpi: entry.dpi,
                        })}
                      </li>
                    ))}
                  </ul>
                  <p>{t('lowDpiHint', { min: DTF_MIN_DPI_WARNING })}</p>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3 rounded-md bg-muted/50 p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="dtf-print-approval"
                  checked={printApproved}
                  onCheckedChange={(v) => setPrintApproved(v === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="dtf-print-approval"
                  className="text-sm font-normal leading-snug cursor-pointer"
                >
                  {t('checkboxPrint')}
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="dtf-rights-confirmation"
                  checked={rightsConfirmed}
                  onCheckedChange={(v) => setRightsConfirmed(v === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="dtf-rights-confirmation"
                  className="text-sm font-normal leading-snug cursor-pointer"
                >
                  {t('checkboxRights')}
                </Label>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('back')}
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              // Zwei getrennte Zeitstempel, obwohl beide im selben Klick
              // entstehen: Es sind zwei verschiedene Erklärungen, und in
              // einem Streitfall will man sie einzeln belegen können.
              const now = new Date().toISOString()
              onConfirm({ printApprovedAt: now, rightsConfirmedAt: now })
            }}
          >
            {isSubmitting ? t('submitting') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
