'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DTF_SHEET_FORMATS } from '@/lib/dtf-constants'
import { formatPrice } from '@/lib/products'
import { useProductCatalog, dtfSheetPriceFromCatalog } from '@/hooks/useProductCatalog'
import { useCartStore } from '@/hooks/useCartStore'
import {
  useDtfStore,
  totalPrintedSheets,
  isTextElement,
  type DtfSheet,
  type DtfElement,
} from '@/hooks/useDtfStore'
import { rasterizeTextElement } from '@/lib/dtf-text-raster'
import { uploadDtfBlob } from '@/lib/dtf-upload'

/**
 * PROJ-55: Legt den gesamten Entwurf in den Warenkorb — jeden Bogen als
 * eigene Position.
 *
 * Alle Bögen auf einmal, nicht einzeln: Der Kunde gestaltet fertig und legt
 * dann ab. Würde er Bogen für Bogen ablegen, wäre ein bereits abgelegter
 * Bogen nur noch über „Position löschen und neu bauen" änderbar.
 *
 * Der Preis wird hier berechnet und in der Position festgehalten — dasselbe
 * Vorgehen wie bei Postern. `priceCents` ist der Gesamtpreis der Position,
 * also Stückpreis × Auflage; der Checkout schickt Stückpreis und Menge
 * getrennt an Stripe.
 *
 * Ohne gepflegte Price-IDs erscheint der Knopf gar nicht. Ein Kaufknopf,
 * der nach dem Gestalten in einer Fehlermeldung endet, wäre die schlechtere
 * Variante.
 */
export function DtfAddToCart() {
  const t = useTranslations('dtfEditor')
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)

  const { loading, dtfSheets: priceTable } = useProductCatalog()
  const addItem = useCartStore((s) => s.addItem)

  const sheets = useDtfStore((s) => s.sheets)
  const reset = useDtfStore((s) => s.reset)

  const filled = sheets.filter((s) => s.elements.length > 0)
  const empty = sheets.length - filled.length
  const totalSheets = totalPrintedSheets(filled)

  function unitCents(sheet: DtfSheet): number | null {
    return dtfSheetPriceFromCatalog(priceTable, sheet.format)?.unitAmount ?? null
  }

  // Fehlt für irgendein verwendetes Format ein Preis, ist der Entwurf nicht
  // bestellbar — lieber gar kein Knopf als ein scheiternder Checkout.
  const missingPrice = filled.some((s) => unitCents(s) === null)
  const totalCents = filled.reduce((sum, s) => sum + (unitCents(s) ?? 0) * s.quantity, 0)

  if (loading) return null
  if (filled.length === 0) {
    return <p className="text-xs text-muted-foreground">{t('cartNeedsMotif')}</p>
  }
  if (missingPrice) {
    return (
      <Alert>
        <AlertDescription className="text-xs">{t('cartUnavailable')}</AlertDescription>
      </Alert>
    )
  }

  /**
   * Textelemente in Bilder verwandeln, bevor der Bogen abgelegt wird.
   *
   * Ab hier ist Text für Vorschau, Warenkorb und Druckdatei schlicht ein
   * Bild — kein zweiter Zeichenweg und keine Schrifteinbettung in der PDF.
   * Vor allem: Vorschau und Druck können nicht auseinanderlaufen, weil
   * beide dieselbe Rastergrafik zeigen.
   */
  async function rasterizeSheet(sheet: DtfSheet): Promise<DtfElement[]> {
    const out: DtfElement[] = []
    for (const el of sheet.elements) {
      if (!isTextElement(el)) {
        out.push(el)
        continue
      }
      // Leere Textfelder fallen weg statt als unsichtbares Element in die
      // Bestellung zu wandern.
      if (!el.text.trim()) continue

      const raster = await rasterizeTextElement(el)
      const uploadId = await uploadDtfBlob(
        raster.blob,
        `text-${el.id}.png`,
        { widthPx: raster.widthPx, heightPx: raster.heightPx },
      )
      out.push({
        id: el.id,
        kind: 'image',
        uploadId,
        previewUrl: URL.createObjectURL(raster.blob),
        sourceWidthPx: raster.widthPx,
        sourceHeightPx: raster.heightPx,
        // Position und Drehung bleiben; die Größe kommt aus dem Raster,
        // damit gedruckt wird, was im Editor stand.
        xMm: el.xMm,
        yMm: el.yMm,
        widthMm: raster.widthMm,
        rotationDeg: el.rotationDeg,
        z: el.z,
      })
    }
    return out
  }

  async function handleAdd() {
    setIsAdding(true)
    try {
      for (const [index, sheet] of filled.entries()) {
        const unit = unitCents(sheet)!
        const elements = await rasterizeSheet(sheet)
        const def = DTF_SHEET_FORMATS[sheet.format]
        addItem({
          productId: 'dtf',
          withFrame: false,
          format: sheet.format,
          posterType: 'dtf',
          quantity: sheet.quantity,
          title: t('cartItemTitle', { index: index + 1, format: def.label }),
          priceCents: unit * sheet.quantity,
          // Der Editor rendert keine Rasterbilder; die Vorschau der Position
          // entsteht später serverseitig aus derselben Bogenbeschreibung wie
          // die Druckdatei. Bis dahin bleibt das Feld leer.
          previewDataUrl: '',
          // Die vollständige Bogenbeschreibung. Sie ist die eingefrorene
          // Kopie: Was hier steht, wird gedruckt — spätere Änderungen am
          // Entwurf ändern die Position nicht mehr.
          snapshot: {
            kind: 'dtf-sheet',
            format: sheet.format,
            quantity: sheet.quantity,
            elements,
          },
          projectId: null,
        })
      }

      toast.success(t('cartAdded', { count: filled.length }))
      // Entwurf zurücksetzen: Die Positionen tragen ihre eigene Kopie, ein
      // Weiterbearbeiten der Vorlage würde sie nicht mehr beeinflussen und
      // nur den Eindruck erwecken, es täte es.
      reset()
      router.push('/cart')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cartAddFailed'))
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-2">
      {empty > 0 && (
        <p className="text-xs text-muted-foreground">{t('cartSkipsEmpty', { count: empty })}</p>
      )}

      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">
          {t('cartSummary', { sheets: totalSheets, positions: filled.length })}
        </span>
        <span className="font-semibold tabular-nums">{formatPrice(totalCents)}</span>
      </div>

      <Button type="button" className="w-full" disabled={isAdding} onClick={() => void handleAdd()}>
        {isAdding ? t('cartAdding') : t('cartAdd')}
      </Button>
    </div>
  )
}
