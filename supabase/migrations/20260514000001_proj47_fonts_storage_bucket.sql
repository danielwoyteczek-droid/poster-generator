-- =====================================================================
-- PROJ-47: Admin-Font-Verwaltung — Storage-Bucket fuer Font-Dateien
-- =====================================================================
-- Eigener Bucket 'fonts' fuer hochgeladene .woff2/.ttf/.otf Dateien.
-- Pfad-Schema: fonts/{font-slug}/{weight}-{style}.{ext}
--
-- Public-Read damit @font-face / FontFace-API im Customer-Browser ohne
-- Signed-URL ladbar ist. Schreibzugriff nur fuer Admins.
--
-- File-Size-Limit 2 MB (siehe Spec) — Web-Best-Practice fuer Web-Fonts.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fonts',
  'fonts',
  TRUE,
  2097152,  -- 2 MB
  ARRAY[
    'font/woff2',
    'font/ttf',
    'font/otf',
    'application/font-sfnt',
    'application/x-font-ttf',
    'application/x-font-otf',
    'application/octet-stream'  -- Fallback: Browser melden TTF/OTF teils so
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public-Read auf Objekte im fonts-Bucket.
DROP POLICY IF EXISTS "fonts_storage_public_select" ON storage.objects;
CREATE POLICY "fonts_storage_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'fonts');

-- Admin-Write: Service-Role-Calls umgehen RLS, aber die Policies sind die
-- zweite Verteidigungslinie fuer den Fall, dass jemand mit anon-Key versucht
-- direkt in Storage zu schreiben.
DROP POLICY IF EXISTS "fonts_storage_admin_insert" ON storage.objects;
CREATE POLICY "fonts_storage_admin_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fonts'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "fonts_storage_admin_update" ON storage.objects;
CREATE POLICY "fonts_storage_admin_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'fonts'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "fonts_storage_admin_delete" ON storage.objects;
CREATE POLICY "fonts_storage_admin_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fonts'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
