-- Migration to fix ad placement mismatches

-- 1. Fix "pinned_ad" -> "pinned_ad_all"
UPDATE advertisements
SET placement = 'pinned_ad_all'
WHERE placement = 'pinned_ad';

-- 2. Fix specific known incorrect patterns (e.g. 'italian', 'pinned_ad_italian')
-- Italian
UPDATE advertisements SET placement = 'pinned_ad_cuisine_italian' WHERE placement = 'italian' OR placement = 'pinned_ad_italian';
-- Kuwaiti
UPDATE advertisements SET placement = 'pinned_ad_cuisine_kuwaiti' WHERE placement = 'kuwaiti' OR placement = 'pinned_ad_kuwaiti';
-- American
UPDATE advertisements SET placement = 'pinned_ad_cuisine_american' WHERE placement = 'american' OR placement = 'pinned_ad_american';
-- Japanese
UPDATE advertisements SET placement = 'pinned_ad_cuisine_japanese' WHERE placement = 'japanese' OR placement = 'pinned_ad_japanese';
-- Indian
UPDATE advertisements SET placement = 'pinned_ad_cuisine_indian' WHERE placement = 'indian' OR placement = 'pinned_ad_indian';
-- Healthy
UPDATE advertisements SET placement = 'pinned_ad_cuisine_healthy' WHERE placement = 'healthy' OR placement = 'pinned_ad_healthy';
-- Burger (assuming singular/plural variations)
UPDATE advertisements SET placement = 'pinned_ad_cuisine_burgers' WHERE placement = 'burgers' OR placement = 'pinned_ad_burgers';
UPDATE advertisements SET placement = 'pinned_ad_cuisine_burger' WHERE placement = 'burger' OR placement = 'pinned_ad_burger';

-- 3. Generic fix for any other "pinned_ad_XYZ" that isn't yet "pinned_ad_cuisine_XYZ" and isn't "pinned_ad_all"
-- This uses a regex-like approach if supported, or substring logic.
-- Note: This assumes anything starting with 'pinned_ad_' followed by text is a cuisine if not 'all'.
-- Safest to stick to the specific updates above unless we are sure.

-- Validation Query
SELECT id, placement FROM advertisements WHERE placement LIKE 'pinned_ad%';
