-- =====================================================================
-- PROJ-47 follow-up: lock down search_path on the trigger function.
-- Addresses the function_search_path_mutable advisor warning (best
-- practice: SECURITY DEFINER / trigger functions should pin search_path
-- so a manipulated session search_path cannot redirect lookups).
-- =====================================================================

CREATE OR REPLACE FUNCTION fonts_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
