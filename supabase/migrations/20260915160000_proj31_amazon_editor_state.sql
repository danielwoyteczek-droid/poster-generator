-- =====================================================================
-- PROJ-31: Der im Editor angepasste Zustand einer Bestellung
-- =====================================================================
-- Die automatische Auswertung trifft die Angaben des Kaeufers, aber nicht
-- immer die Gestaltung: ein langer Name braucht eine kleinere Schrift, ein
-- Ortsname sitzt an der falschen Stelle, der Kartenausschnitt passt nicht.
-- Dafuer laesst sich die Bestellung im echten Editor oeffnen, anpassen und
-- zurueckschreiben.
--
-- editor_state hat dieselbe Form wie projects.config_json -- derselbe
-- Serialisierer im Editor erzeugt beides. Damit kann der spaetere Render
-- ohne Sonderweg damit arbeiten.
--
-- NULL bedeutet: noch nie von Hand angefasst. Der Render baut den Zustand
-- dann aus Preset + erkannten Feldern. Sobald hier etwas steht, hat es
-- Vorrang -- eine Handkorrektur darf eine Neuauswertung ueberleben.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

ALTER TABLE amazon_custom_orders
  ADD COLUMN IF NOT EXISTS editor_state          JSONB,
  ADD COLUMN IF NOT EXISTS editor_state_saved_at TIMESTAMPTZ;

COMMENT ON COLUMN amazon_custom_orders.editor_state IS
  'PROJ-31: Im Editor angepasster Zustand, gleiche Form wie '
  'projects.config_json. NULL = nie angefasst, dann baut der Render aus '
  'Preset + parse_result. Gesetzt hat Vorrang und ueberlebt eine '
  'Neuauswertung.';
COMMENT ON COLUMN amazon_custom_orders.editor_state_saved_at IS
  'PROJ-31: Wann zuletzt aus dem Editor uebernommen.';
