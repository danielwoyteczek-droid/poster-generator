# PROJ-30 Migration: Preset-Render-Pipeline

Diese Migration ergänzt die Datenbank um Render-State-Spalten, neue Tabellen für Mockup-Sets, Render-Ergebnisse und Worker-Heartbeats, und legt die nötigen Storage-Buckets an.

## Ablauf

### 1. SQL-Migration ausführen

**Variante A: Supabase Dashboard (schnell, ohne CLI)**

1. Supabase Dashboard öffnen → Projekt auswählen → "SQL Editor" → "New query"
2. Inhalt von [`supabase/migrations/20260427000000_proj30_render_pipeline.sql`](../../supabase/migrations/20260427000000_proj30_render_pipeline.sql) komplett reinpasten
3. "Run" klicken — die Migration ist idempotent, bei wiederholtem Ausführen passiert nichts Falsches.

**Variante B: Supabase CLI (empfohlen für Long-Term)**

```bash
# Einmalig:
npm i -g supabase
supabase link --project-ref <dein-project-ref>

# Migration ausführen:
supabase db push
```

### 2. Storage-Buckets anlegen

**Im Supabase Dashboard → Storage → New Bucket:**

#### Bucket 1: `preset-renders`
- Name: `preset-renders`
- Public bucket: **Ja** (Häkchen aktiv)
- File size limit: 10 MB
- Allowed MIME types: `image/png, image/jpeg`
- Verwendung: fertige Mockup-Composites (vom Worker hochgeladen)

#### Bucket 2: `preset-renders-temp`
- Name: `preset-renders-temp`
- Public bucket: **Nein** (privat)
- File size limit: 10 MB
- Allowed MIME types: `image/png`
- Verwendung: temporäre nackte Poster-PNGs während des Renders

### 3. Env-Variablen ergänzen

In `.env.local` (lokal) und auf der Hosting-Plattform ergänzen:

```env
# Dynamic Mockups (PSD-Smart-Object-Replacement)
DYNAMIC_MOCKUPS_API_KEY=<dein-api-key>
DYNAMIC_MOCKUPS_API_URL=https://app.dynamicmockups.com/api/v1

# Render-Pipeline (Headless-Editor-Modus)
RENDER_HEADLESS_TOKEN=<random-secret-min-32-chars>
APP_BASE_URL=http://localhost:3000

# Worker (optional, default 1)
RENDER_PARALLEL_BROWSERS=1
RENDER_BROWSER_TIMEOUT_MS=60000
RENDER_POLL_INTERVAL_MS=5000
```

`RENDER_HEADLESS_TOKEN` muss zwischen App und Worker übereinstimmen — am einfachsten mit `openssl rand -hex 32` erzeugen.

### 4. Verifikation

In der Supabase-Tabellen-Ansicht prüfen, dass folgende Tabellen existieren:
- ✅ `presets` mit neuen Spalten (`render_status`, `mockup_set_ids`, etc.)
- ✅ `palettes` mit neuer Spalte `version`
- ✅ `mockup_sets` (neu)
- ✅ `preset_renders` (neu)
- ✅ `render_workers` (neu)

Test-Query (im SQL Editor):
```sql
-- Sollte ohne Fehler durchlaufen und 0 Rows liefern (noch keine Render-Daten)
SELECT count(*) FROM preset_renders;
SELECT count(*) FROM mockup_sets;
SELECT count(*) FROM render_workers;

-- Sollte einen Wert zurückgeben
SELECT render_status, count(*) FROM presets GROUP BY render_status;
```

## Was die Migration NICHT macht

- **Mockup-Sets erstellen**: Operator legt sie nach der Migration im Admin-UI an (sobald Phase 5 deployed ist) oder per direktem INSERT für Smoke-Tests.
- **Worker-Setup**: kommt in Phase 4 (`scripts/render-worker.ts`).
- **Existing Presets neu rendern**: bestehende Presets mit `preview_image_url` werden auf `stale` gesetzt — Operator muss aktiv "Bulk-Re-Render" auslösen, sobald die Pipeline läuft.

## Rollback

Falls etwas schiefgeht:

```sql
-- Tabellen entfernen (Cascade löscht Renders mit)
DROP TABLE IF EXISTS preset_renders CASCADE;
DROP TABLE IF EXISTS render_workers CASCADE;
DROP TABLE IF EXISTS mockup_sets CASCADE;

-- Trigger + Funktionen entfernen
DROP TRIGGER IF EXISTS palettes_bump_version_trigger ON palettes;
DROP FUNCTION IF EXISTS palettes_bump_version();
DROP TRIGGER IF EXISTS mockup_sets_bump_version_trigger ON mockup_sets;
DROP FUNCTION IF EXISTS mockup_sets_bump_version();

-- Spalten an presets entfernen
ALTER TABLE presets
  DROP COLUMN IF EXISTS render_status,
  DROP COLUMN IF EXISTS render_error,
  DROP COLUMN IF EXISTS render_started_at,
  DROP COLUMN IF EXISTS render_completed_at,
  DROP COLUMN IF EXISTS render_worker_id,
  DROP COLUMN IF EXISTS render_inputs_hash,
  DROP COLUMN IF EXISTS mockup_set_ids;

-- Spalte an palettes entfernen
ALTER TABLE palettes DROP COLUMN IF EXISTS version;

-- Enums entfernen
DROP TYPE IF EXISTS preset_render_variant_enum;
DROP TYPE IF EXISTS render_status_enum;

-- Storage-Buckets müssen manuell im Dashboard gelöscht werden.
```
