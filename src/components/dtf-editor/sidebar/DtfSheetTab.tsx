'use client'

import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DTF_MAX_SHEET_QUANTITY,
  DTF_SHEET_FORMAT_OPTIONS,
  DTF_SHEET_FORMATS,
} from '@/lib/dtf-constants'
import { useDtfStore, activeSheetOf } from '@/hooks/useDtfStore'
import { DtfSheetList } from './DtfSheetList'
import { DtfAddToCart } from './DtfAddToCart'
import { cn } from '@/lib/utils'

/**
 * PROJ-55: Bogenformat und Auflage.
 *
 * Die zwei Mengen-Achsen werden hier bewusst getrennt benannt, weil sie
 * regelmäßig verwechselt werden: Die **Auflage** vervielfältigt denselben
 * Bogen. Ein zweiter Bogen mit anderen Motiven ist dagegen eine eigene
 * Warenkorb-Position — der Kunde gestaltet ihn, nachdem er diesen abgelegt
 * hat.
 */
export function DtfSheetTab() {
  const t = useTranslations('dtfEditor')
  const activeSheet = useDtfStore(activeSheetOf)
  const setSheetFormat = useDtfStore((s) => s.setSheetFormat)
  const setQuantity = useDtfStore((s) => s.setQuantity)
  const showGrid = useDtfStore((s) => s.showGrid)
  const setShowGrid = useDtfStore((s) => s.setShowGrid)

  const sheetFormat = activeSheet.format
  const quantity = activeSheet.quantity
  const sheet = DTF_SHEET_FORMATS[sheetFormat]

  return (
    <div className="p-4 space-y-6">
      {/* Erst den Bogen wählen, dann seine Eigenschaften — Format und
          Auflage darunter beziehen sich immer auf den hier aktiven. */}
      <DtfSheetList />

      <div className="space-y-2 pt-2 border-t border-border">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('sheetFormat')}
        </Label>
        <div className="grid grid-cols-1 gap-1.5">
          {DTF_SHEET_FORMAT_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSheetFormat(f.id)}
              className={cn(
                'h-10 rounded-md border-2 px-3 text-sm font-medium transition-colors flex items-center justify-between',
                sheetFormat === f.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground/70 hover:border-muted-foreground',
              )}
            >
              <span>{f.label}</span>
              <span className="text-xs opacity-80">
                {f.widthMm / 10} × {f.heightMm / 10} cm
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('sheetFormatHint', {
            width: sheet.widthMm / 10,
            height: sheet.heightMm / 10,
          })}
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="dtf-quantity"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70"
        >
          {t('quantity')}
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('quantityDecrease')}
            onClick={() => setQuantity(quantity - 1)}
            disabled={quantity <= 1}
          >
            −
          </Button>
          <Input
            id="dtf-quantity"
            type="number"
            min={1}
            max={DTF_MAX_SHEET_QUANTITY}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            className="text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('quantityIncrease')}
            onClick={() => setQuantity(quantity + 1)}
            disabled={quantity >= DTF_MAX_SHEET_QUANTITY}
          >
            +
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('quantityHint')}</p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <div className="space-y-0.5">
          <Label htmlFor="dtf-grid" className="text-sm">
            {t('grid')}
          </Label>
          <p className="text-xs text-muted-foreground">{t('gridHint')}</p>
        </div>
        <Switch id="dtf-grid" checked={showGrid} onCheckedChange={setShowGrid} />
      </div>

      <div className="pt-2 border-t border-border">
        <DtfAddToCart />
      </div>
    </div>
  )
}
