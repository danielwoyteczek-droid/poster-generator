-- =====================================================================
-- PROJ-55 Phase 1: Upload-Fundament fuer den DTF-Print-Editor
-- =====================================================================
-- Kundendateien in DRUCKQUALITAET. Der bestehende Foto-Upload
-- (src/lib/photo-upload.ts) komprimiert auf 2400 px / 2 MB und wirft das
-- Original weg — fuer Poster-Fotos richtig, fuer Druckdaten fatal: ein
-- bogenfuellendes Motiv auf 40x50 cm braucht bei 300 dpi rund 5900 px.
--
-- Deshalb ein eigener Bucket und ein eigenes Datenmodell:
--   original_path  — die Datei unveraendert, volle Aufloesung
--   preview_path   — verkleinerte Fassung, mit der der Editor arbeitet
--
-- SICHERHEITSMODELL (bewusst strenger als bei user-photos):
-- Der Bucket ist PRIVAT und hat KEINE anon-Policy. Gaeste koennen also
-- nicht direkt in Storage lesen oder schreiben. Aller Zugriff laeuft ueber
-- Server-Routen mit Service-Role, die signierte Upload- und Download-URLs
-- pro Objekt ausstellen. Die Gast-Identitaet steckt in einem httpOnly-
-- Cookie, das der Server setzt — nicht in einer clientseitig frei
-- waehlbaren ID.
--
-- Zum Vergleich: user-photos erlaubt jedem anon-Besucher SELECT/UPDATE/
-- DELETE auf ALLE Gast-Uploads, weil die Policy nur prueft, dass der
-- Ordner 'anon' heisst. Dieses Muster wird hier NICHT uebernommen; die
-- Alt-Policies werden in der Folgemigration entschaerft.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Bucket: dtf-uploads
-- ---------------------------------------------------------------------
-- Privat. 50 MB Limit — ein vollflaechiges 40x50-PNG mit Transparenz bei
-- 300 dpi hat rund 28 Megapixel und liegt je nach Motiv bei 30-60 MB.
-- Ein niedrigeres Limit wuerde genau die Dateien aussperren, die fuer gute
-- Druckqualitaet noetig sind.
--
-- allowed_mime_types deckt Original UND Vorschau ab. Die Vorschau wird
-- clientseitig als JPEG erzeugt, das Original bleibt PNG oder JPEG.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dtf-uploads',
  'dtf-uploads',
  FALSE,
  52428800,  -- 50 MB
  ARRAY['image/png', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- KEINE Policies auf storage.objects fuer diesen Bucket.
-- Ohne Policy kommt weder anon noch authenticated direkt heran; nur
-- Service-Role (umgeht RLS) und signierte URLs funktionieren. Das ist die
-- Absicht, kein Versehen.

-- ---------------------------------------------------------------------
-- Tabelle: dtf_uploads
-- ---------------------------------------------------------------------
-- Eine Zeile pro hochgeladener Kundendatei. Besitzer ist ENTWEDER ein
-- Konto (user_id) ODER eine Gast-Sitzung (guest_session_id) — nie beides
-- und nie keines von beidem, siehe CHECK.

CREATE TABLE IF NOT EXISTS dtf_uploads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Besitz. Genau eines von beiden ist gesetzt.
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_session_id  UUID,

  -- Storage-Pfade im Bucket 'dtf-uploads'.
  -- preview_path ist NULL, solange der Client den Upload nicht
  -- abgeschlossen hat (status='pending').
  original_path     TEXT NOT NULL,
  preview_path      TEXT,

  -- Metadaten der ORIGINALdatei. Die Pixelmasse sind die Grundlage der
  -- dpi-Warnung im Editor und werden beim Abschliessen gesetzt.
  mime_type         TEXT NOT NULL,
  byte_size         BIGINT,
  width_px          INTEGER,
  height_px         INTEGER,
  original_filename TEXT,

  -- 'pending'  — Zeile angelegt, signierte URL ausgestellt, Upload laeuft
  -- 'ready'    — Original und Vorschau liegen, Masse bekannt
  -- 'failed'   — Client hat abgebrochen oder gemeldet, dass es schiefging
  status            TEXT NOT NULL DEFAULT 'pending',

  -- Aufraeum-Schutz: sobald die Datei Teil einer bezahlten Bestellung ist,
  -- bleibt sie dauerhaft erhalten (Nachdruck, Reklamation).
  is_ordered        BOOLEAN NOT NULL DEFAULT FALSE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dtf_uploads_owner_exactly_one CHECK (
    (user_id IS NOT NULL AND guest_session_id IS NULL)
    OR (user_id IS NULL AND guest_session_id IS NOT NULL)
  ),
  CONSTRAINT dtf_uploads_status_valid CHECK (
    status IN ('pending', 'ready', 'failed')
  ),
  CONSTRAINT dtf_uploads_mime_valid CHECK (
    mime_type IN ('image/png', 'image/jpeg')
  ),
  CONSTRAINT dtf_uploads_size_positive CHECK (
    byte_size IS NULL OR byte_size > 0
  ),
  CONSTRAINT dtf_uploads_dims_positive CHECK (
    (width_px IS NULL OR width_px > 0) AND (height_px IS NULL OR height_px > 0)
  )
);

