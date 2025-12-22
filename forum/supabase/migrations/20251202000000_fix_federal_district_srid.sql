-- Fix SRID mismatch in find_federal_district function
-- The federal_districts table has geometries with SRID 0, but the function was creating points with SRID 4326
-- Solution: Create the point without SRID to match the stored geometries

CREATE OR REPLACE FUNCTION public.find_federal_district(lat double precision, lng double precision)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT name_en
  FROM public.federal_districts
  WHERE ST_Contains(geom, ST_Point(lng, lat))
  LIMIT 1;
$function$;
