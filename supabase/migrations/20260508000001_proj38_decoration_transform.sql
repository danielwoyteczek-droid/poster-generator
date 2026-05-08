-- PROJ-38 follow-up: per-mask decoration position/size offsets. Lets the
-- admin nudge the decoration overlay independently from the mask silhouette
-- to align e.g. a heart-string ornament with a custom-positioned mask shape.
--
-- Defaults 0/0/1 = no-op transform (matches existing rendering behaviour).
-- Composer wraps the decoration img in a transform that uses these values
-- in the same px-per-poster-unit coord system as the mask transform.

ALTER TABLE public.custom_masks
  ADD COLUMN IF NOT EXISTS decoration_transform_x numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS decoration_transform_y numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS decoration_transform_scale numeric NOT NULL DEFAULT 1;