-- Auflisten der eigenen Motiv-Ablage: haeufigste Abfrage im Editor.
CREATE INDEX IF NOT EXISTS idx_dtf_uploads_user
  ON dtf_uploads (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dtf_uploads_guest
  ON dtf_uploads (guest_session_id, created_at DESC)
  WHERE guest_session_id IS NOT NULL;

-- Aufraeum-Lauf: findet alte, nicht bestellte Uploads.
CREATE INDEX IF NOT EXISTS idx_dtf_uploads_cleanup
  ON dtf_uploads (created_at)
  WHERE is_ordered = FALSE;

CREATE OR REPLACE FUNCTION dtf_uploads_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS dtf_uploads_set_updated_at_trigger ON dtf_uploads;
CREATE TRIGGER dtf_uploads_set_updated_at_trigger
  BEFORE UPDATE ON dtf_uploads
  FOR EACH ROW
  EXECUTE FUNCTION dtf_uploads_set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
-- Angemeldete Nutzer duerfen ihre eigenen Zeilen LESEN. Schreiben laeuft
-- ausschliesslich ueber die Server-Routen mit Service-Role, damit
-- niemand is_ordered oder fremde Besitzverhaeltnisse setzen kann.
--
-- Fuer Gaeste gibt es KEINE Policy: guest_session_id steht in einem
-- httpOnly-Cookie, das der Client nicht auslesen kann — eine
-- clientseitige Abfrage koennte den Wert also gar nicht mitgeben. Gaeste
-- bekommen ihre Ablage ueber die Server-Route.

ALTER TABLE dtf_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dtf_uploads_owner_read" ON dtf_uploads;
CREATE POLICY "dtf_uploads_owner_read" ON dtf_uploads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "dtf_uploads_admin_read" ON dtf_uploads;
CREATE POLICY "dtf_uploads_admin_read" ON dtf_uploads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------
-- Aufraeumen
-- ---------------------------------------------------------------------
-- Liefert die Storage-Pfade der Uploads, die geloescht werden duerfen:
-- aelter als p_days, nicht Teil einer bezahlten Bestellung. Die Zeilen
-- werden hier bereits entfernt; die Storage-Objekte loescht der Aufrufer
-- anhand der zurueckgegebenen Pfade.
--
-- Bewusst als Funktion statt als Cron-Job in der DB: das Loeschen in
-- Storage geht nur ueber die API, nicht aus SQL heraus. Der Aufrufer ist
-- eine Server-Route mit Service-Role.
--
-- Verwaiste 'pending'-Zeilen (Client hat nie abgeschlossen) raeumt
-- derselbe Lauf mit auf, dafuer reicht ein deutlich kuerzeres Fenster.

CREATE OR REPLACE FUNCTION dtf_uploads_collect_expired(
  p_days          INTEGER DEFAULT 30,
  p_pending_hours INTEGER DEFAULT 24,
  p_limit         INTEGER DEFAULT 500
)
RETURNS TABLE (
  id            UUID,
  original_path TEXT,
  preview_path  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  RETURN QUERY
  WITH doomed AS (
    SELECT u.id
    FROM dtf_uploads u
    WHERE u.is_ordered = FALSE
      AND (
        u.created_at < NOW() - (p_days || ' days')::INTERVAL
        OR (u.status = 'pending'
            AND u.created_at < NOW() - (p_pending_hours || ' hours')::INTERVAL)
      )
    ORDER BY u.created_at
    LIMIT p_limit
  )
  DELETE FROM dtf_uploads d
  USING doomed
  WHERE d.id = doomed.id
  RETURNING d.id, d.original_path, d.preview_path;
END;
$fn$;

-- Nur Service-Role. Siehe 20260810000000_harden_security_definer_grants:
-- Supabase erteilt via ALTER DEFAULT PRIVILEGES automatisch EXECUTE an
-- anon und authenticated, zusaetzlich zum Postgres-Default an PUBLIC.
-- Beide Quellen muessen entzogen werden.
REVOKE ALL ON FUNCTION dtf_uploads_collect_expired(INTEGER, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION dtf_uploads_collect_expired(INTEGER, INTEGER, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION dtf_uploads_collect_expired(INTEGER, INTEGER, INTEGER) TO service_role;

COMMENT ON TABLE dtf_uploads IS
  'PROJ-55: Kundendateien fuer DTF-Transferbogen. original_path haelt die '
  'unveraenderte Datei in Druckaufloesung, preview_path eine verkleinerte '
  'Fassung fuer den Editor. Bucket dtf-uploads ist privat ohne anon-Policy; '
  'Zugriff nur ueber signierte URLs aus Server-Routen.';

COMMENT ON COLUMN dtf_uploads.guest_session_id IS
  'Gast-Identitaet aus einem httpOnly-Cookie, das der Server setzt. Bewusst '
  'nicht clientseitig waehlbar, sonst koennte ein Gast fremde Uploads '
  'anfordern.';

COMMENT ON COLUMN dtf_uploads.is_ordered IS
  'TRUE sobald die Datei Teil einer bezahlten Bestellung ist. Schuetzt vor '
  'dem 30-Tage-Aufraeumen (Nachdruck, Reklamation).';

COMMENT ON FUNCTION dtf_uploads_collect_expired(INTEGER, INTEGER, INTEGER) IS
  'PROJ-55: Entfernt abgelaufene, nicht bestellte Upload-Zeilen und liefert '
  'ihre Storage-Pfade zurueck, damit der Aufrufer die Objekte loescht.';
