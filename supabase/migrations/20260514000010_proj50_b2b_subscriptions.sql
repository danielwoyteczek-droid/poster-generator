-- =====================================================================
-- PROJ-50: B2B Credits-Abo (Subscription mit Usage-Based Overage)
-- =====================================================================
-- Fuehrt das B2B-Datenmodell ein: 4-Tier Subscriptions (Free + Starter/Pro/
-- Business), Credit-Ledger pro Export-Verbrauch, Paid-Projects fuer Gratis-
-- Re-Downloads, Free-Tier-Counter (kein Stripe-Object), Stripe-Event-Log
-- fuer Webhook-Idempotenz.
--
-- Architektur: Stripe ist Source-of-Truth fuer Subscriptions; b2b_subscriptions
-- ist denormalisierte Spiegelung fuer schnelle Credit-Checks (<100 ms).
-- Free-Tier ist KEIN Stripe-Object — free_tier_usage lebt eigenstaendig.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enum: b2b_tier
-- ---------------------------------------------------------------------
-- Wir nutzen kein Postgres-ENUM (Migrations-Albtraum bei Wert-Erweiterung),
-- sondern CHECK-Constraints + TEXT. Trial-Tiers heissen 'trial_starter',
-- 'trial_pro', 'trial_business' — Trial gibt vollen Funktionsumfang des
-- entsprechenden Paid-Tiers (Watermark weg, Commercial License an).

-- ---------------------------------------------------------------------
-- Tabelle: b2b_subscriptions
-- ---------------------------------------------------------------------
-- Eine Zeile pro User mit AKTIVEM (oder paused/canceled-but-still-running)
-- Stripe-Subscription. Free-Tier hat keine Zeile hier — Free = "kein Eintrag".
--
-- Bei Kuendigung bleibt die Zeile bis Periodenende bestehen (User nutzt
-- Credits weiter); danach loescht der Webhook-Handler sie (User faellt auf
-- Free zurueck).

CREATE TABLE IF NOT EXISTS b2b_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe-Referenzen (Source-of-Truth fuer Billing-State).
  stripe_customer_id    TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_price_id       TEXT NOT NULL,

  -- Tier-State.
  tier                  TEXT NOT NULL,
  status                TEXT NOT NULL,

  -- Period-Tracking (Rolling 30d ab Abo-Start/Renewal).
  current_period_start  TIMESTAMPTZ NOT NULL,
  current_period_end    TIMESTAMPTZ NOT NULL,
  trial_end             TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Credit-State (denormalisiert fuer schnelle Checks).
  credits_remaining     INTEGER NOT NULL DEFAULT 0,
  rollover_credits      INTEGER NOT NULL DEFAULT 0,
  rollover_expires_at   TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT b2b_subs_tier_valid CHECK (
    tier IN ('starter', 'pro', 'business', 'trial_starter', 'trial_pro', 'trial_business')
  ),
  CONSTRAINT b2b_subs_status_valid CHECK (
    status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused')
  ),
  CONSTRAINT b2b_subs_credits_nonneg CHECK (credits_remaining >= 0),
  CONSTRAINT b2b_subs_rollover_nonneg CHECK (rollover_credits >= 0)
);

-- Ein User kann nur EIN aktives B2B-Abo haben. Wir nutzen unique-partial
-- damit nach Kuendigung + neuem Abschluss kein Konflikt entsteht.
CREATE UNIQUE INDEX IF NOT EXISTS idx_b2b_subs_user_active
  ON b2b_subscriptions (user_id)
  WHERE status NOT IN ('canceled');

