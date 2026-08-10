-- =====================================================================
-- PROJ-54: Listing-Image-Sets — Etsy-Bild-Vorlagen pro Produkttyp
-- =====================================================================
-- Ein Listing-Image-Set ist eine wiederverwendbare „Bild-Rezept"-Vorlage
-- für ein Etsy-Listing: definiert N Slots (Hero, Personalisierungs-Pfeil,
-- Premium-Detail, Größenvergleich, Lifestyle, …), jeder Slot kombiniert
-- ein bestehendes mockup_set mit einem optionalen Annotation-PNG.
--
-- Anwendung pro Preset → ergibt einen geordneten Stapel von N Composite-
-- Bildern, die als Etsy-Listing-Galerie hochgeladen werden können. Wird
-- ausschließlich von PROJ-53 (Mass-Listing-Generator) konsumiert; der
-- normale Marketing-Render-Pfad ist davon unberührt.
--
-- Brand-Identity-Argument: EIN Set pro Produkttyp (Stadtkarte / Star-Map /
-- Foto-Poster) sichert konsistenten Look über alle Presets desselben Typs.
--
-- Storage (vom Generator zu schreiben):
--   `preset-renders`-Bucket → `listing-images/<preset_id>/<listing_set_slug>/<item_label>.png`
-- =====================================================================

CREATE TABLE listing_image_sets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT NOT NULL UNIQUE
                       CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name               TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  description        TEXT,
  -- Produkttyp-Binding (analog zu presets.poster_type). Ein Set kann für
  -- 'map', 'star-map' oder 'photo' bestimmt sein. NULL = universell.
  poster_type        TEXT CHECK (poster_type IN ('map', 'star-map', 'photo')),
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE listing_image_sets IS
  'PROJ-54: Wiederverwendbare Etsy-Listing-Bild-Vorlagen. Definiert was für Bilder ein Etsy-Listing eines bestimmten Produkttyps enthält. Wird nur von der PROJ-53 Mass-Listing-Pipeline angewendet.';

CREATE INDEX idx_listing_image_sets_poster_type
  ON listing_image_sets(poster_type) WHERE is_active;

-- ---------------------------------------------------------------------
-- Items: jeder Slot eines Listing-Sets
-- ---------------------------------------------------------------------
CREATE TABLE listing_image_set_items (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_image_set_id        UUID NOT NULL
                                REFERENCES listing_image_sets(id) ON DELETE CASCADE,
  mockup_set_id               UUID NOT NULL
                                REFERENCES mockup_sets(id) ON DELETE RESTRICT,
  -- Optionaler Annotation-Layer pro Item — oberste Compositing-Ebene über
  -- (Poster + Mockup-Overlay). Transparentes PNG in Mockup-Canvas-Maßen.
  annotation_portrait_url     TEXT,
  annotation_landscape_url    TEXT,
  -- Maschinell verwendbares Label für die Output-Datei
  -- (z. B. "01-hero", "02-personalisierung", "03-premium").
  label                       TEXT NOT NULL
                                CHECK (label ~ '^[a-z0-9][a-z0-9-]*$' AND length(label) <= 60),
  -- Menschenlesbares Anzeige-Label im Admin (z. B. "Hero-Shot ohne Pfeile").
  display_name                TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 200),
  display_order               INT NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Innerhalb eines Sets sind Labels eindeutig (Output-Dateinamen-Kollision vermeiden).
  UNIQUE (listing_image_set_id, label)
);

COMMENT ON TABLE listing_image_set_items IS
  'PROJ-54: Slots eines Listing-Image-Sets. Jeder Slot = ein Composite (Mockup-Set × optionale Annotation), wird beim Mass-Listing-Render pro Preset einmal erzeugt.';

CREATE INDEX idx_listing_image_set_items_set
  ON listing_image_set_items(listing_image_set_id, display_order);

-- ---------------------------------------------------------------------
-- RLS — Admin-only (analog mockup_sets, presets)
-- ---------------------------------------------------------------------
ALTER TABLE listing_image_sets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_image_set_items    ENABLE ROW LEVEL SECURITY;

-- Service-Role (createAdminClient) umgeht RLS ohnehin; explizit kein
-- Customer-Access — Listing-Sets sind reine Admin-Konfiguration.
CREATE POLICY "listing_image_sets_admin_read"
  ON listing_image_sets FOR SELECT USING (false);
CREATE POLICY "listing_image_set_items_admin_read"
  ON listing_image_set_items FOR SELECT USING (false);
