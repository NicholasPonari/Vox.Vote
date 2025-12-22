-- Create RPC functions to get district with GeoJSON geometry at a point
-- These are used by the MapDrawer to display district boundaries

-- Federal district at point (returns district with GeoJSON geometry)
CREATE OR REPLACE FUNCTION public.get_federal_district_at_point(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS TABLE (
  id BIGINT,
  name_en TEXT,
  name_fr TEXT,
  geom TEXT,
  geometry JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    fd.id,
    fd.name_en,
    fd.name_fr,
    fd.geom::text,
    ST_AsGeoJSON(fd.geom)::jsonb as geometry
  FROM public.federal_districts fd
  WHERE ST_Contains(fd.geom, ST_Point(p_lng, p_lat))
  LIMIT 1;
$$;

-- Provincial district at point (returns district with GeoJSON geometry)
-- Uses SRID 4326 to match provincial_districts table
CREATE OR REPLACE FUNCTION public.get_provincial_district_at_point(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  province TEXT,
  geom TEXT,
  geometry JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    pd.id,
    pd.name,
    pd.province,
    pd.geom::text,
    ST_AsGeoJSON(pd.geom)::jsonb as geometry
  FROM public.provincial_districts pd
  WHERE ST_Contains(pd.geom, ST_SetSRID(ST_Point(p_lng, p_lat), 4326))
  LIMIT 1;
$$;

-- Municipal district at point (returns district with GeoJSON geometry)
-- Uses SRID 4326 to match municipal_districts table
CREATE OR REPLACE FUNCTION public.get_municipal_district_at_point(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  borough TEXT,
  geom TEXT,
  geometry JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    md.id,
    md.name,
    md.borough,
    md.geom::text,
    ST_AsGeoJSON(md.geom)::jsonb as geometry
  FROM public.municipal_districts md
  WHERE ST_Contains(md.geom, ST_SetSRID(ST_Point(p_lng, p_lat), 4326))
  LIMIT 1;
$$;