CREATE INDEX IF NOT EXISTS idx_b2b_subs_stripe_customer
  ON b2b_subscriptions (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_b2b_subs_period_end
  ON b2b_subscriptions (current_period_end)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION b2b_subs_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS b2b_subs_set_updated_at_trigger ON b2b_subscriptions;
CREATE TRIGGER b2b_subs_set_updated_at_trigger
  BEFORE UPDATE ON b2b_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION b2b_subs_set_updated_at();

-- ---------------------------------------------------------------------
-- Tabelle: free_tier_usage
-- ---------------------------------------------------------------------
-- Free-Tier-Counter pro User. Kein Stripe-Object — wir tracken nur, wieviel
-- in der aktuellen Rolling-30d-Period verbraucht wurde. Reset passiert
-- lazy: beim naechsten Check schaut der Service, ob period_start > 30 Tage
-- her ist, und setzt zurueck.
--
-- Wird AUTOMATISCH beim ersten Free-Export angelegt (von der Authorize-API).

CREATE TABLE IF NOT EXISTS free_tier_usage (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credits_used      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT free_tier_credits_nonneg CHECK (credits_used >= 0)
);

DROP TRIGGER IF EXISTS free_tier_set_updated_at_trigger ON free_tier_usage;
CREATE TRIGGER free_tier_set_updated_at_trigger
  BEFORE UPDATE ON free_tier_usage
  FOR EACH ROW
  EXECUTE FUNCTION b2b_subs_set_updated_at();

-- ---------------------------------------------------------------------
-- Tabelle: b2b_paid_projects
-- ---------------------------------------------------------------------
-- "Bereits bezahlt"-Marker pro (User, Projekt). Sobald ein Eintrag hier
-- existiert, sind weitere Exporte desselben Projekts CREDIT-FREI (Re-Download-
-- Garantie aus der Spec). Watermark-Flag entscheidet, ob das Projekt initial
-- als Free-Export (watermarked=TRUE) oder Paid-Export (watermarked=FALSE)
-- bezahlt wurde — relevant fuer den Watermark-Layer beim Re-Export nach
-- Upgrade.

CREATE TABLE IF NOT EXISTS b2b_paid_projects (
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  first_paid_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  watermarked       BOOLEAN NOT NULL DEFAULT FALSE,
  paid_tier_at_time TEXT NOT NULL,

  PRIMARY KEY (user_id, project_id),

  CONSTRAINT paid_proj_tier_valid CHECK (
    paid_tier_at_time IN ('free', 'starter', 'pro', 'business', 'trial_starter', 'trial_pro', 'trial_business')
  )
);

CREATE INDEX IF NOT EXISTS idx_paid_projects_user
  ON b2b_paid_projects (user_id);

-- ---------------------------------------------------------------------
-- Tabelle: b2b_credit_ledger
-- ---------------------------------------------------------------------
-- Audit-Log JEDES Credit-Verbrauchs. Wird auch fuer Free-Tier-Verbrauch
-- geschrieben (credit_source='free'), damit wir spaeter Disputes/Analyses
-- haben. Bei Overage-Eintraegen ist stripe_invoice_item_id gesetzt, sobald
-- Stripe das Usage-Record bestaetigt hat.

CREATE TABLE IF NOT EXISTS b2b_credit_ledger (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  format                  TEXT NOT NULL,
  credit_source           TEXT NOT NULL,
  tier_at_time            TEXT NOT NULL,
  stripe_invoice_item_id  TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ledger_format_valid CHECK (format IN ('png', 'pdf')),
  CONSTRAINT ledger_source_valid CHECK (
    credit_source IN ('free', 'regular', 'rollover', 'overage', 'trial', 're_export')
  ),
  CONSTRAINT ledger_tier_valid CHECK (
    tier_at_time IN ('free', 'starter', 'pro', 'business', 'trial_starter', 'trial_pro', 'trial_business')
  )
);

CREATE INDEX IF NOT EXISTS idx_ledger_user_time
  ON b2b_credit_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_project
  ON b2b_credit_ledger (project_id);

-- ---------------------------------------------------------------------
-- Tabelle: stripe_event_log
-- ---------------------------------------------------------------------
-- Webhook-Idempotenz. Jedes Stripe-Event wird hier vermerkt (PRIMARY KEY =
-- Stripe-Event-ID), bevor der Handler die Geschaeftslogik ausfuehrt. Beim
-- Replay (Stripe re-sends bei Timeout) lehnt der Handler die zweite
-- Verarbeitung ab.

CREATE TABLE IF NOT EXISTS stripe_event_log (
  event_id        TEXT PRIMARY KEY,
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload         JSONB
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type_time
  ON stripe_event_log (event_type, processed_at DESC);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
-- Pattern: User darf seine EIGENEN Subscription-/Usage-/Ledger-Daten lesen,
-- aber NICHT schreiben. Schreiben passiert ausschliesslich serverseitig
-- via createAdminClient() (Service-Role bypassed RLS) aus den Webhook- und
-- Authorize-Endpoints — niemals direkt vom Client.
--
-- Diese Trennung schuetzt vor manipulierten Client-Calls "credits_remaining=999".

-- ---------- b2b_subscriptions ----------
ALTER TABLE b2b_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "b2b_subs_owner_read" ON b2b_subscriptions;
CREATE POLICY "b2b_subs_owner_read" ON b2b_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- KEIN INSERT/UPDATE/DELETE-Policy fuer authenticated. Schreiben nur via
-- Service-Role (Webhook).

-- ---------- free_tier_usage ----------
ALTER TABLE free_tier_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "free_tier_owner_read" ON free_tier_usage;
CREATE POLICY "free_tier_owner_read" ON free_tier_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------- b2b_paid_projects ----------
ALTER TABLE b2b_paid_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paid_proj_owner_read" ON b2b_paid_projects;
CREATE POLICY "paid_proj_owner_read" ON b2b_paid_projects
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------- b2b_credit_ledger ----------
ALTER TABLE b2b_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_owner_read" ON b2b_credit_ledger;
CREATE POLICY "ledger_owner_read" ON b2b_credit_ledger
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------- stripe_event_log ----------
ALTER TABLE stripe_event_log ENABLE ROW LEVEL SECURITY;

-- KEIN public read — Event-Log ist interner Audit-Trail, nur fuer Operator
-- via Service-Role einsehbar. Admin-Endpunkt kann spaeter eine View darauf
-- bereitstellen.

-- ---------- Admin-Read auf alles ----------
-- Operator (profiles.role='admin') darf alle Tabellen lesen fuer Support
-- und Dispute-Investigation.

DROP POLICY IF EXISTS "b2b_subs_admin_read" ON b2b_subscriptions;
CREATE POLICY "b2b_subs_admin_read" ON b2b_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "free_tier_admin_read" ON free_tier_usage;
CREATE POLICY "free_tier_admin_read" ON free_tier_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "paid_proj_admin_read" ON b2b_paid_projects;
CREATE POLICY "paid_proj_admin_read" ON b2b_paid_projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "ledger_admin_read" ON b2b_credit_ledger;
CREATE POLICY "ledger_admin_read" ON b2b_credit_ledger
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================================
-- ATOMIC AUTHORIZE-EXPORT FUNCTION
-- =====================================================================
-- Kritischer Hot-Path: pruefe Eligibility + buche Credit ab in EINER
-- Transaktion mit Row-Lock. Verhindert Race-Conditions bei parallelen
-- Exports desselben Users.
--
-- Liefert TABLE statt RECORD damit der Client typisierte Felder bekommt.
-- Aufruf: SELECT * FROM authorize_export(...)

CREATE OR REPLACE FUNCTION authorize_export(
  p_user_id     UUID,
  p_project_id  UUID,
  p_format      TEXT
)
RETURNS TABLE (
  ok              BOOLEAN,
  watermark       BOOLEAN,
  is_re_export    BOOLEAN,
  credit_source   TEXT,
  tier_at_time    TEXT,
  reason          TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub            b2b_subscriptions%ROWTYPE;
  v_free           free_tier_usage%ROWTYPE;
  v_paid_project   b2b_paid_projects%ROWTYPE;
  v_free_limit     INTEGER := 3;  -- Free-Tier Credit-Limit pro 30d-Period
  v_now            TIMESTAMPTZ := NOW();
  v_period_age     INTERVAL;
BEGIN
  IF p_format NOT IN ('png', 'pdf') THEN
    RETURN QUERY SELECT FALSE, FALSE, FALSE, NULL::TEXT, NULL::TEXT, 'invalid_format'::TEXT;
    RETURN;
  END IF;

  -- 1. Re-Export-Check: Projekt bereits bezahlt?
  SELECT * INTO v_paid_project
  FROM b2b_paid_projects
  WHERE user_id = p_user_id AND project_id = p_project_id;

  IF FOUND THEN
    -- Re-Export. Kein Credit-Abzug. Watermark wird nur aufgesetzt, wenn das
    -- Projekt urspruenglich watermarked war UND der User immer noch Free ist.
    SELECT * INTO v_sub
    FROM b2b_subscriptions
    WHERE user_id = p_user_id AND status IN ('trialing', 'active', 'past_due');

    -- Watermark-Logik bei Re-Export:
    -- - urspruenglich watermarked + User immer noch Free  -> watermark TRUE (kein Upgrade)
    -- - urspruenglich watermarked + User jetzt paid       -> watermark FALSE (Upgrade-Reward)
    -- - urspruenglich nicht-watermarked                   -> watermark FALSE (sowieso clean)
    RETURN QUERY SELECT
      TRUE,
      (v_paid_project.watermarked AND v_sub.user_id IS NULL),
      TRUE,
      're_export'::TEXT,
      COALESCE(v_sub.tier, 'free'),
      NULL::TEXT;
    RETURN;
  END IF;

  -- 2. Active Subscription? Row-Lock fuer atomare Credit-Abbuchung.
  SELECT * INTO v_sub
  FROM b2b_subscriptions
  WHERE user_id = p_user_id AND status IN ('trialing', 'active')
  FOR UPDATE;

  IF FOUND THEN
    -- Bei past_due/paused haetten wir vorher rausgesprungen via status-Filter.
    -- Trial gibt Watermark-frei + Commercial License (gleicher Funktionsumfang
    -- wie zahlender Tier).

    -- 2a. Rollover-Bucket zuerst verbrauchen (FIFO).
    IF v_sub.rollover_credits > 0
       AND v_sub.rollover_expires_at IS NOT NULL
       AND v_sub.rollover_expires_at > v_now
    THEN
      UPDATE b2b_subscriptions
        SET rollover_credits = rollover_credits - 1
        WHERE id = v_sub.id;

      INSERT INTO b2b_paid_projects (user_id, project_id, watermarked, paid_tier_at_time)
        VALUES (p_user_id, p_project_id, FALSE, v_sub.tier);

      INSERT INTO b2b_credit_ledger (user_id, project_id, format, credit_source, tier_at_time)
        VALUES (p_user_id, p_project_id, p_format, 'rollover', v_sub.tier);

      RETURN QUERY SELECT TRUE, FALSE, FALSE, 'rollover'::TEXT, v_sub.tier, NULL::TEXT;
      RETURN;
    END IF;

    -- 2b. Regular Credits.
    IF v_sub.credits_remaining > 0 THEN
      UPDATE b2b_subscriptions
        SET credits_remaining = credits_remaining - 1
        WHERE id = v_sub.id;

      INSERT INTO b2b_paid_projects (user_id, project_id, watermarked, paid_tier_at_time)
        VALUES (p_user_id, p_project_id, FALSE, v_sub.tier);

      INSERT INTO b2b_credit_ledger (user_id, project_id, format, credit_source, tier_at_time)
        VALUES (
          p_user_id,
          p_project_id,
          p_format,
          CASE WHEN v_sub.tier LIKE 'trial_%' THEN 'trial' ELSE 'regular' END,
          v_sub.tier
        );

      RETURN QUERY SELECT
        TRUE,
        FALSE,
        FALSE,
        CASE WHEN v_sub.tier LIKE 'trial_%' THEN 'trial'::TEXT ELSE 'regular'::TEXT END,
        v_sub.tier,
        NULL::TEXT;
      RETURN;
    END IF;

    -- 2c. Credits leer + Overage moeglich (nur fuer paid tiers, nicht trial).
    IF v_sub.tier NOT LIKE 'trial_%' THEN
      -- Overage: kein lokaler Credit-Abzug, Stripe-Usage-Record wird von der
      -- API-Schicht via stripe.billing.meterEvents.create gemeldet. Wir
      -- protokollieren den Ledger-Eintrag OHNE stripe_invoice_item_id; die
      -- ID wird beim Webhook-Event 'invoice.created' nachgeliefert.
      INSERT INTO b2b_paid_projects (user_id, project_id, watermarked, paid_tier_at_time)
        VALUES (p_user_id, p_project_id, FALSE, v_sub.tier);

      INSERT INTO b2b_credit_ledger (user_id, project_id, format, credit_source, tier_at_time)
        VALUES (p_user_id, p_project_id, p_format, 'overage', v_sub.tier);

      RETURN QUERY SELECT TRUE, FALSE, FALSE, 'overage'::TEXT, v_sub.tier, NULL::TEXT;
      RETURN;
    END IF;

    -- 2d. Trial mit 0 Credits = hart blockieren.
    RETURN QUERY SELECT FALSE, FALSE, FALSE, NULL::TEXT, v_sub.tier, 'trial_exhausted'::TEXT;
    RETURN;
  END IF;

  -- 3. Free-Tier-Pfad. Auto-create + Period-Reset.
  SELECT * INTO v_free
  FROM free_tier_usage
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO free_tier_usage (user_id, period_start, credits_used)
      VALUES (p_user_id, v_now, 0)
      RETURNING * INTO v_free;
  END IF;

  -- Period-Reset: Rolling 30 Tage.
  v_period_age := v_now - v_free.period_start;
  IF v_period_age > INTERVAL '30 days' THEN
    UPDATE free_tier_usage
      SET period_start = v_now, credits_used = 0
      WHERE user_id = p_user_id
      RETURNING * INTO v_free;
  END IF;

  IF v_free.credits_used >= v_free_limit THEN
    RETURN QUERY SELECT FALSE, FALSE, FALSE, NULL::TEXT, 'free'::TEXT, 'free_exhausted'::TEXT;
    RETURN;
  END IF;

  -- Free-Export ausfuehren.
  UPDATE free_tier_usage
    SET credits_used = credits_used + 1
    WHERE user_id = p_user_id;

  INSERT INTO b2b_paid_projects (user_id, project_id, watermarked, paid_tier_at_time)
    VALUES (p_user_id, p_project_id, TRUE, 'free');

  INSERT INTO b2b_credit_ledger (user_id, project_id, format, credit_source, tier_at_time)
    VALUES (p_user_id, p_project_id, p_format, 'free', 'free');

  RETURN QUERY SELECT TRUE, TRUE, FALSE, 'free'::TEXT, 'free'::TEXT, NULL::TEXT;
  RETURN;
END;
$$;

-- Function-Permission: nur authenticated darf aufrufen. Service-Role bypassed
-- ohnehin alles.
REVOKE ALL ON FUNCTION authorize_export(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION authorize_export(UUID, UUID, TEXT) TO authenticated, service_role;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE b2b_subscriptions IS
  'PROJ-50 B2B-Subscription-State, denormalisierte Spiegelung von Stripe. '
  'Schreiben ausschliesslich via Webhook (Service-Role). Free-Tier hat KEINE '
  'Zeile hier.';

COMMENT ON TABLE free_tier_usage IS
  'PROJ-50 Free-Tier-Counter (3 Credits / 30 Tage rolling). Kein Stripe-'
  'Object; auto-creation beim ersten Free-Export via authorize_export().';

COMMENT ON TABLE b2b_paid_projects IS
  'PROJ-50 "Bereits bezahlt"-Marker pro (User, Projekt). Existiert ein '
  'Eintrag, sind alle Folge-Exporte gratis (Re-Download-Garantie).';

COMMENT ON TABLE b2b_credit_ledger IS
  'PROJ-50 Audit-Log aller Credit-Verbraeuche (auch Free + Re-Export). '
  'Append-only via Service-Role; User darf lesen.';

COMMENT ON TABLE stripe_event_log IS
  'PROJ-50 Webhook-Idempotenz. PK = Stripe-Event-ID, verhindert Duplikat-'
  'Verarbeitung bei Stripe-Retries.';

COMMENT ON FUNCTION authorize_export(UUID, UUID, TEXT) IS
  'PROJ-50 Atomic Credit-Check + Burn. Liefert ok/watermark/credit_source. '
  'Row-Lock auf b2b_subscriptions verhindert parallele Doppelabbuchung.';
