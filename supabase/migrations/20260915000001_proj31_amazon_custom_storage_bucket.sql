-- =====================================================================
-- PROJ-31: Storage-Bucket fuer die Amazon-Custom-Assets
-- =====================================================================
-- Der Abholer schickt je Position bis zu drei Dateien base64-kodiert mit:
--   preview_jpg — Amazons gerendertes Vorschaubild (Vergleichsbild)
--   svg         — die Vektorgrafik des Schriftzugs, 3200x3200
--   xml         — dieselben Daten wie das JSON, reines Backup
--
-- Pfad-Schema: <amazon_order_id>/<order_item_id>/<dateiname>
-- Deterministisch, damit ein erneuter Ingest ueberschreibt statt zu
-- duplizieren. Die Dateinamen werden vom Ingest bereinigt.
--
-- PRIVAT, anders als die Preset-Buckets. Zwei Gruende:
--   1. Das Vorschaubild zeigt die Kaeufereingaben — Namen und die Adresse,
--      die er auf der Karte haben will. Personenbezogene Daten gehoeren
--      nicht in einen oeffentlich lesbaren Bucket.
--   2. Ein oeffentlich ausgeliefertes SVG ist ein XSS-Vektor. Privat plus
--      Signed-URL nimmt das Thema von vornherein raus.
--
-- Auf Vercel wird nichts gespeichert — die Funktion ist zustandslos und ihr
-- Dateisystem fluechtig. Deshalb liegen die Dateien hier und in der
-- Tabellenzeile steht nur der Pfad.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'amazon-custom',
  'amazon-custom',
  FALSE,
  5242880,  -- 5 MB; real sind es ~40 KB Bild, ~3 KB SVG, ~8 KB XML
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'application/xml',
    'text/xml',
    'application/octet-stream'  -- Rueckfall, wenn der Typ nicht erkannt wird
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Kein public-select. Lesen duerfen Admins; der Ingest liest und schreibt
-- mit der Service-Role und umgeht RLS ohnehin.

DROP POLICY IF EXISTS "amazon_custom_storage_admin_select" ON storage.objects;
CREATE POLICY "amazon_custom_storage_admin_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'amazon-custom'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "amazon_custom_storage_admin_insert" ON storage.objects;
CREATE POLICY "amazon_custom_storage_admin_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'amazon-custom'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "amazon_custom_storage_admin_update" ON storage.objects;
CREATE POLICY "amazon_custom_storage_admin_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'amazon-custom'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "amazon_custom_storage_admin_delete" ON storage.objects;
CREATE POLICY "amazon_custom_storage_admin_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'amazon-custom'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
