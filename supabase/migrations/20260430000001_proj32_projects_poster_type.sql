-- PROJ-32: Projekte können jetzt für jeden Editor-Typ gespeichert werden.
--
-- Vorher: `projects.config_json` enthielt nur Map-Editor-State; Star-Map und
-- Photo-Customer konnten zwar den Save-Button klicken, aber beim Re-Open
-- landeten sie wieder im Map-Editor mit Default-Map statt ihrer Konfiguration.
--
-- Nachher: zusätzliche `poster_type`-Spalte (Default 'map' für Bestandsdaten)
-- + Index für die Per-User-Listen-Query (`SELECT … WHERE user_id = … ORDER BY
-- updated_at`), die beim Anzeigen der „Meine Poster"-Seite oft genug
-- gefiltert wird.

ALTER TABLE public.projects
  ADD COLUMN poster_type text NOT NULL DEFAULT 'map'
  CONSTRAINT projects_poster_type_check
    CHECK (poster_type = ANY (ARRAY['map'::text, 'star-map'::text, 'photo'::text]));

CREATE INDEX IF NOT EXISTS projects_poster_type_idx ON public.projects (poster_type);
