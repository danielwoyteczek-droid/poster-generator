'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { DTF_SHEET_FORMATS } from '@/lib/dtf-constants'
import { useDtfStore, totalPrintedSheets } from '@/hooks/useDtfStore'
import { cn } from '@/lib/utils'

/**
 * PROJ-55: Leiste mit allen Bögen des Entwurfs.
 *
 * Der Kunde gestaltet alle Bögen fertig und legt erst am Ende gemeinsam in
 * den Warenkorb. Die Alternative — jeden Bogen einzeln ablegen und mit
 * leerer Fläche weitermachen — wäre einfacher gewesen, hätte aber bedeutet,
 * dass ein bereits abgelegter Bogen nur noch über „Position löschen und neu
 * bauen" änderbar ist.
 *
 * Jeder Bogen zeigt Format und Auflage, weil beides pro Bogen unabhängig
 * ist: Bogen 1 kann A4 in dreifacher Auflage sein, Bogen 2 A3 als
 * Einzelstück. Rechts steht die Gesamtzahl gedruckter Bögen — das ist die
 * Zahl, die der Kunde am Ende bezahlt, und sie ist bei zwei Mengen-Achsen
 * nicht auf den ersten Blick offensichtlich.
 */
export function DtfSheetStrip() {
  const t = useTranslations('dtfEditor')

  const sheets = useDtfStore((s) => s.sheets)
  const activeSheetId = useDtfStore((s) => s.activeSheetId)
  const setActiveSheet = useDtfStore((s) => s.setActiveSheet)
  const addSheet = useDtfStore((s) => s.addSheet)
  const duplicateSheet = useDtfStore((s) => s.duplicateSheet)
  const removeSheet = useDtfStore((s) => s.removeSheet)

  const total = totalPrintedSheets(sheets)

  return (
    <div className="shrink-0 border-b border-border bg-white">
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">
        {sheets.map((sheet, index) => {
          const def = DTF_SHEET_FORMATS[sheet.format]
          const isActive = sheet.id === activeSheetId

          return (
            <div
              key={sheet.id}
              className={cn(
                'group relative shrink-0 rounded-md border-2 transition-colors',
                isActive ? 'border-primary' : 'border-border hover:border-muted-foreground',
              )}
            >
              <button
                type="button"
                onClick={() => setActiveSheet(sheet.id)}
                className="px-3 py-1.5 text-left"
              >
                <div
                  className={cn(
                    'text-xs font-medium',
                    isActive ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {t('sheetLabel', { index: index + 1 })}
                </div>
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {def.label} · {t('sheetTimes', { count: sheet.quantity })}
                  {sheet.elements.length === 0 && ` · ${t('sheetEmpty')}`}
                </div>
              </button>

              {sheets.length > 1 && (
                <button
                  type="button"
                  aria-label={t('sheetRemove', { index: index + 1 })}
                  onClick={() => removeSheet(sheet.id)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs leading-none opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}

        <Button type="button" variant="outline" size="sm" onClick={addSheet} className="shrink-0">
          {t('sheetAdd')}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => duplicateSheet(activeSheetId)}
          className="shrink-0"
        >
          {t('sheetDuplicate')}
        </Button>

        <div className="ml-auto shrink-0 pl-3 text-xs text-muted-foreground whitespace-nowrap">
          {t('sheetTotal', { count: total })}
        </div>
      </div>
    </div>
  )
}
