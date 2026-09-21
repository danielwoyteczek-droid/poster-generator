-- =====================================================================
-- PROJ-55: Eigener Bucket fuer die fertigen Druckdateien
-- =====================================================================
-- Die Druck-PDFs wurden bisher in 'dtf-uploads' abgelegt. Dieser Bucket
-- laesst aber nur 'image/png' und 'image/jpeg' zu (Migration
-- 20260810100000), und Storage prueft den MIME-Typ auch fuer die
-- Service-Role. Jeder Upload einer Druckdatei schlug damit fehl, die
-- Bestellung blieb auf 'failed' stehen, und der Wiederholen-Knopf im
-- Admin lief gegen dieselbe Wand.
--
-- Der MIME-Typ von 'dtf-uploads' liesse sich erweitern. Ein eigener
-- Bucket ist trotzdem richtiger, weil die beiden Dateiarten sich in
-- allem unterscheiden, was an einem Bucket haengt:
--
--   dtf-uploads      Kundenmaterial, PNG/JPEG, 50 MB Grenze,
--                    wird nach 30 Tagen aufgeraeumt, wenn unbestellt
--   dtf-print-files  Unser Erzeugnis, PDF, keine Groessengrenze
--                    (ein Bogen bettet mehrere Originale ein),
--                    gehoert zu einer bezahlten Bestellung und bleibt
--
-- Ein gemeinsamer Bucket haette den Aufraeum-Lauf gezwungen, zwischen
-- beiden zu unterscheiden -- genau die Art Sonderfall, die irgendwann
-- jemand uebersieht und die dann bezahlte Druckdateien loescht.
--
-- Groessengrenze bewusst NULL, wie bei 'exports' und 'order-exports':
-- dieselbe Gattung Datei, dieselbe Behandlung.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dtf-print-files',
  'dtf-print-files',
  FALSE,
  NULL,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = FALSE,
      file_size_limit = NULL,
      allowed_mime_types = ARRAY['application/pdf'];

-- KEINE Policies auf storage.objects fuer diesen Bucket -- dasselbe Muster
-- wie bei 'dtf-uploads': ohne Policy kommt weder anon noch authenticated
-- direkt heran. Der Admin laedt ueber eine signierte URL, die die Route
-- mit der Service-Role erzeugt. Kunden sehen die Druckdatei nie.
