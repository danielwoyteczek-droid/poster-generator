-- PROJ-40: Per-mask poster-type applicability.
-- Adds `applicable_poster_types text[]` to custom_masks so the admin can
-- decide whether each mask shows up in the map / star-map / photo editor.
-- Default ['map'] for existing rows preserves today's behaviour — no mask
-- silently appears in the new star-map picker until the admin opts in.

ALTER TABLE public.custom_masks
  ADD COLUMN IF NOT EXISTS applicable_poster_types text[] NOT NULL DEFAULT ARRAY['map']::text[];

-- Constraint: only the three known editor variants are allowed. Catches
-- typos in API/UI before they pollute the mask catalogue.
ALTER TABLE public.custom_masks
  DROP CONSTRAINT IF EXISTS custom_masks_applicable_poster_types_valid;
ALTER TABLE public.custom_masks
  ADD CONSTRAINT custom_masks_applicable_poster_types_valid
  CHECK (
    applicable_poster_types <@ ARRAY['map', 'star-map', 'photo']::text[]
    AND array_length(applicable_poster_types, 1) >= 1
  );

-- GIN index for the customer-facing /api/masks?posterType=… filter.
-- Array containment (`@>`) uses GIN efficiently.
CREATE INDEX IF NOT EXISTS idx_custom_masks_applicable_poster_types
  ON public.custom_masks USING gin (applicable_poster_types);
