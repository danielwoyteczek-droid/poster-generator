'use client'

import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFonts } from '@/hooks/useFonts'
import {
  useDtfStore,
  activeSheetOf,
  isTextElement,
  type DtfTextElement,
} from '@/hooks/useDtfStore'
import { cn } from '@/lib/utils'

/**
 * PROJ-55: Text auf dem Bogen.
 *
 * Die Bedienelemente entsprechen bewusst denen der anderen Editoren —
 * Schrift, Größe, Farbe, Ausrichtung, Fett, Versalien, Laufweite. Wer den
 * Stadtkarten-Editor kennt, findet sich hier ohne Umlernen zurecht.
 *
 * Ein Unterschied: Die Größe steht in Millimetern, nicht als abstrakte
 * Zahl. Auf einem Transferbogen will man wissen, wie hoch die Schrift
 * gedruckt wird — bei 10 mm Schriftgröße ist ein Versal rund 7 mm hoch.
 */

const ALIGNMENTS = ['left', 'center', 'right'] as const

export function DtfTextTab() {
  const t = useTranslations('dtfEditor')
  const { fonts } = useFonts()

  const sheet = useDtfStore(activeSheetOf)
  const selectedId = useDtfStore((s) => s.selectedId)
  const addTextElement = useDtfStore((s) => s.addTextElement)
  const updateElement = useDtfStore((s) => s.updateElement)
  const duplicateElement = useDtfStore((s) => s.duplicateElement)
  const removeElement = useDtfStore((s) => s.removeElement)

  const selectedRaw = sheet.elements.find((e) => e.id === selectedId) ?? null
  const selected = selectedRaw && isTextElement(selectedRaw) ? selectedRaw : null

  function patch(changes: Partial<DtfTextElement>) {
    if (!selected) return
    updateElement(selected.id, changes as Partial<DtfTextElement>)
  }

  return (
    <div className="p-4 space-y-6">
      <Button type="button" className="w-full" onClick={() => addTextElement()}>
        {t('textAdd')}
      </Button>

      {!selected && <p className="text-xs text-muted-foreground">{t('textSelectHint')}</p>}

      {selected && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dtf-text" className="text-xs">
              {t('textContent')}
            </Label>
            <Textarea
              id="dtf-text"
              rows={3}
              value={selected.text}
              onChange={(e) => patch({ text: e.target.value })}
              placeholder={t('textPlaceholder')}
            />
            <p className="text-[11px] text-muted-foreground">{t('textLineHint')}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t('textFont')}</Label>
            <Select value={selected.fontFamily} onValueChange={(v) => patch({ fontFamily: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fonts.map((f) => (
                  <SelectItem
                    key={f.id}
                    value={f.family_name}
                    style={{ fontFamily: `"${f.family_name}", system-ui, sans-serif` }}
                  >
                    {f.family_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dtf-font-size" className="text-xs">
              {t('textSizeMm')}
            </Label>
            <Input
              id="dtf-font-size"
              type="number"
              step="0.5"
              min="2"
              value={selected.fontSizeMm.toFixed(1)}
              onChange={(e) => {
                const mm = Number(e.target.value)
                if (Number.isFinite(mm) && mm >= 2) patch({ fontSizeMm: mm })
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dtf-text-color" className="text-xs">
              {t('textColor')}
            </Label>
            <Input
              id="dtf-text-color"
              type="color"
              className="h-9 p-1"
              value={selected.color}
              onChange={(e) => patch({ color: e.target.value })}
            />
            {/* Weiß auf transparentem Bogen ist ein völlig üblicher Fall bei
                DTF — auf dem Karomuster sieht man ihn nur schlecht. */}
            {selected.color.toLowerCase() === '#ffffff' && (
              <p className="text-[11px] text-muted-foreground">{t('textWhiteHint')}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t('textAlign')}</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {ALIGNMENTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => patch({ align: value })}
                  className={cn(
                    'h-8 rounded-md border-2 text-xs transition-colors',
                    selected.align === value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-foreground/70 hover:border-muted-foreground',
                  )}
                >
                  {t(`textAlign_${value}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => patch({ bold: !selected.bold })}
              className={cn(
                'h-9 rounded-md border-2 text-sm font-bold transition-colors',
                selected.bold
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground/70',
              )}
            >
              {t('textBold')}
            </button>
            <button
              type="button"
              onClick={() => patch({ uppercase: !selected.uppercase })}
              className={cn(
                'h-9 rounded-md border-2 text-sm uppercase transition-colors',
                selected.uppercase
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground/70',
              )}
            >
              {t('textUppercase')}
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              {t('textLetterSpacing', { value: Math.round(selected.letterSpacingEm * 1000) })}
            </Label>
            <Slider
              min={-50}
              max={500}
              step={5}
              value={[Math.round(selected.letterSpacingEm * 1000)]}
              onValueChange={([v]) => patch({ letterSpacingEm: v / 1000 })}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => duplicateElement(selected.id)}
            >
              {t('duplicate')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={() => removeElement(selected.id)}
            >
              {t('remove')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
