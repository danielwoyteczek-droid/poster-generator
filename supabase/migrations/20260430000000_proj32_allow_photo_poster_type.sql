-- PROJ-32: Foto-Poster als zusätzlicher poster_type für Presets.
--
-- Vorher: presets_poster_type_check erlaubte nur 'map' | 'star-map'.
-- Foto-Poster bekommen einen Save-as-Preset-Flow analog zu den anderen
-- Editoren — dafür muss der Constraint 'photo' zusätzlich akzeptieren.

ALTER TABLE public.presets DROP CONSTRAINT presets_poster_type_check;

ALTER TABLE public.presets ADD CONSTRAINT presets_poster_type_check
  CHECK (poster_type = ANY (ARRAY['map'::text, 'star-map'::text, 'photo'::text]));
