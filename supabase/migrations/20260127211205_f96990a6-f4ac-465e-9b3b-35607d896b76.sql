-- Add RPC helpers to increment ad counters safely (avoids direct UPDATE blocked by RLS and race conditions)

CREATE OR REPLACE FUNCTION public.increment_ad_views(ad_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.advertisements
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = ad_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_ad_clicks(ad_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.advertisements
  SET clicks_count = COALESCE(clicks_count, 0) + 1
  WHERE id = ad_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_ad_views(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ad_clicks(uuid) TO anon, authenticated;