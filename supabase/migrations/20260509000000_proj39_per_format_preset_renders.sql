-- PROJ-39: Multi-Format Preset-Renders. Pro Preset werden alle drei
-- Hochkant-Formate (A4/A3/A2) separat gerendert. Existierende Single-Format-
-- Spalten (preview_image_url, render_status, ...) bleiben temporär parallel
-- bestehen (Compat-Modus während Migration). Eine spätere Cleanup-Migration
-- räumt sie weg, sobald alle Konsumenten umgestellt sind.

ALTER TABLE public.presets
  ADD COLUMN IF NOT EXISTS preview_image_url_a4 text,
  ADD COLUMN IF NOT EXISTS preview_image_url_a3 text,
  ADD COLUMN IF NOT EXISTS preview_image_url_a2 text,
  ADD COLUMN IF NOT EXISTS render_status_a4 text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS render_status_a3 text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS render_status_a2 text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS render_inputs_hash_a4 text,
  ADD COLUMN IF NOT EXISTS render_inputs_hash_a3 text,
  ADD COLUMN IF NOT EXISTS render_inputs_hash_a2 text,
  ADD COLUMN IF NOT EXISTS render_error_a4 text,
  ADD COLUMN IF NOT EXISTS render_error_a3 text,
  ADD COLUMN IF NOT EXISTS render_error_a2 text,
  ADD COLUMN IF NOT EXISTS render_started_at_a4 timestamptz,
  ADD COLUMN IF NOT EXISTS render_started_at_a3 timestamptz,
  ADD COLUMN IF NOT EXISTS render_started_at_a2 timestamptz,
  ADD COLUMN IF NOT EXISTS render_completed_at_a4 timestamptz,
  ADD COLUMN IF NOT EXISTS render_completed_at_a3 timestamptz,
  ADD COLUMN IF NOT EXISTS render_completed_at_a2 timestamptz;

ALTER TABLE public.presets
  ADD CONSTRAINT presets_render_status_a4_check
    CHECK (render_status_a4 IN ('pending','rendering','done','failed','stale')) NOT VALID,
  ADD CONSTRAINT presets_render_status_a3_check
    CHECK (render_status_a3 IN ('pending','rendering','done','failed','stale')) NOT VALID,
  ADD CONSTRAINT presets_render_status_a2_check
    CHECK (render_status_a2 IN ('pending','rendering','done','failed','stale')) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_presets_render_status_a4
  ON public.presets (render_status_a4) WHERE render_status_a4 IN ('pending','stale');
CREATE INDEX IF NOT EXISTS idx_presets_render_status_a3
  ON public.presets (render_status_a3) WHERE render_status_a3 IN ('pending','stale');
CREATE INDEX IF NOT EXISTS idx_presets_render_status_a2
  ON public.presets (render_status_a2) WHERE render_status_a2 IN ('pending','stale');

UPDATE public.presets
  SET preview_image_url_a4 = preview_image_url,
      render_status_a4 = render_status,
      render_inputs_hash_a4 = render_inputs_hash,
      render_error_a4 = render_error,
      render_started_at_a4 = render_started_at,
      render_completed_at_a4 = render_completed_at
  WHERE preview_image_url IS NOT NULL OR render_status != 'pending';
