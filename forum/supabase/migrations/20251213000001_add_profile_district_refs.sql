-- Persist profile district refs derived from profiles.coord

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS municipal_district_id bigint NULL,
  ADD COLUMN IF NOT EXISTS provincial_district_id bigint NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_municipal_district_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_municipal_district_id_fkey
        FOREIGN KEY (municipal_district_id)
        REFERENCES public.municipal_districts (id)
        ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_provincial_district_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_provincial_district_id_fkey
        FOREIGN KEY (provincial_district_id)
        REFERENCES public.provincial_districts (id)
        ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_municipal_district_id
  ON public.profiles(municipal_district_id);

CREATE INDEX IF NOT EXISTS idx_profiles_provincial_district_id
  ON public.profiles(provincial_district_id);

-- Ensure geometry indexes exist for efficient point-in-polygon lookups
CREATE INDEX IF NOT EXISTS municipal_districts_geom_idx
  ON public.municipal_districts USING GIST (geom);

CREATE INDEX IF NOT EXISTS provincial_districts_geom_idx
  ON public.provincial_districts USING GIST (geom);

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

DROP TRIGGER IF EXISTS trigger_set_profile_district_refs ON public.profiles;
CREATE TRIGGER trigger_set_profile_district_refs
  BEFORE INSERT OR UPDATE OF coord
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_district_refs();

-- Backfill existing profiles
UPDATE public.profiles p
SET
  municipal_district_id = (
    SELECT md.id
    FROM public.municipal_districts md
    WHERE ST_Contains(
      md.geom,
      ST_SetSRID(
        ST_Point(
          NULLIF((p.coord::jsonb->>'lng'), '')::DOUBLE PRECISION,
          NULLIF((p.coord::jsonb->>'lat'), '')::DOUBLE PRECISION
        ),
        4326
      )
    )
    LIMIT 1
  ),
  provincial_district_id = (
    SELECT pd.id
    FROM public.provincial_districts pd
    WHERE ST_Contains(
      pd.geom,
      ST_SetSRID(
        ST_Point(
          NULLIF((p.coord::jsonb->>'lng'), '')::DOUBLE PRECISION,
          NULLIF((p.coord::jsonb->>'lat'), '')::DOUBLE PRECISION
        ),
        4326
      )
    )
    LIMIT 1
  )
WHERE p.coord IS NOT NULL
  AND (p.coord::jsonb->>'lat') IS NOT NULL
  AND (p.coord::jsonb->>'lng') IS NOT NULL;