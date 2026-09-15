-- =====================================================================
-- PROJ-31: Warnungen des Eingangs und der Auswertung trennen
-- =====================================================================
-- Bisher landeten beide in ingest_warnings, und die Auswertung haengte ihre
-- Hinweise an die bestehenden an. Nach einer erfolgreichen Neuauswertung
-- blieb damit stehen, was vorher gefehlt hatte -- die Zeile widersprach sich
-- selbst ("noch keinem Preset zugeordnet" an einer zugeordneten Bestellung).
-- In der Arbeitsliste haette das genau das Falsche angezeigt.
--
-- Der Eingang schreibt weiter ingest_warnings: fehlende Assets, ein
-- abgeleitetes customization_item, eine abweichende Laengenangabe. Das sind
-- Tatsachen ueber die Lieferung, sie aendern sich nicht mehr.
--
-- Die Auswertung schreibt resolve_warnings und ersetzt sie bei jedem Lauf
-- vollstaendig, weil sie den AKTUELLEN Zustand beschreiben.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

ALTER TABLE amazon_custom_orders
  ADD COLUMN IF NOT EXISTS resolve_warnings TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN amazon_custom_orders.resolve_warnings IS
  'PROJ-31: Hinweise der letzten Auswertung. Wird bei jeder Neuauswertung '
  'ersetzt, nicht ergaenzt -- sie beschreiben den aktuellen Zustand.';
COMMENT ON COLUMN amazon_custom_orders.ingest_warnings IS
  'PROJ-31: Hinweise des Eingangs (fehlende Assets, abgeleitetes '
  'customization_item). Unabhaengig von der Auswertung.';

-- Bestand bereinigen: die bisher vermischten Hinweise stammen alle aus der
-- Auswertung, weil bis hierher kein Eingang gewarnt hat.
UPDATE amazon_custom_orders
SET resolve_warnings = ingest_warnings,
    ingest_warnings = '{}'
WHERE cardinality(ingest_warnings) > 0;
