export interface StyleOption {
  id: string
  label: string
  mapId: string
  note: string
}

export const STYLE_OPTIONS: StyleOption[] = [
  { id: 'streets', label: 'Streets', mapId: 'streets-v2', note: 'Klassischer Kartenstil mit Straßennamen.' },
  { id: 'basic', label: 'Basic', mapId: 'basic-v2', note: 'Ruhiger, cleaner Standardstil.' },
  { id: 'bright', label: 'Bright', mapId: 'bright-v2', note: 'Heller Stil mit moderner Anmutung.' },
  { id: 'toner', label: 'Toner', mapId: 'toner-v2', note: 'Kontrastreich, gut für Poster-Optik.' },
  { id: 'backdrop', label: 'Backdrop', mapId: 'backdrop', note: 'Weicher Stil mit stärkerer Flächenwirkung.' },
  { id: 'blau-wasser', label: 'Blau-Wasser', mapId: '019ce7b9-403f-703d-95e6-3936bbfe60dc', note: 'Blau-weißer Stil.' },
  { id: 'black', label: 'Schwarz', mapId: '019ce753-b53c-7558-9089-3a7d6e92433a', note: 'Dunkler Stil.' },
  { id: 'white', label: 'Weiß', mapId: '019ce714-41d6-787b-b059-b568443a5447', note: 'Heller Minimalstil.' },
]
