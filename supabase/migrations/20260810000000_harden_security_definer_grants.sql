-- =====================================================================
-- Security-Hardening: EXECUTE-Rechte auf SECURITY-DEFINER-Funktionen
-- =====================================================================
-- Supabase setzt ALTER DEFAULT PRIVILEGES auf dem public-Schema und erteilt
-- damit bei JEDEM CREATE FUNCTION automatisch EXECUTE an anon, authenticated
-- und service_role. Das sind DIREKTE Grants — ein REVOKE ... FROM PUBLIC
-- entfernt sie NICHT, jede Rolle braucht ein eigenes REVOKE.
--
-- Folge: jede SECURITY-DEFINER-Funktion im public-Schema ist per Default als
-- PostgREST-RPC unter /rest/v1/rpc/<name> aufrufbar — auch von nicht
-- eingeloggten Besuchern. Da SECURITY DEFINER die RLS umgeht, ist das nur
-- dann harmlos, wenn die Funktion ihre Parameter selbst gegen auth.uid()
-- prueft. Diese drei tun das nicht und sind auch nicht als RPC gedacht.
--
-- Gemeldet vom Supabase-Linter (0028/0029).
--
-- Die Aufrufwege bleiben intakt:
-- - handle_new_user()  haengt an einem Trigger auf auth.users. Postgres prueft
--                      beim Feuern eines Triggers KEIN EXECUTE-Recht der
--                      ausloesenden Rolle (nur bei CREATE TRIGGER).
-- - rls_auto_enable()  haengt an einem Event-Trigger (DDL) und laeuft als die
--                      DDL-ausfuehrende Rolle (postgres/supabase_admin).
-- - is_admin()         wird weder im App-Code noch in einer RLS-Policy
--                      verwendet — geprueft via pg_policies und Repo-Grep.
--
-- Idempotent: REVOKE auf ein bereits entzogenes Recht ist ein No-Op.
-- =====================================================================

-- ZWEI Quellen fuer das Recht, beide muessen weg:
--   1. PUBLIC       — Postgres-Default bei CREATE FUNCTION. anon und
--                     authenticated erben darueber.
--   2. Direkt-Grant — Supabase ALTER DEFAULT PRIVILEGES (s.o.).
-- Nur eine von beiden zu entziehen reicht NICHT; has_function_privilege()
-- meldet das Recht weiterhin, weil es den jeweils anderen Pfad findet.

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin()        FROM PUBLIC;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin()        FROM anon, authenticated;
