-- PROJ-56: Image Generator
-- Galerie-Bilder pro Preset (Bild = Auftrag), Overlay-Bibliothek, Vorlagen und
-- verborgene Farbvarianten von Presets. Rein additiv.
--
-- Zugriff: RLS an, keine Policies → nur Service-Role (Admin-Endpunkte), wie
-- preset_renders.

-- ─── Farbvarianten an Presets ───────────────────────────────────────────────
-- Verborgener Preset-Klon mit eingebackener Palette, damit der Render-Worker
-- ein Poster in einer Zusatzfarbe rendern kann. Immer Entwurf, in der
-- Admin-Preset-Übersicht ausgeblendet. Pro Basis-Preset × Palette genau einer.
ALTER TABLE public.presets
  ADD COLUMN IF NOT EXISTS color_variant_of UUID REFERENCES public.presets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS color_variant_palette_id TEXT;

ALTER TABLE public.presets
  ADD CONSTRAINT presets_color_variant_consistency
  CHECK ((color_variant_of IS NULL) = (color_variant_palette_id IS NULL));

CREATE UNIQUE INDEX IF NOT EXISTS presets_color_variant_unique
  ON public.presets (color_variant_of, color_variant_palette_id)
  WHERE color_variant_of IS NOT NULL;

COMMENT ON COLUMN public.presets.color_variant_of IS
  'PROJ-56: gesetzt = verborgene Farbvariante dieses Basis-Presets (Image Generator)';

-- ─── Overlay-Bibliothek ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.image_overlays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  orientation TEXT NOT NULL CHECK (orientation IN ('portrait', 'landscape')),
  storage_path TEXT NOT NULL,
  image_url TEXT NOT NULL,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS image_overlays_orientation_idx
  ON public.image_overlays (orientation, created_at DESC);

ALTER TABLE public.image_overlays ENABLE ROW LEVEL SECURITY;

-- ─── Vorlagen (gespeicherte Mockup-Auswahl) ────────────────────────────────
-- entries: [{ mockup_set_id, overlay_id | null }] in Bild-Reihenfolge.
-- Bewusst ohne Fremdschlüssel, damit gelöschte Mockups/Overlays als
-- „nicht mehr verfügbar" sichtbar bleiben statt still zu verschwinden.
CREATE TABLE IF NOT EXISTS public.image_generator_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  entries JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(entries) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS image_generator_templates_name_unique
  ON public.image_generator_templates (lower(name));

ALTER TABLE public.image_generator_templates ENABLE ROW LEVEL SECURITY;

-- ─── Galerie-Bilder (= Aufträge) ────────────────────────────────────────────
-- mockup_set_id / overlay_id / palette_id ohne Fremdschlüssel: gelöschte
-- Mockups, Overlays oder Paletten dürfen vorhandene Bilder nicht mitreißen.
CREATE TABLE IF NOT EXISTS public.image_generator_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID NOT NULL REFERENCES public.presets(id) ON DELETE CASCADE,
  -- NULL = Grundfarbe des Presets
  palette_id TEXT,
  mockup_set_id UUID NOT NULL,
  overlay_id UUID,
  position INTEGER NOT NULL CHECK (position > 0),
  -- Preset, dessen A4-Poster verwendet wird: Basis-Preset oder Farbvariante
  source_preset_id UUID REFERENCES public.presets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'rendering', 'done', 'failed')),
  error TEXT,
  storage_path TEXT,
  image_url TEXT,
  width INTEGER,
  height INTEGER,
  -- Konfigurations-Hash des Basis-Presets beim Erstellen → „veraltet"-Erkennung
  base_config_hash TEXT,
  claimed_at TIMESTAMPTZ,
  rendered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT image_generator_images_combo_unique
    UNIQUE NULLS NOT DISTINCT (preset_id, palette_id, mockup_set_id, overlay_id)
);

CREATE INDEX IF NOT EXISTS image_generator_images_preset_idx
  ON public.image_generator_images (preset_id, palette_id, position);

CREATE INDEX IF NOT EXISTS image_generator_images_open_idx
  ON public.image_generator_images (status, created_at)
  WHERE status IN ('pending', 'rendering');

ALTER TABLE public.image_generator_images ENABLE ROW LEVEL SECURITY;
