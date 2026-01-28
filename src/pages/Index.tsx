import { useState, useEffect } from "react";
import { MapPin, Clock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import SpinWheel from "@/components/SpinWheel";
import CategoryChip from "@/components/CategoryChip";
import BottomNav from "@/components/BottomNav";
import UnifiedRestaurantDetail from "@/components/UnifiedRestaurantDetail";
import GuestSignInPrompt from "@/components/GuestSignInPrompt";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import restaurant1 from "@/assets/restaurant-1.jpg";
import logo from "@/assets/logo.png";
interface Cuisine {
  id: string;
  name: string;
  name_en: string | null;
  emoji: string;
  sort_order: number;
}
interface WeeklyPickRestaurant {
  id: string;
  name: string;
  name_en: string | null;
  image_url: string | null;
  cuisine: string;
  avgRating: number;
  phone: string | null;
  website: string | null;
  branches: {
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    google_maps_url: string | null;
  }[];
  deliveryApps: {
    name: string;
    color: string;
    url?: string;
  }[];
  adId?: string;
}
import { getDeliveryAppColor } from "@/lib/deliveryApps";
const Index = () => {
  const navigate = useNavigate();
  const {
    user,
    isGuest
  } = useAuth();
  const {
    language,
    t
  } = useLanguage();
  const {
    toast
  } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [selectedRestaurant, setSelectedRestaurant] = useState<WeeklyPickRestaurant | null>(null);
  const [showRestaurantDetail, setShowRestaurantDetail] = useState(false);
  const [filterNearby, setFilterNearby] = useState(false);
  const [filterNewest, setFilterNewest] = useState(false);
  const [savedRestaurantIds, setSavedRestaurantIds] = useState<string[]>([]);
  const [weeklyPicks, setWeeklyPicks] = useState<WeeklyPickRestaurant[]>([]);
  const [isLoadingPicks, setIsLoadingPicks] = useState(true);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [isLoadingCuisines, setIsLoadingCuisines] = useState(true);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  useEffect(() => {
    fetchCuisines();
    fetchWeeklyPicks();
  }, []);
  const fetchCuisines = async () => {
    setIsLoadingCuisines(true);
    try {
      const {
        data,
        error
      } = await supabase.from("cuisines").select("id, name, name_en, emoji, sort_order").eq("is_active", true).order("sort_order", {
        ascending: true
      });
      if (error) throw error;
      setCuisines(data || []);
    } catch (error) {
      console.error("Error fetching cuisines:", error);
      setCuisines([{
        id: "1",
        name: "الكل",
        name_en: "All",
        emoji: "🍽️",
        sort_order: 0
      }]);
    } finally {
      setIsLoadingCuisines(false);
    }
  };
  useEffect(() => {
    if (user && !isGuest) {
      fetchSavedRestaurants();
    }
  }, [user, isGuest]);
  const fetchWeeklyPicks = async () => {
    setIsLoadingPicks(true);
    try {
      const {
        data: ads,
        error: adsError
      } = await supabase.from("advertisements").select("id, restaurant_id").eq("placement", "most_popular").eq("is_active", true).lte("start_date", new Date().toISOString().split('T')[0]).gte("end_date", new Date().toISOString().split('T')[0]);
      if (adsError) throw adsError;

      // If there are no active weekly-picks ads, we still show a fallback list
      // (so guests see the section like signed-in users), but without ad tracking/badges.
      // If no active ads, show empty section instead of fallback
      if (!ads || ads.length === 0) {
        setWeeklyPicks([]);
        return;
      }
      const restaurantIds = ads.map(ad => ad.restaurant_id);
      const {
        data: restaurants,
        error: restError
      } = await supabase.from("restaurants").select("*").in("id", restaurantIds);
      if (restError) throw restError;
      const picksWithDetails = await buildWeeklyPickDetails(restaurants || [], ads);
      setWeeklyPicks(picksWithDetails);

      // Track ad views separately - don't block data fetching if tracking fails
      trackAdViews(ads);
    } catch (error) {
      console.error("Error fetching weekly picks:", error);
    } finally {
      setIsLoadingPicks(false);
    }
  };
  const buildWeeklyPickDetails = async (restaurants: any[], ads: {
    id: string;
    restaurant_id: string;
  }[]): Promise<WeeklyPickRestaurant[]> => {
    const picks = await Promise.all((restaurants || []).map(async restaurant => {
      const ad = ads.find(a => a.restaurant_id === restaurant.id);
      const [branchesRes, appsRes, ratingRes] = await Promise.all([supabase.from("restaurant_branches").select("latitude, longitude, address, google_maps_url").eq("restaurant_id", restaurant.id), supabase.from("restaurant_delivery_apps").select("app_name, app_url").eq("restaurant_id", restaurant.id), supabase.rpc("get_restaurant_avg_rating", {
        restaurant_uuid: restaurant.id
      })]);
      return {
        id: restaurant.id,
        name: restaurant.name,
        name_en: restaurant.name_en,
        image_url: restaurant.image_url,
        cuisine: restaurant.cuisine,
        phone: restaurant.phone,
        website: restaurant.website,
        avgRating: ratingRes.data || 0,
        branches: branchesRes.data || [],
        deliveryApps: (appsRes.data || []).map(app => ({
          name: app.app_name,
          color: getDeliveryAppColor(app.app_name),
          url: app.app_url || undefined
        })),
        adId: ad?.id
      } as WeeklyPickRestaurant;
    }));
    return picks;
  };

  // Separate function for tracking ad views - fails silently for guests
  const trackAdViews = async (ads: {
    id: string;
    restaurant_id: string;
  }[]) => {
    // تحسين: تنفيذ جميع ad tracking بالتوازي بدلاً من المتسلسل
    const trackingPromises = ads.map(async ad => {
      try {
        // تنفيذ العمليتين بالتوازي
        await Promise.all([
        // تسجيل التفاعل
        supabase.from("ad_interactions").insert({
          ad_id: ad.id,
          interaction_type: "view",
          user_id: user?.id || null
        }),
        // تحديث العداد مباشرة باستخدام increment
        supabase.from("advertisements").update({
          views_count: (supabase as any).raw('COALESCE(views_count, 0) + 1')
        }).eq("id", ad.id)]);
      } catch (err) {
        // Silently fail for guests - tracking is optional
        console.log("Ad view tracking skipped (guest mode or RLS)");
      }
    });

    // انتظار جميع العمليات دون blocking
    Promise.all(trackingPromises).catch(() => {
      // Silent fail - tracking is non-critical
    });
  };
  const fetchSavedRestaurants = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("saved_restaurants").select("name").eq("user_id", user!.id);
      if (!error && data) {
        setSavedRestaurantIds(data.map(r => r.name));
      }
    } catch (error) {
      console.error("Error fetching saved restaurants:", error);
    }
  };
  const toggleFavorite = async (restaurant: WeeklyPickRestaurant) => {
    if (!user || isGuest) {
      setShowGuestPrompt(true);
      return;
    }
    const {
      data: profileData
    } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
    if (!profileData?.username) {
      toast({
        title: t("أكمل ملفك الشخصي", "Complete your profile"),
        description: t("يرجى إضافة اسم مستخدم أولاً من صفحة الملف الشخصي", "Please add a username first from the profile page"),
        variant: "destructive"
      });
      return;
    }
    const isSaved = savedRestaurantIds.includes(restaurant.name);
    try {
      if (isSaved) {
        const {
          error
        } = await supabase.from("saved_restaurants").delete().eq("user_id", user.id).eq("name", restaurant.name);
        if (error) throw error;
        setSavedRestaurantIds(prev => prev.filter(name => name !== restaurant.name));
      } else {
        const {
          error
        } = await supabase.from("saved_restaurants").insert({
          user_id: user.id,
          name: restaurant.name,
          image_url: restaurant.image_url,
          rating: restaurant.avgRating,
          category: restaurant.cuisine,
          address: restaurant.branches?.[0]?.address || null
        });
        if (error) throw error;
        setSavedRestaurantIds(prev => [...prev, restaurant.name]);
      }
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleSpinResult = (category: string) => {
    // Navigate directly to results without showing the selection popup
    const emoji = cuisines.find(c => c.name === category)?.emoji || "🍽️";
    navigate(`/results?category=${encodeURIComponent(category)}&emoji=${encodeURIComponent(emoji)}`);
  };
  const handleRestaurantClick = async (restaurant: WeeklyPickRestaurant) => {
    setSelectedRestaurant(restaurant);
    setShowRestaurantDetail(true);
    if (restaurant.adId) {
      try {
        await supabase.from("ad_interactions").insert({
          ad_id: restaurant.adId,
          interaction_type: "click",
          user_id: user?.id || null
        });
        const {
          data: currentAd
        } = await supabase.from("advertisements").select("clicks_count").eq("id", restaurant.adId).single();
        if (currentAd) {
          await supabase.from("advertisements").update({
            clicks_count: (currentAd.clicks_count || 0) + 1
          }).eq("id", restaurant.adId);
        }
      } catch (error) {
        console.error("Error tracking click:", error);
      }
    }
  };
  return <div className="min-h-screen bg-background pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
      <Header />

      <main className="max-w-md mx-auto px-4">
        {/* Logo */}
        <div className="flex justify-center pt-6 mb-4">
          <img src={logo} alt="شنو ناكل؟" className="h-16 w-auto" />
        </div>

        {/* Category Filters */}
        <section className="mb-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
            {isLoadingCuisines ? <div className="flex items-center justify-center py-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div> : cuisines.map(cuisine => <CategoryChip key={cuisine.id} icon={cuisine.emoji} label={language === "en" && cuisine.name_en ? cuisine.name_en : cuisine.name} isSelected={selectedCategory === cuisine.name} onClick={() => setSelectedCategory(cuisine.name)} />)}
          </div>
        </section>

        {/* Spin Wheel */}
        <motion.section initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} className="flex justify-center mb-8">
          {isLoadingCuisines ? <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-muted animate-pulse" /> : <SpinWheel onResult={handleSpinResult} selectedCategory={selectedCategory} cuisines={cuisines} />}
        </motion.section>

        {/* Filter Buttons */}
        <section className="mb-4">
          <div className="flex gap-2">
            <button onClick={() => setFilterNearby(!filterNearby)} className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-full text-sm font-medium transition-all leading-none ${filterNearby ? "bg-primary text-primary-foreground shadow-soft" : "bg-card text-foreground border border-border"}`}>
              <span>{t("الأقرب", "Nearby")}</span>
              <span>📍</span>
            </button>
            <button onClick={() => setFilterNewest(!filterNewest)} className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-full text-sm font-medium transition-all leading-none ${filterNewest ? "bg-primary text-primary-foreground shadow-soft" : "bg-card text-foreground border border-border"}`}>
              <span>{t("الأحدث", "Newest")}</span>
              <span>⏰</span>
            </button>
          </div>
        </section>

        {/* Weekly Picks Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>⭐</span>
              <span>{t("الأكثر رواجاً", "Most Popular")}</span>
            </h2>
          </div>

          {isLoadingPicks ? <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div> : weeklyPicks.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              <p>{t("لا يوجد", "None available")}</p>
            </div> : <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
              {weeklyPicks.map(restaurant => <motion.div key={restaurant.id} initial={{
            opacity: 0,
            scale: 0.9
          }} animate={{
            opacity: 1,
            scale: 1
          }} className="shrink-0 w-40 bg-card rounded-xl overflow-hidden shadow-card cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => handleRestaurantClick(restaurant)}>
                  <div className="relative h-24">
                    <img src={restaurant.image_url || restaurant1} alt={language === "en" && restaurant.name_en ? restaurant.name_en : restaurant.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate">
                        {language === "en" && restaurant.name_en ? restaurant.name_en : restaurant.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                    const matchedCuisine = cuisines.find(c => c.name === restaurant.cuisine || restaurant.cuisine?.startsWith(c.name) || c.name?.startsWith(restaurant.cuisine?.slice(0, -1) || ''));
                    const cuisineName = language === "en" && matchedCuisine?.name_en ? matchedCuisine.name_en : restaurant.cuisine;
                    return `${matchedCuisine?.emoji || "🍽️"} ${cuisineName}`;
                  })()}
                      </p>
                    </div>
                    <button onClick={e => {
                e.stopPropagation();
                const mapsUrl = restaurant.branches?.[0]?.google_maps_url;
                const lat = restaurant.branches?.[0]?.latitude;
                const lng = restaurant.branches?.[0]?.longitude;
                if (mapsUrl) {
                  window.open(mapsUrl, '_blank', 'noopener,noreferrer');
                } else if (lat && lng) {
                  window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank', 'noopener,noreferrer');
                } else {
                  const searchQuery = encodeURIComponent(restaurant.name);
                  window.open(`https://www.google.com/maps/search/${searchQuery}`, '_blank', 'noopener,noreferrer');
                }
              }} className="w-7 h-7 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20 inline-flex items-center justify-center transition-colors text-primary">
                      <MapPin className="w-3.5 h-3.5 mb-[4px]" />
                    </button>
                  </div>
                </motion.div>)}
            </div>}
        </section>
      </main>

      <BottomNav />

      <UnifiedRestaurantDetail isOpen={showRestaurantDetail} onClose={() => setShowRestaurantDetail(false)} restaurant={selectedRestaurant ? {
      id: selectedRestaurant.id,
      name: language === "en" && selectedRestaurant.name_en ? selectedRestaurant.name_en : selectedRestaurant.name,
      image_url: selectedRestaurant.image_url || restaurant1,
      cuisine: selectedRestaurant.cuisine,
      rating: selectedRestaurant.avgRating,
      phone: selectedRestaurant.phone,
      address: selectedRestaurant.branches?.[0]?.address,
      latitude: selectedRestaurant.branches?.[0]?.latitude,
      longitude: selectedRestaurant.branches?.[0]?.longitude,
      mapsUrl: selectedRestaurant.branches?.[0]?.google_maps_url
    } : null} />

      <GuestSignInPrompt isOpen={showGuestPrompt} onClose={() => setShowGuestPrompt(false)} />
    </div>;
};
export default Index;