-- =====================================================================
-- PROJ-30: Preset-Render-Pipeline — Schema-Migration
-- =====================================================================
-- Erweitert presets + palettes, fügt mockup_sets, preset_renders,
-- render_workers hinzu. Idempotent: kann mehrfach ausgeführt werden.
--
-- Operator-Anleitung: docs/migrations/PROJ-30-render-pipeline.md
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM-Typen
-- ---------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE render_status_enum AS ENUM ('pending', 'rendering', 'done', 'failed', 'stale');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE preset_render_variant_enum AS ENUM ('desktop', 'mobile');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------
-- Erweiterung: presets — Render-State-Spalten + mockup_set_ids
-- ---------------------------------------------------------------------

ALTER TABLE presets
  ADD COLUMN IF NOT EXISTS render_status render_status_enum NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS render_error TEXT,
  ADD COLUMN IF NOT EXISTS render_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS render_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS render_worker_id TEXT,
  ADD COLUMN IF NOT EXISTS render_inputs_hash TEXT,
  ADD COLUMN IF NOT EXISTS mockup_set_ids UUID[] NOT NULL DEFAULT '{}';

-- Partial-Index: Polling-Query trifft nur pending/rendering
CREATE INDEX IF NOT EXISTS idx_presets_render_status_active
  ON presets (render_status, created_at)
  WHERE render_status IN ('pending', 'rendering');

-- GIN-Index für Containment-Queries auf mockup_set_ids
CREATE INDEX IF NOT EXISTS idx_presets_mockup_set_ids
  ON presets USING gin (mockup_set_ids);

-- ---------------------------------------------------------------------
-- Erweiterung: palettes — version-Spalte für Stale-Detection
-- ---------------------------------------------------------------------

ALTER TABLE palettes
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Trigger: Bei Änderung der "colors"-Spalte version automatisch +1.
-- (Andere Änderungen wie name/description/display_order/status bumpen nicht,
-- weil sie für den Render irrelevant sind.)
CREATE OR REPLACE FUNCTION palettes_bump_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.colors IS DISTINCT FROM OLD.colors THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS palettes_bump_version_trigger ON palettes;
CREATE TRIGGER palettes_bump_version_trigger
  BEFORE UPDATE ON palettes
  FOR EACH ROW
  EXECUTE FUNCTION palettes_bump_version();

-- ---------------------------------------------------------------------
-- Neue Tabelle: mockup_sets
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mockup_sets (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                        TEXT NOT NULL UNIQUE,
  name                        TEXT NOT NULL,
  description                 TEXT,
  desktop_template_uuid       TEXT NOT NULL,
  desktop_smart_object_uuid   TEXT NOT NULL,
  mobile_template_uuid        TEXT NOT NULL,
  mobile_smart_object_uuid    TEXT NOT NULL,
  desktop_thumbnail_url       TEXT,
  mobile_thumbnail_url        TEXT,
  is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
  version                     INTEGER NOT NULL DEFAULT 1,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mockup_sets_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_mockup_sets_is_active ON mockup_sets (is_active);

-- Auto-bump version on UUID/thumbnail changes
CREATE OR REPLACE FUNCTION mockup_sets_bump_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.desktop_template_uuid     IS DISTINCT FROM OLD.desktop_template_uuid
     OR NEW.desktop_smart_object_uuid IS DISTINCT FROM OLD.desktop_smart_object_uuid
     OR NEW.mobile_template_uuid    IS DISTINCT FROM OLD.mobile_template_uuid
     OR NEW.mobile_smart_object_uuid IS DISTINCT FROM OLD.mobile_smart_object_uuid
  THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mockup_sets_bump_version_trigger ON mockup_sets;
CREATE TRIGGER mockup_sets_bump_version_trigger
  BEFORE UPDATE ON mockup_sets
  FOR EACH ROW
  EXECUTE FUNCTION mockup_sets_bump_version();

ALTER TABLE mockup_sets ENABLE ROW LEVEL SECURITY;

-- Service-Role-Operationen (Admin-API) bypassen RLS automatisch.
-- Anonyme/authentifizierte User dürfen mockup_sets nicht direkt lesen —
-- die Daten sind admin-intern. Wenn Frontend später Thumbnails braucht,
-- liefert die API-Route sie aus.

-- ---------------------------------------------------------------------
-- Neue Tabelle: preset_renders
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS preset_renders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id       UUID NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  mockup_set_id   UUID NOT NULL REFERENCES mockup_sets(id) ON DELETE CASCADE,
  variant         preset_render_variant_enum NOT NULL,
  image_url       TEXT NOT NULL,
  image_width     INTEGER,
  image_height    INTEGER,
  inputs_hash     TEXT NOT NULL,
  rendered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT preset_renders_unique UNIQUE (preset_id, mockup_set_id, variant)
);

CREATE INDEX IF NOT EXISTS idx_preset_renders_preset_id ON preset_renders (preset_id);
CREATE INDEX IF NOT EXISTS idx_preset_renders_mockup_set_id ON preset_renders (mockup_set_id);

ALTER TABLE preset_renders ENABLE ROW LEVEL SECURITY;

-- Keine Public-Policy. Server Components nutzen createAdminClient()
-- (Service-Role-Key) und bypassen RLS. Client-Code soll preset_renders
-- nicht direkt mit anon-Key lesen — falls doch nötig, später API-Route bauen.

-- ---------------------------------------------------------------------
-- Neue Tabelle: render_workers
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS render_workers (
  id                  UUID PRIMARY KEY,
  hostname            TEXT,
  parallel_browsers   INTEGER NOT NULL DEFAULT 1,
  current_preset_id   UUID REFERENCES presets(id) ON DELETE SET NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_render_workers_heartbeat ON render_workers (last_heartbeat_at);

ALTER TABLE render_workers ENABLE ROW LEVEL SECURITY;

-- Nur Service-Role darf in render_workers schreiben/lesen — Worker und
-- Admin-API. Kein anon-Zugriff.

-- ---------------------------------------------------------------------
-- Stale-Detection-Helper: Funktion, die Presets mit einer bestimmten
-- Palette als "stale" markiert (genutzt vom Palette-Save-Hook in der
-- Application-Layer).
-- ---------------------------------------------------------------------

-- Wir bauen das in den API-Routes (TypeScript), nicht als DB-Trigger.
-- Begründung: bei Bulk-Updates (z. B. wenn Operator viele Paletten gleichzeitig
-- ändert) hat die App die volle Kontrolle und kann transactional batchen.

-- ---------------------------------------------------------------------
-- Initial-Migration: bestehende Presets (mit `done`-Status hätten Default
-- `pending` bekommen, was ungewollt wäre) — alle bestehenden Presets
-- mit befülltem `preview_image_url` auf 'stale' setzen, damit der erste
-- Worker-Lauf sie korrekt re-rendert.
-- ---------------------------------------------------------------------

UPDATE presets
SET render_status = 'stale'
WHERE render_status = 'pending'
  AND preview_image_url IS NOT NULL;

-- ---------------------------------------------------------------------
-- Fertig.
-- Storage-Buckets müssen separat im Dashboard angelegt werden:
--   - preset-renders         (public, RLS aus)
--   - preset-renders-temp    (privat)
-- Siehe docs/migrations/PROJ-30-render-pipeline.md
-- ---------------------------------------------------------------------
