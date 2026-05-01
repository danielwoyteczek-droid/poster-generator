-- PROJ-35: Customer-visible custom masks with optional decoration overlay.
-- Adds two fields to custom_masks:
--   - is_public            : per-mask flag controlling customer visibility
--   - decoration_svg_url   : optional decoration SVG drawn over the map when
--                            the mask is selected (string + cursive text etc.)
-- Default is_public=false on existing rows → no customer-visibility shift on migration.

ALTER TABLE public.custom_masks
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS decoration_svg_url text;

-- Partial index: customer-facing /api/masks query filters by is_public=true,
-- so only those rows need to be indexable. Smaller + faster than a full index.
CREATE INDEX IF NOT EXISTS idx_custom_masks_is_public
  ON public.custom_masks (is_public) WHERE is_public = true;

-- Tighten public-read RLS: only public masks are visible to non-admin clients
-- via direct DB access. Admins keep full access via the existing "Admins manage
-- custom masks" policy. (API endpoints use service-role and bypass RLS, so this
-- is a defence-in-depth layer for any code path that uses anon/authenticated keys.)
DROP POLICY IF EXISTS "Public read custom masks" ON public.custom_masks;
CREATE POLICY "Public read public custom masks" ON public.custom_masks
  FOR SELECT USING (is_public = true);

-- Public-readable bucket for decoration SVGs. Mirrors the existing 'masks' bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('decorations', 'decorations', true, 5242880)
ON CONFLICT (id) DO NOTHING;
