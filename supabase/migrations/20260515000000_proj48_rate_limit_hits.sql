-- =====================================================================
-- PROJ-48 — QA Bug #3: verteiltes Rate-Limiting via Supabase
-- =====================================================================
-- Ersetzt den In-Memory-Limiter (pro Vercel-Instance, umgehbar) durch
-- einen DB-gestützten Sliding-Window-Counter. Alle Vercel-Instances
-- teilen sich denselben Zähler — keine neue externe Abhängigkeit, nutzt
-- die bestehende Supabase.
--
-- `rate_limit_hits`     — eine Zeile pro registriertem Request-Hit
-- `check_rate_limit()`  — atomarer Cleanup + Count + Conditional-Insert
--
-- RLS: Tabelle ist service-role-only (kein anon/authenticated-Zugriff).
-- Bewusst keine Policies — der Voucher-API-Route nutzt den Admin-Client,
-- der RLS umgeht. Gleiches Pattern wie PROJ-49 (etsy-Tabellen).
--
-- Idempotent: mehrfach ausführbar.
-- =====================================================================

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Windowed-Count-Lookup pro Bucket.
CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_bucket_created
  ON rate_limit_hits (bucket_key, created_at);
-- Cleanup-Scan über alle abgelaufenen Zeilen.
CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_created
  ON rate_limit_hits (created_at);

ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- check_rate_limit: atomar — Cleanup, Count, Conditional-Insert.
-- ---------------------------------------------------------------------
-- SECURITY INVOKER (kein DEFINER): nur der Service-Role-Client ruft die
-- Funktion auf, der ohnehin volle Rechte hat. EXECUTE wird explizit von
-- anon/authenticated entzogen, damit sie nicht über /rest/v1/rpc
-- aufrufbar ist.
--
-- Liefert genau eine Zeile: allowed / hit_count / retry_after_seconds.
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (allowed boolean, hit_count integer, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - make_interval(secs => p_window_seconds);
  v_count integer;
  v_oldest timestamptz;
BEGIN
  -- Opportunistisches globales Cleanup — hält die Tabelle klein, kein Cron nötig.
  DELETE FROM rate_limit_hits WHERE created_at < v_cutoff;

  SELECT count(*)::integer, min(created_at)
    INTO v_count, v_oldest
    FROM rate_limit_hits
   WHERE bucket_key = p_bucket_key AND created_at >= v_cutoff;

  IF v_count >= p_limit THEN
    RETURN QUERY SELECT
      false,
      v_count,
      GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (v_oldest + make_interval(secs => p_window_seconds) - now())))
      )::integer;
  ELSE
    INSERT INTO rate_limit_hits (bucket_key) VALUES (p_bucket_key);
    RETURN QUERY SELECT true, v_count + 1, 0;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION check_rate_limit(text, integer, integer) FROM anon, authenticated;

COMMENT ON TABLE rate_limit_hits IS
  'PROJ-48: distributed rate-limit hit log. Service-role-only. check_rate_limit() prunes expired rows on every call.';
