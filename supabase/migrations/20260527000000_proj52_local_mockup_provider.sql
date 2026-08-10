-- =====================================================================
-- PROJ-52: Local-Mockup-Provider — Schema-Erweiterung von mockup_sets
-- =====================================================================
-- Erweitert die mockup_sets-Tabelle aus PROJ-30 um einen zweiten Provider:
-- 'local' — Composites werden serverseitig mit sharp aus einem hochgeladenen
-- Overlay-PNG erzeugt, statt über die externe Dynamic-Mockups-API.
--
-- Existing rows: bekommen automatisch provider='dynamic_mockups', kein Backfill
-- der UUID-Felder nötig.
--
-- Konsistenz-Constraint: entweder DM-UUIDs (Desktop-Pflicht, Mobile-Pflicht
-- wenn DM) ODER mindestens ein lokales Overlay (Portrait oder Landscape).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Neue Spalten
-- ---------------------------------------------------------------------

ALTER TABLE mockup_sets
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'dynamic_mockups'
    CHECK (provider IN ('dynamic_mockups', 'local'));

ALTER TABLE mockup_sets
  ADD COLUMN IF NOT EXISTS local_portrait_overlay_url   TEXT,
  ADD COLUMN IF NOT EXISTS local_landscape_overlay_url  TEXT,
  ADD COLUMN IF NOT EXISTS local_portrait_slot          JSONB,
  ADD COLUMN IF NOT EXISTS local_landscape_slot         JSONB;

-- ---------------------------------------------------------------------
-- 2. DM-UUIDs nullable machen
-- ---------------------------------------------------------------------
-- Für provider='local' sind die DM-UUIDs bedeutungslos. Bestandsdaten haben
-- sie weiterhin gesetzt (provider='dynamic_mockups' Default), daher kein
-- Datenverlust. Die Konsistenz-Constraint unten erzwingt korrekte Belegung
-- abhängig vom Provider.

ALTER TABLE mockup_sets
  ALTER COLUMN desktop_template_uuid     DROP NOT NULL,
  ALTER COLUMN desktop_smart_object_uuid DROP NOT NULL,
  ALTER COLUMN mobile_template_uuid      DROP NOT NULL,
  ALTER COLUMN mobile_smart_object_uuid  DROP NOT NULL;

-- ---------------------------------------------------------------------
-- 3. Slot-JSON-Form validieren
-- ---------------------------------------------------------------------
-- Pflichtschlüssel im jsonb: x, y, width, height, canvasWidth, canvasHeight
-- (alle integer ≥ 0). Vermeidet, dass kaputte Payloads in DB landen.

ALTER TABLE mockup_sets
  ADD CONSTRAINT mockup_sets_local_portrait_slot_shape CHECK (
    local_portrait_slot IS NULL OR (
      jsonb_typeof(local_portrait_slot->'x')            = 'number' AND
      jsonb_typeof(local_portrait_slot->'y')            = 'number' AND
      jsonb_typeof(local_portrait_slot->'width')        = 'number' AND
      jsonb_typeof(local_portrait_slot->'height')       = 'number' AND
      jsonb_typeof(local_portrait_slot->'canvasWidth')  = 'number' AND
      jsonb_typeof(local_portrait_slot->'canvasHeight') = 'number' AND
      (local_portrait_slot->>'x')::int            >= 0 AND
      (local_portrait_slot->>'y')::int            >= 0 AND
      (local_portrait_slot->>'width')::int        >  0 AND
      (local_portrait_slot->>'height')::int       >  0 AND
      (local_portrait_slot->>'canvasWidth')::int  >  0 AND
      (local_portrait_slot->>'canvasHeight')::int >  0
    )
  );

