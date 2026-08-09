-- =====================================================================
-- Order-Attribution: UTM-Parameter + gclid pro Order persistieren
-- =====================================================================
-- Erweitert die orders-Tabelle um Felder, die das Frontend aus dem
-- Cookie `__ps_attribution` mitschickt (gefuellt beim ersten Pageview
-- mit utm_*/gclid). Voraussetzung fuer ROAS pro Sitelink und den
-- spaeteren Offline Conversion Import in Google Ads (gclid-basiert).
--
-- Alle Spalten sind nullable — Direct-Traffic-Orders haben keine
-- Attribution. attribution_at wird gesetzt, wenn das Cookie beim
-- Checkout gelesen werden konnte (first_seen_at aus dem Cookie).
--
-- Idempotent via IF NOT EXISTS.
-- =====================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS utm_source     text,
  ADD COLUMN IF NOT EXISTS utm_medium     text,
  ADD COLUMN IF NOT EXISTS utm_campaign   text,
  ADD COLUMN IF NOT EXISTS utm_content    text,
  ADD COLUMN IF NOT EXISTS utm_term       text,
  ADD COLUMN IF NOT EXISTS gclid          text,
  ADD COLUMN IF NOT EXISTS landing_page   text,
  ADD COLUMN IF NOT EXISTS referrer       text,
  ADD COLUMN IF NOT EXISTS attribution_at timestamptz;

-- Index auf gclid: wird vom spaeteren Offline-Conversion-Import gegen
-- die Google Ads API verwendet, um nur Orders mit gclid abzufragen.
CREATE INDEX IF NOT EXISTS orders_gclid_idx
  ON orders (gclid)
  WHERE gclid IS NOT NULL;

-- Index auf utm_source + created_at: typische ROAS-Query lautet
-- "Revenue je Kampagne in den letzten 7 Tagen" — der zusammengesetzte
-- Index deckt das Filter+Sort-Muster ab.
CREATE INDEX IF NOT EXISTS orders_attribution_source_created_idx
  ON orders (utm_source, created_at DESC)
  WHERE utm_source IS NOT NULL;

COMMENT ON COLUMN orders.utm_source IS
  'Attribution: utm_source aus __ps_attribution-Cookie. NULL = direct/keine Attribution.';
COMMENT ON COLUMN orders.utm_content IS
  'Attribution: utm_content — Sitelink-Granularitaet fuer ROAS-Analyse pro Anzeigenvariante.';
COMMENT ON COLUMN orders.gclid IS
  'Attribution: Google Click ID. Pflichtfeld fuer Offline Conversion Import (Cross-Device-Attribution in Google Ads).';
COMMENT ON COLUMN orders.attribution_at IS
  'Attribution: first_seen_at aus dem Cookie — Zeitpunkt des erstmaligen Touchpoints, nicht des Checkouts.';
