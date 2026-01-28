import { supabase } from "@/integrations/supabase/client";

export type InteractionType =
    | 'map'
    | 'phone'
    | 'website'
    | 'view_detail'
    | string; // For delivery_talabat, etc.

/**
 * Logs a restaurant interaction and increments ad clicks if applicable.
 * Follows the "Fire & Forget" pattern to ensure user experience is not blocked.
 */
export const trackRestaurantInteraction = (
    restaurantId: string,
    type: InteractionType,
    userId?: string | null,
    adId?: string | null
) => {
    // 1. Analytics Log (Universal)
    const logPromise = supabase
        .from("restaurant_interactions")
        .insert({
            restaurant_id: restaurantId,
            interaction_type: type,
            user_id: userId || null,
            ad_id: adId || null
        });

    // 2. Ad ROI Log (Only if adId is present)
    let roiPromise = Promise.resolve();
    if (adId) {
        roiPromise = supabase.rpc("increment_ad_clicks", { ad_uuid: adId }) as any;
    }

    // Execute in background
    Promise.all([logPromise, roiPromise]).catch(err => {
        console.error("Failed to track interaction:", err);
    });
};