ALTER TABLE mockup_sets
  ADD CONSTRAINT mockup_sets_local_landscape_slot_shape CHECK (
    local_landscape_slot IS NULL OR (
      jsonb_typeof(local_landscape_slot->'x')            = 'number' AND
      jsonb_typeof(local_landscape_slot->'y')            = 'number' AND
      jsonb_typeof(local_landscape_slot->'width')        = 'number' AND
      jsonb_typeof(local_landscape_slot->'height')       = 'number' AND
      jsonb_typeof(local_landscape_slot->'canvasWidth')  = 'number' AND
      jsonb_typeof(local_landscape_slot->'canvasHeight') = 'number' AND
      (local_landscape_slot->>'x')::int            >= 0 AND
      (local_landscape_slot->>'y')::int            >= 0 AND
      (local_landscape_slot->>'width')::int        >  0 AND
      (local_landscape_slot->>'height')::int       >  0 AND
      (local_landscape_slot->>'canvasWidth')::int  >  0 AND
      (local_landscape_slot->>'canvasHeight')::int >  0
    )
  );

-- ---------------------------------------------------------------------
-- 4. Konsistenz-Constraint je nach Provider
-- ---------------------------------------------------------------------
-- dynamic_mockups: alle 4 UUIDs Pflicht, keine local_*-Felder gesetzt
-- local: keine UUIDs nötig, mindestens ein Overlay+Slot-Paar gesetzt,
--        jeweils Overlay UND Slot zusammen (nicht nur eines von beiden)

ALTER TABLE mockup_sets
  ADD CONSTRAINT mockup_sets_provider_fields_consistent CHECK (
    CASE provider
      WHEN 'dynamic_mockups' THEN
        desktop_template_uuid     IS NOT NULL AND
        desktop_smart_object_uuid IS NOT NULL AND
        mobile_template_uuid      IS NOT NULL AND
        mobile_smart_object_uuid  IS NOT NULL AND
        local_portrait_overlay_url  IS NULL AND
        local_landscape_overlay_url IS NULL AND
        local_portrait_slot         IS NULL AND
        local_landscape_slot        IS NULL
      WHEN 'local' THEN
        -- mindestens eine Orientierung vollständig
        (
          (local_portrait_overlay_url  IS NOT NULL AND local_portrait_slot  IS NOT NULL) OR
          (local_landscape_overlay_url IS NOT NULL AND local_landscape_slot IS NOT NULL)
        ) AND
        -- Overlay und Slot müssen zusammen gesetzt sein (nicht nur eines)
        (local_portrait_overlay_url  IS NULL) = (local_portrait_slot  IS NULL) AND
        (local_landscape_overlay_url IS NULL) = (local_landscape_slot IS NULL)
      ELSE FALSE
    END
  );

-- ---------------------------------------------------------------------
-- 5. Version-Bump-Trigger erweitern
-- ---------------------------------------------------------------------
-- Auch Änderungen an provider oder lokalen Feldern bumpen die Version.
-- Konsumenten (preset_renders mit inputs_hash) erkennen so, dass Composites
-- veraltet sind und können stale-markiert / neu gerendert werden.

CREATE OR REPLACE FUNCTION mockup_sets_bump_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.desktop_template_uuid       IS DISTINCT FROM OLD.desktop_template_uuid
     OR NEW.desktop_smart_object_uuid IS DISTINCT FROM OLD.desktop_smart_object_uuid
     OR NEW.mobile_template_uuid      IS DISTINCT FROM OLD.mobile_template_uuid
     OR NEW.mobile_smart_object_uuid  IS DISTINCT FROM OLD.mobile_smart_object_uuid
     OR NEW.provider                  IS DISTINCT FROM OLD.provider
     OR NEW.local_portrait_overlay_url  IS DISTINCT FROM OLD.local_portrait_overlay_url
     OR NEW.local_landscape_overlay_url IS DISTINCT FROM OLD.local_landscape_overlay_url
     OR NEW.local_portrait_slot         IS DISTINCT FROM OLD.local_portrait_slot
     OR NEW.local_landscape_slot        IS DISTINCT FROM OLD.local_landscape_slot
  THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
