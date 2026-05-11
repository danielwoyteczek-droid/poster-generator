-- =====================================================================
-- PROJ-42: Programmatic City Landing Pages — Storage-Bucket
-- =====================================================================
-- Eigener Bucket fuer Stadt-Hero-Renders, getrennt vom preset-renders-
-- Bucket. Pfad-Schema: {city_id}/{style_id}.png
--
-- Public-Read damit OG-Bilder, Hreflang-Verweise und Frontend ohne
-- Signed-URL funktionieren.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('city-renders', 'city-renders', TRUE, 10485760)  -- 10 MB
ON CONFLICT (id) DO NOTHING;

-- Public read access on objects in this bucket.
DROP POLICY IF EXISTS "city_renders_public_select" ON storage.objects;
CREATE POLICY "city_renders_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'city-renders');

-- Admin write access (worker uses service-role key and bypasses RLS,
-- but the dashboard / admin user can also overwrite via admin endpoint).
DROP POLICY IF EXISTS "city_renders_storage_admin_insert" ON storage.objects;
CREATE POLICY "city_renders_storage_admin_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'city-renders'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "city_renders_storage_admin_update" ON storage.objects;
CREATE POLICY "city_renders_storage_admin_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'city-renders'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "city_renders_storage_admin_delete" ON storage.objects;
CREATE POLICY "city_renders_storage_admin_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'city-renders'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
