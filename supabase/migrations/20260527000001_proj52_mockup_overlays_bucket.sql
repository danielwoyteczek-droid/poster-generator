-- =====================================================================
-- PROJ-52: Storage-Bucket fuer lokale Mockup-Overlays
-- =====================================================================
-- Bucket 'mockup-overlays' fuer transparente PNG-Overlays mit Rahmen +
-- Schatten. Pfad-Schema: mockup-overlays/{mockup-set-slug}/{orientation}.png
--
-- Public-Read damit der Render-Worker das Overlay ohne Signed-URL laden
-- kann. Schreibzugriff nur fuer Admins.
--
-- File-Size-Limit 5 MB (siehe Spec) — bei 1500x1500 typischerweise <2 MB,
-- 5 MB ist großzügiger Puffer fuer hochauflösendere Mockups.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mockup-overlays',
  'mockup-overlays',
  TRUE,
  5242880,  -- 5 MB
  ARRAY['image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public-Read auf Objekte im mockup-overlays-Bucket.
DROP POLICY IF EXISTS "mockup_overlays_public_select" ON storage.objects;
CREATE POLICY "mockup_overlays_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'mockup-overlays');

-- Admin-Write: Service-Role-Calls umgehen RLS, aber die Policies sind die
-- zweite Verteidigungslinie fuer den Fall, dass jemand mit anon-Key versucht
-- direkt in Storage zu schreiben.
DROP POLICY IF EXISTS "mockup_overlays_admin_insert" ON storage.objects;
CREATE POLICY "mockup_overlays_admin_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mockup-overlays'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "mockup_overlays_admin_update" ON storage.objects;
CREATE POLICY "mockup_overlays_admin_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'mockup-overlays'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "mockup_overlays_admin_delete" ON storage.objects;
CREATE POLICY "mockup_overlays_admin_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'mockup-overlays'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
