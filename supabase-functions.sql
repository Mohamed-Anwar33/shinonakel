-- دالة SQL لزيادة views_count بدون الحاجة لقراءة القيمة أولاً
CREATE OR REPLACE FUNCTION increment_ad_views(ad_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE advertisements 
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = ad_uuid;
END;
$$;

-- دالة مماثلة للـ clicks
CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE advertisements 
  SET clicks_count = COALESCE(clicks_count, 0) + 1
  WHERE id = ad_uuid;
END;
$$;
