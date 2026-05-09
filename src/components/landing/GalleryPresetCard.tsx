'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { LayoutTemplate } from 'lucide-react'
import {
  DEFAULT_PREVIEW_FORMAT,
  getAvailableFormats,
  getPreviewUrl,
  type PresetWithPreviews,
} from '@/lib/preset-previews'
import type { PrintFormat } from '@/lib/print-formats'
import { PresetFormatSwitcher } from './PresetFormatSwitcher'

export interface GalleryPreset extends PresetWithPreviews {
  id: string
  name: string
  poster_type: 'map' | 'star-map'
}

interface Props {
  preset: GalleryPreset
  posterTypeMapLabel: string
  posterTypeStarMapLabel: string
  /** CSS aspect-ratio for the card image area. Default `2/3` matches the
   *  poster proportions used by the gallery; landing-page sliders may pass
   *  `1/1` for room-mockup images. */
  aspectRatio?: string
  /** Tailwind class(es) for aspect-ratio. Overrides `aspectRatio` when set —
   *  use this when the desktop and mobile aspect ratios differ
   *  (e.g. `aspect-[2/3] md:aspect-square` for occasion landing pages,
   *  where desktop shows 1:1 room-mockups but mobile shows 2:3 poster previews). */
  aspectClassName?: string
  /** Tailwind class(es) controlling how the image fits the card frame.
   *  Default `object-cover` matches the gallery's clean grid look. Use
   *  responsive variants when the desktop/mobile aspect ratios differ
   *  (e.g. `object-cover md:object-contain` on the occasion page, where
   *  mobile keeps a snug 2:3 fit but desktop letterboxes the 2:3 poster
   *  inside the 1:1 frame). */
  objectFitClassName?: string
}

/**
 * Single card linking to the editor with the preset pre-loaded via the
 * existing PresetUrlApplier mechanism. PROJ-39: Customer can flip between
 * A4/A3/A2 previews via a switcher under the image (desktop only); the
 * chosen format is carried into the editor URL so the editor opens at that
 * size. Cross-poster_type mismatches are still handled transparently by
 * PresetUrlApplier (it redirects automatically).
 */
export function GalleryPresetCard({
  preset,
  posterTypeMapLabel,
  posterTypeStarMapLabel,
  aspectRatio = '2/3',
  aspectClassName,
  objectFitClassName = 'object-cover',
}: Props) {
  const availableFormats = getAvailableFormats(preset)
  const initialFormat: PrintFormat = availableFormats.includes(DEFAULT_PREVIEW_FORMAT)
    ? DEFAULT_PREVIEW_FORMAT
    : availableFormats[0] ?? DEFAULT_PREVIEW_FORMAT
  const [format, setFormat] = useState<PrintFormat>(initialFormat)

  const editorPath = preset.poster_type === 'star-map' ? '/star-map' : '/map'
  // PROJ-39: format carry-over so the editor opens with the customer's
  // chosen format pre-selected.
  const href = `${editorPath}?preset=${preset.id}&format=${format}`
  const typeLabel =
    preset.poster_type === 'star-map' ? posterTypeStarMapLabel : posterTypeMapLabel

  const imageUrl = getPreviewUrl(preset, format)

  return (
    <div className="group flex flex-col gap-2">
      <Link
        href={href}
        className="flex flex-col gap-3"
        aria-label={`${preset.name} — ${typeLabel}`}
      >
        <div
          className={`relative w-full bg-muted rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-shadow${aspectClassName ? ` ${aspectClassName}` : ''}`}
          style={aspectClassName ? undefined : { aspectRatio }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={preset.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`${objectFitClassName} transition-transform duration-300 group-hover:scale-[1.02]`}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
              <LayoutTemplate className="w-12 h-12" />
            </div>
          )}
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/95 text-foreground/80 backdrop-blur shadow-sm">
            {typeLabel}
          </span>
        </div>
        <h3 className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors text-center px-1">
          {preset.name}
        </h3>
      </Link>
      <PresetFormatSwitcher
        formats={availableFormats}
        active={format}
        onChange={setFormat}
      />
    </div>
  )
}
