-- =====================================================================
-- PROJ-31: Ergebnis der Auswertung an der Bestellposition
-- =====================================================================
-- Nach dem Eingang wird eine Position aufgeloest: SKU -> Preset, dann die
-- Anpassungsfelder gegen das Feld-Schema. Was dabei herauskommt, steht hier.
--
-- Die Aufloesung ist wiederholbar. Traegt der Betreiber eine fehlende
-- SKU-Zuordnung nach oder korrigiert er ein Schema, laufen die betroffenen
-- Positionen erneut durch -- ohne dass der Abholer etwas neu schicken muss.
--
-- `design_preset` (TEXT) faellt weg und wird durch `preset_id` ersetzt.
-- Der Tabellenvorschlag aus der Uebergabe hatte den Preset-Namen als Text
-- vorgesehen; eine echte Referenz haelt die Zuordnung stabil, wenn ein
-- Preset umbenannt wird. Die Spalte war nie befuellt.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

ALTER TABLE amazon_custom_orders
  -- Aus der SKU-Zuordnung aufgeloest. NULL = noch keine Zuordnung gepflegt.
  ADD COLUMN IF NOT EXISTS preset_id     UUID REFERENCES presets(id) ON DELETE SET NULL,
  -- Das vollstaendige Ergebnis des Feld-Abgleichs: erkannte Werte, fehlende
  -- Pflichtfelder, Musterverstoesse, nicht zugeordnete Felder. Dieselbe Form,
  -- die auch der Etsy-Pfad liefert.
  ADD COLUMN IF NOT EXISTS parse_result  JSONB,
  -- Schrift und Farbe je Textblock, mit den Schema-Keys der Texte darin.
  -- Damit weiss der Render, welche Schrift zum Titel und welche zu den
  -- Namen gehoert -- flach nebeneinander waere das nicht entscheidbar.
  ADD COLUMN IF NOT EXISTS design_hints  JSONB,
  -- Aus dem Ortsfeld aufgeloeste Kartenmitte.
  ADD COLUMN IF NOT EXISTS map_lat       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS map_lng       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS map_place     TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at   TIMESTAMPTZ;

ALTER TABLE amazon_custom_orders
  DROP COLUMN IF EXISTS design_preset;

COMMENT ON COLUMN amazon_custom_orders.preset_id IS
  'PROJ-31: Aus amazon_sku_mappings aufgeloest. NULL = keine Zuordnung, '
  'Position steht auf queue_status ''preset_fehlt''.';
COMMENT ON COLUMN amazon_custom_orders.parse_result IS
  'PROJ-31: Ergebnis des Feld-Abgleichs, gleiche Form wie beim Etsy-Pfad. '
  'ok=false bedeutet fehlende Pflichtfelder oder Musterverstoesse.';
COMMENT ON COLUMN amazon_custom_orders.design_hints IS
  'PROJ-31: Schrift und Farbe je Textblock, inklusive der Schema-Keys der '
  'Texte, die in dem Block stehen.';
COMMENT ON COLUMN amazon_custom_orders.map_place IS
  'PROJ-31: Was die Ortssuche zurueckgegeben hat. Zur Sichtpruefung, ob der '
  'getippte Ort richtig verstanden wurde.';

-- Offene Zuordnungen schnell finden, wenn eine SKU nachgetragen wird.
CREATE INDEX IF NOT EXISTS idx_amazon_custom_orders_sku_offen
  ON amazon_custom_orders (sku)
  WHERE preset_id IS NULL;
