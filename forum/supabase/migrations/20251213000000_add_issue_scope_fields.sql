-- Add scope fields and normalize topics/government_level on issues

-- 1) Ensure columns exist
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS province text NULL,
  ADD COLUMN IF NOT EXISTS city text NULL;

ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS government_level text NULL;

-- 2) Normalize topic to canonical slugs
UPDATE public.issues
SET topic = CASE
  WHEN topic IS NULL THEN NULL
  WHEN lower(topic) IN ('general') THEN 'general'
  WHEN lower(topic) IN ('housing') THEN 'housing'
  WHEN lower(topic) IN ('healthcare') THEN 'healthcare'
  WHEN lower(topic) IN ('economy') THEN 'economy'
  WHEN lower(topic) IN ('environment', 'climate') THEN 'climate'
  WHEN lower(topic) IN ('education') THEN 'education'
  WHEN lower(topic) IN ('infrastructure', 'transit', 'transportation') THEN 'transit'
  WHEN lower(topic) IN ('immigration') THEN 'immigration'
  WHEN lower(topic) IN ('indigenous', 'indigenous affairs', 'indigenous-affairs') THEN 'indigenous'
  WHEN lower(topic) IN ('defense', 'defence') THEN 'defense'
  WHEN lower(topic) IN ('justice') THEN 'justice'
  WHEN lower(topic) IN ('childcare', 'child care', 'child-care') THEN 'childcare'
  WHEN lower(topic) IN ('accessibility') THEN 'accessibility'
  WHEN lower(topic) IN ('budget') THEN 'budget'
  WHEN lower(topic) IN ('other') THEN 'other'
  ELSE lower(replace(replace(topic, ' & ', ' '), ' ', '-'))
END;

-- 3) Backfill government_level (required going forward)
UPDATE public.issues
SET government_level = CASE
  WHEN government_level IN ('federal', 'provincial', 'municipal') THEN government_level
  WHEN location_lat IS NOT NULL AND location_lng IS NOT NULL THEN 'municipal'
  WHEN municipal_district IS NOT NULL THEN 'municipal'
  WHEN provincial_district IS NOT NULL THEN 'provincial'
  WHEN federal_district IS NOT NULL THEN 'federal'
  ELSE 'federal'
END
WHERE government_level IS NULL
   OR government_level NOT IN ('federal', 'provincial', 'municipal');

ALTER TABLE public.issues
  ALTER COLUMN government_level SET DEFAULT 'municipal';

ALTER TABLE public.issues
  ALTER COLUMN government_level SET NOT NULL;

-- 4) Backfill province/city from district tables when available
UPDATE public.issues i
SET province = pd.province
FROM public.provincial_districts pd
WHERE i.provincial_district = pd.name
  AND i.province IS NULL;

UPDATE public.issues i
SET city = md.city
FROM public.municipal_districts md
WHERE i.municipal_district = md.name
  AND i.city IS NULL;

-- 5) Helpful indexes for common filters
CREATE INDEX IF NOT EXISTS idx_issues_government_level_topic
  ON public.issues(government_level, topic);

CREATE INDEX IF NOT EXISTS idx_issues_government_level_province
  ON public.issues(government_level, province);

CREATE INDEX IF NOT EXISTS idx_issues_government_level_city
  ON public.issues(government_level, city);
