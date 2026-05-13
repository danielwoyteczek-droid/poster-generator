'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useTypographyEditorStore } from '@/hooks/useTypographyEditorStore'
import { useEditorStore } from '@/hooks/useEditorStore'
import {
  TYPOGRAPHY_TEMPLATES,
  TYPOGRAPHY_PALETTES,
  getTypographyTemplate,
  getTypographyFontsForLocale,
} from '@/lib/typography-templates'
import type { Locale } from '@/i18n/config'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

/**
 * Edit-Felder fürs Typografie-Hochzeitsposter. Pattern wie WeddingSidebar:
 * w-72 auf Desktop, scrollbar, Brand-Tokens fürs Spacing/Typo.
 *
 * Felder:
 *   - Template-Picker (Select; Galerie-Modal kommt in späterem Chunk)
 *   - Hero-Text (nur wenn Template.hasHeroText)
 *   - Paar-Namen (2 Felder)
 *   - Datum (optional)
 *   - Palette (6 kuratierte)
 *   - Font (locale-gefiltert)
 *   - Format A4/A3/A2 (shared State über useEditorStore)
 */
export function TypographySidebar() {
  const t = useTranslations('typography')
  const locale = useLocale() as Locale

  const templateKey = useTypographyEditorStore((s) => s.templateKey)
  const heroText = useTypographyEditorStore((s) => s.heroText)
  const name1 = useTypographyEditorStore((s) => s.name1)
  const name2 = useTypographyEditorStore((s) => s.name2)
  const weddingDate = useTypographyEditorStore((s) => s.weddingDate)
  const paletteId = useTypographyEditorStore((s) => s.paletteId)
  const fontKey = useTypographyEditorStore((s) => s.fontKey)
  const setTemplateKey = useTypographyEditorStore((s) => s.setTemplateKey)
  const setHeroText = useTypographyEditorStore((s) => s.setHeroText)
  const setName1 = useTypographyEditorStore((s) => s.setName1)
  const setName2 = useTypographyEditorStore((s) => s.setName2)
  const setWeddingDate = useTypographyEditorStore((s) => s.setWeddingDate)
  const setPaletteId = useTypographyEditorStore((s) => s.setPaletteId)
  const setFontKey = useTypographyEditorStore((s) => s.setFontKey)

  const printFormat = useEditorStore((s) => s.printFormat)
  const setPrintFormat = useEditorStore((s) => s.setPrintFormat)

  const tpl = getTypographyTemplate(templateKey)
  const availableFonts = getTypographyFontsForLocale(locale)

  return (
    <aside className="w-72 shrink-0 h-full overflow-y-auto border-r bg-background">
      <div className="p-5 space-y-6">
        <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">
          {t('sidebar.title')}
        </h2>

        {/* Template-Picker */}
        <div className="space-y-2">
          <Label htmlFor="typo-template">{t('sidebar.template')}</Label>
          <Select value={templateKey} onValueChange={setTemplateKey}>
            <SelectTrigger id="typo-template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPOGRAPHY_TEMPLATES.filter((t) => t.active).map((opt) => (
                <SelectItem key={opt.templateKey} value={opt.templateKey}>
                  {opt.label[locale] ?? opt.label.de}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Hero-Text (conditional) */}
        {tpl?.hasHeroText ? (
          <div className="space-y-2">
            <Label htmlFor="typo-hero">{t('sidebar.heroText')}</Label>
            <Input
              id="typo-hero"
              value={heroText}
              onChange={(e) => setHeroText(e.target.value)}
              placeholder={tpl.defaultHeroText?.[locale] ?? ''}
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">{t('sidebar.heroTextHint')}</p>
          </div>
        ) : null}

        {/* Names */}
        <div className="space-y-2">
          <Label htmlFor="typo-name1">{t('sidebar.name1')}</Label>
          <Input
            id="typo-name1"
            value={name1}
            onChange={(e) => setName1(e.target.value)}
            placeholder={t('sidebar.name1Placeholder')}
            maxLength={40}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="typo-name2">{t('sidebar.name2')}</Label>
          <Input
            id="typo-name2"
            value={name2}
            onChange={(e) => setName2(e.target.value)}
            placeholder={t('sidebar.name2Placeholder')}
            maxLength={40}
          />
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="typo-date">{t('sidebar.date')}</Label>
          <Input
            id="typo-date"
            type="date"
            value={weddingDate}
            onChange={(e) => setWeddingDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t('sidebar.dateHint')}</p>
        </div>

        <Separator />

        {/* Palette */}
        <div className="space-y-2">
          <Label>{t('sidebar.palette')}</Label>
          <div className="grid grid-cols-3 gap-2">
            {TYPOGRAPHY_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPaletteId(p.id)}
                className={`relative rounded-md border-2 transition-all overflow-hidden h-12 ${
                  paletteId === p.id ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                }`}
                aria-label={p.label[locale]}
                title={p.label[locale]}
              >
                <div className="absolute inset-0 grid grid-cols-2">
                  <div style={{ background: p.background }} />
                  <div style={{ background: p.ink }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Font */}
        <div className="space-y-2">
          <Label htmlFor="typo-font">{t('sidebar.font')}</Label>
          <Select value={fontKey} onValueChange={setFontKey}>
            <SelectTrigger id="typo-font">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableFonts.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  <span style={{ fontFamily: f.heroFamily, fontStyle: 'italic' }}>{f.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Format */}
        <div className="space-y-2">
          <Label htmlFor="typo-format">{t('sidebar.format')}</Label>
          <Select value={printFormat} onValueChange={(v) => setPrintFormat(v as typeof printFormat)}>
            <SelectTrigger id="typo-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4</SelectItem>
              <SelectItem value="a3">A3</SelectItem>
              <SelectItem value="a2">A2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </aside>
  )
}
