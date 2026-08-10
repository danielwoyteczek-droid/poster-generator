'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DTF_SHEET_FORMATS } from '@/lib/dtf-constants'
import { useDtfStore, totalPrintedSheets } from '@/hooks/useDtfStore'
import { cn } from '@/lib/utils'

/**
 * PROJ-55: Liste aller Bögen des Entwurfs.
 *
 * Sitzt in der Seitenleiste, nicht über der Arbeitsfläche. Zwei Gründe:
 * Die Arbeitsfläche bleibt dem Bogen vorbehalten — bei einem Produkt, bei
 * dem der Kunde die Vorschau verbindlich freigibt, soll dort möglichst
 * wenig Bedienoberfläche liegen. Und mobil steckt die Seitenleiste im
 * Tap-Sheet, die Liste ist also ohne Zusatzarbeit auf dem Handy verfügbar,
 * während eine Leiste über dem Bogen dort wertvolle Höhe gekostet hätte.
 *
 * Vertikal statt horizontal, weil die Seitenleiste 288 px breit ist: Eine
 * Zeile pro Bogen bleibt lesbar, nebeneinander gestellte Kacheln wären
 * gequetscht oder müssten seitlich scrollen.
 *
 * Der Kunde gestaltet alle Bögen fertig und legt erst am Ende gemeinsam in
 * den Warenkorb. Die Alternative — jeden Bogen einzeln ablegen — hätte
 * bedeutet, dass ein abgelegter Bogen nur über „Position löschen und neu
 * bauen" änderbar ist.
 */
export function DtfSheetList() {
  const t = useTranslations('dtfEditor')

  const sheets = useDtfStore((s) => s.sheets)
  const activeSheetId = useDtfStore((s) => s.activeSheetId)
  const setActiveSheet = useDtfStore((s) => s.setActiveSheet)
  const addSheet = useDtfStore((s) => s.addSheet)
  const duplicateSheet = useDtfStore((s) => s.duplicateSheet)
  const removeSheet = useDtfStore((s) => s.removeSheet)

  const total = totalPrintedSheets(sheets)

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        {t('sheetsHeading')}
      </Label>

      <div className="space-y-1.5">
        {sheets.map((sheet, index) => {
          const def = DTF_SHEET_FORMATS[sheet.format]
          const isActive = sheet.id === activeSheetId

          return (
            <div
              key={sheet.id}
              className={cn(
                'group relative flex items-center rounded-md border-2 transition-colors',
                isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground',
              )}
            >
              <button
                type="button"
                onClick={() => setActiveSheet(sheet.id)}
                className="flex-1 min-w-0 px-3 py-2 text-left"
              >
                <div
                  className={cn(
                    'text-sm font-medium truncate',
                    isActive ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {t('sheetLabel', { index: index + 1 })}
                </div>
                <div className="text-[11px] text-muted-foreground tabular-nums truncate">
                  {def.label} · {t('sheetTimes', { count: sheet.quantity })}
                  {sheet.elements.length === 0
                    ? ` · ${t('sheetEmpty')}`
                    : ` · ${t('sheetMotifs', { count: sheet.elements.length })}`}
                </div>
              </button>

              {sheets.length > 1 && (
                <button
                  type="button"
                  aria-label={t('sheetRemove', { index: index + 1 })}
                  onClick={() => removeSheet(sheet.id)}
                  // Auf dem Handy gibt es kein Hover — dort dauerhaft
                  // sichtbar, am Desktop erst beim Überfahren.
                  className="shrink-0 mr-2 h-7 w-7 rounded-full text-muted-foreground hover:text-destructive text-lg leading-none md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={addSheet}>
          {t('sheetAdd')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => duplicateSheet(activeSheetId)}
        >
          {t('sheetDuplicate')}
        </Button>
      </div>

      {/* Gesamtzahl gedruckter Bögen über alle Auflagen. Bei zwei
          Mengen-Achsen hat man die sonst leicht falsch im Kopf: drei Bögen
          mit Auflagen 3, 1 und 2 sind sechs gedruckte Bögen. */}
      <p className="text-xs text-muted-foreground">{t('sheetTotal', { count: total })}</p>
    </div>
  )
}
