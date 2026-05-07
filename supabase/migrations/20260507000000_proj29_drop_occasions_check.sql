-- PROJ-29 Iteration 2: occasion list moves out of code into Sanity.
--
-- The CHECK-constraint `presets_occasions_valid` hardcoded the eight
-- legacy codes. Dropping it lets the operator add new occasions in
-- Sanity Studio without a code-deploy + migration.
--
-- Validation now happens in the application layer:
--   - Sanity Studio dropdown = de-facto allowed list (only codes that
--     exist as `occasion`-Docs are pickable in the UI)
--   - Admin API endpoints (POST/PATCH presets) sanity-check input
--     against the current Sanity list
--
-- Trade-off: bad input via direct DB writes is no longer blocked at
-- the schema level. We accept that — the only path that writes is the
-- application, which has its own validation.

ALTER TABLE presets DROP CONSTRAINT IF EXISTS presets_occasions_valid;
