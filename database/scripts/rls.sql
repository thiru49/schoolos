-- Applied from seed as well. Tenant isolation via app.school_id.

CREATE OR REPLACE FUNCTION get_school_by_slug(p_slug text)
RETURNS SETOF schools
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM schools WHERE slug = p_slug;
$$;

REVOKE ALL ON FUNCTION get_school_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_school_by_slug(text) TO schoolos;
GRANT EXECUTE ON FUNCTION get_school_by_slug(text) TO PUBLIC;
