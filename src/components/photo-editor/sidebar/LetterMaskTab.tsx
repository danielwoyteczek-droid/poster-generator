'use client'

import { useTranslations } from 'next-intl'
import { RectangleVertical, RectangleHorizontal } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { usePhotoEditorStore, type PosterOrientation } from '@/hooks/usePhotoEditorStore'
import { cn } from '@/lib/utils'
import {
  LETTER_MASK_MIN,
  LETTER_MASK_MAX,
  LETTER_MASK_MIN_WORD_WIDTH,
  LETTER_MASK_MAX_WORD_WIDTH,
  MASK_FONTS,
  sanitizeLetterMaskInput,
  validateLetterMaskWord,
} from '@/lib/letter-mask'

/**
 * Sidebar-Tab für den Letter-Mask-Modus: Wort-Eingabe + Mask-Font-Anzeige
 * (read-only, da Font im V1 Preset-bestimmt ist) + Default-Slot-Farbe.
 */
export function LetterMaskTab() {
  const t = useTranslations('photoEditor')
  const {
    word,
    wordWidth,
    orientation,
    maskFontKey,
    defaultSlotColor,
    setWord,
    setWordWidth,
    setOrientation,
    setDefaultSlotColor,
  } = usePhotoEditorStore()

  const validation = validateLetterMaskWord(word)
  const font = MASK_FONTS[maskFontKey]

  const handleChange = (raw: string) => {
    setWord(sanitizeLetterMaskInput(raw))
  }

  const orientationOptions: {
    value: PosterOrientation
    label: string
    Icon: typeof RectangleVertical
  }[] = [
    {
      value: 'portrait',
      label: t('orientationPortrait'),
      Icon: RectangleVertical,
    },
    {
      value: 'landscape',
      label: t('orientationLandscape'),
      Icon: RectangleHorizontal,
    },
  ]

  return (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('orientationLabel')}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {orientationOptions.map(({ value, label, Icon }) => {
            const active = orientation === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setOrientation(value)}
                aria-pressed={active}
                className={cn(
                  'flex items-center justify-center gap-1.5 h-9 rounded-md border text-xs transition-colors',
                  active
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="letter-mask-word"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70"
        >
          {t('wordLabel')}
        </Label>
        <Input
          id="letter-mask-word"
          value={word}
          onChange={(e) => handleChange(e.target.value)}
          maxLength={LETTER_MASK_MAX}
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono uppercase tracking-widest"
          aria-invalid={!validation.valid}
          aria-describedby="letter-mask-word-hint"
        />
        <p
          id="letter-mask-word-hint"
          className="text-[11px] text-muted-foreground/70 leading-relaxed"
        >
          {validation.reason === 'too-short'
            ? t('wordTooShort', { min: LETTER_MASK_MIN })
            : t('wordHint', { min: LETTER_MASK_MIN, max: LETTER_MASK_MAX })}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="letter-mask-word-width"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70"
          >
            {t('wordWidthLabel')}
          </Label>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {Math.round(wordWidth * 100)}%
          </span>
        </div>
        <Slider
          id="letter-mask-word-width"
          value={[wordWidth * 100]}
          min={LETTER_MASK_MIN_WORD_WIDTH * 100}
          max={LETTER_MASK_MAX_WORD_WIDTH * 100}
          step={1}
          onValueChange={(v) => setWordWidth(v[0] / 100)}
        />
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          {t('wordWidthHint')}
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('maskFontLabel')}
        </Label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <span
            className="text-2xl leading-none"
            style={{ fontFamily: font.cssFamily, fontWeight: 400 }}
            aria-hidden
          >
            Aa
          </span>
          <span className="text-sm text-muted-foreground">{font.label}</span>
        </div>
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          {t('maskFontHint')}
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="default-slot-color"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70"
        >
          {t('defaultSlotColorLabel')}
        </Label>
        <div className="flex items-center gap-2">
          <input
            id="default-slot-color"
            type="color"
            value={defaultSlotColor}
            onChange={(e) => setDefaultSlotColor(e.target.value)}
            className="h-9 w-12 rounded-md border border-border cursor-pointer"
          />
          <Input
            value={defaultSlotColor}
            onChange={(e) => setDefaultSlotColor(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          {t('defaultSlotColorHint')}
        </p>
      </div>

      <div className="rounded-md bg-muted/40 p-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t('nextStepHint')}
        </p>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-0 h-auto text-xs"
          onClick={() => {
            const tabs = document.querySelector<HTMLButtonElement>(
              '[data-photo-editor-slots-tab]',
            )
            tabs?.click()
          }}
        >
          {t('goToSlotsTab')} →
        </Button>
      </div>
    </div>
  )
}
