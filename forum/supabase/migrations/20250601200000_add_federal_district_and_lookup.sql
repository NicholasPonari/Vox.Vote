-- Add federal_district column to issues table
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS federal_district text NULL;

-- Create function to get all districts for a given lat/lng point
-- Uses PostGIS ST_Contains to check if point falls within district geometry
CREATE OR REPLACE FUNCTION public.get_districts_for_point(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS TABLE (
  federal_district TEXT,
  provincial_district TEXT,
  municipal_district TEXT,
  municipal_borough TEXT
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    fd.name_en AS federal_district,
    pd.name AS provincial_district,
    md.name AS municipal_district,
    md.borough AS municipal_borough
  FROM 
    (SELECT name_en, geom FROM public.federal_districts WHERE ST_Contains(geom, ST_SetSRID(ST_Point(p_lng, p_lat), 4326)) LIMIT 1) fd,
    (SELECT name FROM public.provincial_districts WHERE ST_Contains(geom, ST_SetSRID(ST_Point(p_lng, p_lat), 4326)) LIMIT 1) pd,
    (SELECT name, borough FROM public.municipal_districts WHERE ST_Contains(geom, ST_SetSRID(ST_Point(p_lng, p_lat), 4326)) LIMIT 1) md;
$$;

-- Create trigger function to auto-populate district fields on insert/update
CREATE OR REPLACE FUNCTION public.set_issue_districts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
  v_districts RECORD;
BEGIN
  -- Parse lat/lng (stored as text in issues table)
  v_lat := NEW.location_lat::DOUBLE PRECISION;
  v_lng := NEW.location_lng::DOUBLE PRECISION;
  
  -- Only proceed if we have valid coordinates
  IF v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
    -- Get districts for this point
    SELECT * INTO v_districts 
    FROM public.get_districts_for_point(v_lat, v_lng);
    
    -- Set the district fields
    NEW.federal_district := v_districts.federal_district;
    NEW.provincial_district := v_districts.provincial_district;
    NEW.municipal_district := v_districts.municipal_district;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on issues table
DROP TRIGGER IF EXISTS trigger_set_issue_districts ON public.issues;
CREATE TRIGGER trigger_set_issue_districts
  BEFORE INSERT OR UPDATE OF location_lat, location_lng
  ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_issue_districts();

-- Backfill existing issues with federal_district (and fix any missing provincial/municipal)
UPDATE public.issues i
SET 
  federal_district = d.federal_district,
  provincial_district = COALESCE(i.provincial_district, d.provincial_district),
  municipal_district = COALESCE(i.municipal_district, d.municipal_district)
FROM (
  SELECT 
    id,
    (public.get_districts_for_point(location_lat::DOUBLE PRECISION, location_lng::DOUBLE PRECISION)).*
  FROM public.issues
  WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL
) d
WHERE i.id = d.id;

-- Create index for faster district filtering
CREATE INDEX IF NOT EXISTS idx_issues_federal_district ON public.issues(federal_district);
CREATE INDEX IF NOT EXISTS idx_issues_provincial_district ON public.issues(provincial_district);
CREATE INDEX IF NOT EXISTS idx_issues_municipal_district ON public.issues(municipal_district);
