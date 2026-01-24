import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Star, MapPin, Heart, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GuestSignInPrompt from "@/components/GuestSignInPrompt";

import restaurant1 from "@/assets/restaurant-1.jpg";
import { getDeliveryAppColor, DeliveryApp } from "@/lib/deliveryApps";

interface Branch {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  google_maps_url: string | null;
}

interface AdRestaurant {
  id: string;
  name: string;
  image_url: string | null;
  cuisine: string;
  phone: string | null;
  website: string | null;
  branches: Branch[];
  deliveryApps: DeliveryApp[];
  avgRating: number;
  adId?: string;
}

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
}

const ResultModal = ({ isOpen, onClose, category }: ResultModalProps) => {
  const { user, isGuest } = useAuth();
  const { language, t } = useLanguage();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [adRestaurant, setAdRestaurant] = useState<AdRestaurant | null>(null);
  const [isLoadingAd, setIsLoadingAd] = useState(true);
  const [cuisineEmoji, setCuisineEmoji] = useState("🍽️");
  const [cuisineDisplay, setCuisineDisplay] = useState("");
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);

  // Fetch advertisement for spin wheel result
  useEffect(() => {
    if (isOpen) {
      fetchAdvertisement();
      fetchCuisineEmoji();
    }
  }, [isOpen, category]);

  const fetchCuisineEmoji = async () => {
    if (category === "الكل") {
      setCuisineEmoji("🍽️");
      setCuisineDisplay(language === "en" ? "All" : "الكل");
      return;
    }

    const { data } = await supabase
      .from("cuisines")
      .select("emoji, name, name_en")
      .eq("name", category)
      .maybeSingle();

    if (data?.emoji) {
      setCuisineEmoji(data.emoji);
      setCuisineDisplay(language === "en" ? (data.name_en || category) : category);
    } else {
      setCuisineEmoji("🍽️");
      setCuisineDisplay(category);
    }
  };

  // Check if restaurant is in favorites
  useEffect(() => {
    if (isOpen && user && !isGuest && adRestaurant) {
      checkFavoriteStatus();
    }
  }, [isOpen, user, isGuest, adRestaurant]);

  const fetchAdvertisement = async () => {
    setIsLoadingAd(true);
    try {
      // Fetch active advertisements for spin_popup placement
      const { data: ads, error: adsError } = await supabase
        .from("advertisements")
        .select("restaurant_id, id")
        .eq("placement", "spin_popup")
        .eq("is_active", true)
        .lte("start_date", new Date().toISOString().split('T')[0])
        .gte("end_date", new Date().toISOString().split('T')[0]);

      if (adsError) throw adsError;

      // If we have ads, filter by the selected category's cuisine
      let matchingRestaurant = null;
      let matchingAdId: string | undefined;

      if (ads && ads.length > 0) {
        // Fetch all advertised restaurants to filter by cuisine
        const restaurantIds = ads.map(ad => ad.restaurant_id);

        let restaurantQuery = supabase
          .from("restaurants")
          .select("*")
          .in("id", restaurantIds);

        // Filter by cuisine if not "الكل"
        if (category !== "الكل") {
          restaurantQuery = restaurantQuery.eq("cuisine", category);
        }

        const { data: restaurants } = await restaurantQuery;

        if (restaurants && restaurants.length > 0) {
          // Get last selected restaurant to avoid immediate repeats
          const lastSelectedId = localStorage.getItem('lastSpinRestaurantId');

          // Filter out the last selected restaurant if there are alternatives
          let availableRestaurants = restaurants;
          if (lastSelectedId && restaurants.length > 1) {
            availableRestaurants = restaurants.filter(r => r.id !== lastSelectedId);
            // If filtering removed all options (shouldn't happen but just in case), use all
            if (availableRestaurants.length === 0) {
              availableRestaurants = restaurants;
            }
          }

          // Get random matching restaurant from filtered list
          matchingRestaurant = availableRestaurants[Math.floor(Math.random() * availableRestaurants.length)];
          matchingAdId = ads.find(ad => ad.restaurant_id === matchingRestaurant.id)?.id;

          // Store this selection for next time
          localStorage.setItem('lastSpinRestaurantId', matchingRestaurant.id);
        }
      }

      // If no matching ad, try to find any restaurant with matching cuisine
      if (!matchingRestaurant) {
        let restaurantQuery = supabase.from("restaurants").select("*");

        if (category !== "الكل") {
          restaurantQuery = restaurantQuery.eq("cuisine", category);
        }

        const { data: restaurants } = await restaurantQuery;

        if (restaurants && restaurants.length > 0) {
          // Get last selected restaurant to avoid immediate repeats
          const lastSelectedId = localStorage.getItem('lastSpinRestaurantId');

          // Filter out the last selected restaurant if there are alternatives
          let availableRestaurants = restaurants;
          if (lastSelectedId && restaurants.length > 1) {
            availableRestaurants = restaurants.filter(r => r.id !== lastSelectedId);
            // If filtering removed all options, use all
            if (availableRestaurants.length === 0) {
              availableRestaurants = restaurants;
            }
          }

          matchingRestaurant = availableRestaurants[Math.floor(Math.random() * availableRestaurants.length)];

          // Store this selection for next time
          localStorage.setItem('lastSpinRestaurantId', matchingRestaurant.id);
        }
      }

      if (!matchingRestaurant) {
        setAdRestaurant(null);
        setIsLoadingAd(false);
        return;
      }

      // Fetch branches
      const { data: branches } = await supabase
        .from("restaurant_branches")
        .select("latitude, longitude, address, google_maps_url")
        .eq("restaurant_id", matchingRestaurant.id);

      // Fetch delivery apps
      const { data: apps } = await supabase
        .from("restaurant_delivery_apps")
        .select("app_name, app_url")
        .eq("restaurant_id", matchingRestaurant.id);

      // Fetch average rating
      const { data: avgData } = await supabase
        .rpc("get_restaurant_avg_rating", { restaurant_uuid: matchingRestaurant.id });

      setAdRestaurant({
        id: matchingRestaurant.id,
        name: matchingRestaurant.name,
        image_url: matchingRestaurant.image_url,
        cuisine: matchingRestaurant.cuisine,
        phone: matchingRestaurant.phone,
        website: matchingRestaurant.website,
        branches: branches || [],
        deliveryApps: (apps || []).map(app => ({
          name: app.app_name,
          color: getDeliveryAppColor(app.app_name),
          url: app.app_url || undefined
        })),
        avgRating: avgData || 0,
        adId: matchingAdId
      });

      // Track ad view only if it was from an ad
      if (matchingAdId) {
        await supabase.from("ad_interactions").insert({
          ad_id: matchingAdId,
          interaction_type: "view",
          user_id: user?.id || null
        });

        // Get current views count and increment
        const { data: currentAd } = await supabase
          .from("advertisements")
          .select("views_count")
          .eq("id", matchingAdId)
          .single();

        if (currentAd) {
          await supabase
            .from("advertisements")
            .update({ views_count: (currentAd.views_count || 0) + 1 })
            .eq("id", matchingAdId);
        }
      }

    } catch (error) {
      console.error("Error fetching advertisement:", error);
      setAdRestaurant(null);
    } finally {
      setIsLoadingAd(false);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!adRestaurant) return;

    const { data } = await supabase
      .from("saved_restaurants")
      .select("id")
      .eq("user_id", user!.id)
      .eq("name", adRestaurant.name)
      .maybeSingle();

    setIsFavorite(!!data);
  };

  const isValidHttpUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleMapClick = () => {
    if (!adRestaurant?.branches?.[0]) return;
    const branch = adRestaurant.branches[0];
    // Priority: google_maps_url > coordinates > address
    if (branch.google_maps_url) {
      window.open(branch.google_maps_url, "_blank", "noopener,noreferrer");
    } else if (branch.latitude && branch.longitude) {
      const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(branch.latitude.toString())},${encodeURIComponent(branch.longitude.toString())}`;
      window.open(mapsUrl, "_blank", "noopener,noreferrer");
    } else if (branch.address) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`;
      window.open(mapsUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleFavoriteClick = async () => {
    if (!user || isGuest) {
      setShowGuestPrompt(true);
      return;
    }

    if (!adRestaurant) return;

    setIsLoading(true);
    try {
      if (isFavorite) {
        await supabase
          .from("saved_restaurants")
          .delete()
          .eq("user_id", user.id)
          .eq("name", adRestaurant.name);
        setIsFavorite(false);
        toast.success(t("تم إزالة المطعم من قائمتي", "Restaurant removed from my list"));
      } else {
        await supabase.from("saved_restaurants").insert({
          user_id: user.id,
          name: adRestaurant.name,
          image_url: adRestaurant.image_url,
          rating: adRestaurant.avgRating,
          category: adRestaurant.cuisine,
          address: adRestaurant.branches?.[0]?.address || null
        });
        setIsFavorite(true);
        toast.success(t("تم إضافة المطعم لقائمتي", "Restaurant added to my list"));
      }
    } catch (error) {
      toast.error(t("حدث خطأ، حاول مرة أخرى", "An error occurred, please try again"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeliveryAppClick = async (app: DeliveryApp) => {
    if (app.url && isValidHttpUrl(app.url)) {
      window.open(app.url, "_blank", "noopener,noreferrer");

      // Track click on ad
      if (adRestaurant?.adId) {
        try {
          await supabase.from("ad_interactions").insert({
            ad_id: adRestaurant.adId,
            interaction_type: "click",
            user_id: user?.id || null
          });

          // Get current clicks count and increment
          const { data: currentAd } = await supabase
            .from("advertisements")
            .select("clicks_count")
            .eq("id", adRestaurant.adId)
            .single();

          if (currentAd) {
            await supabase
              .from("advertisements")
              .update({ clicks_count: (currentAd.clicks_count || 0) + 1 })
              .eq("id", adRestaurant.adId);
          }
        } catch (error) {
          console.error("Error tracking click:", error);
        }
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="w-full max-w-sm bg-card rounded-3xl p-5 shadow-elevated relative pointer-events-auto" dir={language === "ar" ? "rtl" : "ltr"}>
                <button
                  onClick={onClose}
                  className={`absolute top-4 ${language === "ar" ? "left-4" : "right-4"} w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10`}
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-16 h-16 mx-auto mb-3 bg-secondary rounded-full flex items-center justify-center"
                  >
                    <Sparkles className="w-8 h-8 text-primary" />
                  </motion.div>

                  <h2 className="text-lg font-bold text-foreground mb-1">
                    {t("تم الاختيار! 🎉", "Selected! 🎉")}
                  </h2>

                  <p className="text-sm text-muted-foreground mb-4">
                    {t("الفئة:", "Category:")} <span className="font-bold text-primary">{cuisineDisplay || category}</span>
                  </p>

                  {isLoadingAd ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : adRestaurant ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-card rounded-3xl overflow-hidden shadow-card"
                      dir={language === "ar" ? "rtl" : "ltr"}
                    >
                      {/* Image Section */}
                      <div className="relative h-36 overflow-hidden">
                        <img
                          src={adRestaurant.image_url || restaurant1}
                          alt={adRestaurant.name}
                          className="w-full h-full object-cover"
                        />

                        {/* Weekly picks badge - only show for actual ads */}
                        {adRestaurant.adId && (
                          <div className="absolute top-3 right-3 bg-coral-light text-secondary-foreground px-3 py-1 rounded-full text-xs font-medium">
                            {t("الأكثر رواجاً ⭐", "Most Popular ⭐")}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <button
                            onClick={handleMapClick}
                            className="w-10 h-10 bg-card/95 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-soft transition-transform hover:scale-105"
                          >
                            <MapPin className="w-5 h-5 text-primary" />
                          </button>

                          <button
                            onClick={handleFavoriteClick}
                            disabled={isLoading}
                            className="w-10 h-10 bg-card/95 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-soft transition-transform hover:scale-105"
                          >
                            <Heart
                              className={`w-5 h-5 transition-colors ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
                                }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-4">
                        {/* Rating and Name Row */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-bold text-lg leading-tight flex-1">{adRestaurant.name}</h3>

                          <div className="flex items-center gap-1.5 bg-amber-100 px-3 py-1.5 rounded-xl shrink-0">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="text-base font-bold text-foreground">{adRestaurant.avgRating ? adRestaurant.avgRating.toFixed(1) : "0.0"}</span>
                          </div>
                        </div>

                        {/* Info Row */}
                        <div className="flex items-center gap-3 text-muted-foreground text-sm mb-4">
                          <div className="flex items-center gap-1">
                            <span className="text-lg">{cuisineEmoji}</span>
                            <span>{cuisineDisplay || adRestaurant.cuisine}</span>
                          </div>
                          {adRestaurant.branches?.[0]?.address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-primary" />
                              <span className="truncate max-w-[120px]">{adRestaurant.branches[0].address}</span>
                            </div>
                          )}
                        </div>

                        {/* Delivery Apps */}
                        {adRestaurant.deliveryApps.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground">{t("اطلب عبر:", "Order via:")}</span>
                            {adRestaurant.deliveryApps.map((app) => (
                              <button
                                key={app.name}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeliveryAppClick(app);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all hover:scale-105 bg-card"
                                style={{ borderColor: app.color, color: app.color }}
                              >
                                {app.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      className="py-8 text-center"
                    >
                      <div className="w-24 h-24 mx-auto mb-4 bg-secondary rounded-full flex items-center justify-center">
                        <span className="text-5xl">{cuisineEmoji}</span>
                      </div>
                    </motion.div>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full py-3 mt-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base shadow-soft hover:shadow-elevated transition-shadow"
                  >
                    {t("عرض باقي المطاعم ✨", "View other restaurants ✨")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <GuestSignInPrompt
        isOpen={showGuestPrompt}
        onClose={() => setShowGuestPrompt(false)}
      />
    </>
  );
};

export default ResultModal;
