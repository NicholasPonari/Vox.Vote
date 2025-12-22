ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS federal_district_id bigint NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_federal_district_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_federal_district_id_fkey
        FOREIGN KEY (federal_district_id)
        REFERENCES public.federal_districts (id)
        ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_federal_district_id
  ON public.profiles(federal_district_id);

CREATE OR REPLACE FUNCTION public.set_profile_district_refs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
  v_coord JSONB;
  v_coord_text TEXT;
BEGIN
  NEW.federal_district_id := NULL;
  NEW.municipal_district_id := NULL;
  NEW.provincial_district_id := NULL;

  IF NEW.coord IS NULL THEN
    RETURN NEW;
  END IF;

  v_coord := NULL;

  IF json_typeof(NEW.coord) = 'object' THEN
    v_coord := NEW.coord::jsonb;
  ELSIF json_typeof(NEW.coord) = 'string' THEN
    v_coord_text := replace(trim(both '"' from NEW.coord::text), '\\"', '"');
    BEGIN
      v_coord := v_coord_text::jsonb;
    EXCEPTION WHEN others THEN
      v_coord := NULL;
    END;
  END IF;

  IF v_coord IS NULL THEN
    RETURN NEW;
  END IF;

  v_lat := NULLIF(v_coord->>'lat', '')::DOUBLE PRECISION;
  v_lng := NULLIF(v_coord->>'lng', '')::DOUBLE PRECISION;

  IF v_lat IS NULL OR v_lng IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT fd.id
  INTO NEW.federal_district_id
  FROM public.federal_districts fd
  WHERE ST_Contains(fd.geom, ST_Point(v_lng, v_lat))
  LIMIT 1;

  SELECT md.id
  INTO NEW.municipal_district_id
  FROM public.municipal_districts md
  WHERE ST_Contains(md.geom, ST_SetSRID(ST_Point(v_lng, v_lat), 4326))
  LIMIT 1;

  SELECT pd.id
  INTO NEW.provincial_district_id
  FROM public.provincial_districts pd
  WHERE ST_Contains(pd.geom, ST_SetSRID(ST_Point(v_lng, v_lat), 4326))
  LIMIT 1;

  RETURN NEW;
END;
$$;

UPDATE public.profiles
SET coord = coord
WHERE coord IS NOT NULL
  AND federal_district_id IS NULL;
