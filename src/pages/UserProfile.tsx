import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Star, Users, MapPin, MessageSquare, UserPlus, UserMinus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import UnifiedRestaurantDetail from "@/components/UnifiedRestaurantDetail";
import { getDeliveryAppColor } from "@/lib/deliveryApps";

interface RestaurantFromDB {
  id: string;
  name: string;
  cuisine: string;
  image_url: string | null;
  phone: string | null;
  website: string | null;
  branches: { latitude: number | null; longitude: number | null; address: string | null; google_maps_url: string | null }[];
  deliveryApps: { name: string; color: string; url?: string }[];
  avgRating: number;
}

interface UserProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface SavedRestaurant {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  rating: number | null;
  distance: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  actualCuisine?: string | null;
}

interface Cuisine {
  name: string;
  emoji: string;
}

const UserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { toast } = useToast();
  
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [restaurants, setRestaurants] = useState<SavedRestaurant[]>([]);
  const [cuisines, setCuisines] = useState<{ name: string; emoji: string; name_en: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantFromDB | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchCuisines();
  }, []);

  const fetchCuisines = async () => {
    const { data } = await supabase
      .from("cuisines")
      .select("name, emoji, name_en")
      .eq("is_active", true);
    setCuisines(data || []);
  };

  const getCuisineDisplay = (cuisineName: string | null) => {
    if (!cuisineName) return { emoji: "🍽️", name: "" };
    const cuisine = cuisines.find(c => c.name === cuisineName);
    return {
      emoji: cuisine?.emoji || "🍽️",
      name: language === "en" ? (cuisine?.name_en || cuisineName) : cuisineName
    };
  };

  useEffect(() => {
    if (username) {
      fetchUserProfile();
    }
  }, [username, user]);

  const fetchUserProfile = async () => {
    try {
      // Fetch profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (error) throw error;
      if (!profile) {
        toast({
          title: t("المستخدم غير موجود", "User not found"),
          description: t("لم يتم العثور على هذا المستخدم", "This user could not be found"),
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      setProfileData(profile);

      // Fetch followers count and ratings count in parallel
      const [followersRes, ratingsRes] = await Promise.all([
        supabase
          .from("friendships")
          .select("*", { count: "exact", head: true })
          .eq("user_id_2", profile.id),
        supabase
          .from("restaurant_ratings")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id)
      ]);

      setFollowersCount(followersRes.count || 0);
      setRatingsCount(ratingsRes.count || 0);

      // Check friendship status
      if (user) {
        const { data: friendship } = await supabase
          .from("friendships")
          .select("*")
          .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${profile.id}),and(user_id_1.eq.${profile.id},user_id_2.eq.${user.id})`)
          .maybeSingle();

        setIsFriend(!!friendship);
      }

      // Fetch restaurants with correct cuisine from main table
      const { data: savedRestaurants } = await supabase
        .from("saved_restaurants")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (savedRestaurants && savedRestaurants.length > 0) {
        // Fetch actual cuisines from restaurants table
        const names = savedRestaurants.map(r => r.name);
        const { data: restaurantsData } = await supabase
          .from("restaurants")
          .select("name, name_en, cuisine")
          .or(names.map(n => `name.eq.${n},name_en.eq.${n}`).join(','));

        const cuisineMap: Record<string, string> = {};
        restaurantsData?.forEach(r => {
          cuisineMap[r.name] = r.cuisine;
          if (r.name_en) cuisineMap[r.name_en] = r.cuisine;
        });

        const enrichedRestaurants = savedRestaurants.map(r => ({
          ...r,
          actualCuisine: cuisineMap[r.name] || r.category
        }));

        setRestaurants(enrichedRestaurants);
      } else {
        setRestaurants([]);
      }
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addToFavorites = async () => {
    if (!user || !profileData) return;

    try {
      const { error } = await supabase
        .from("friendships")
        .insert({
          user_id_1: user.id,
          user_id_2: profileData.id
        });

      if (error) throw error;

      setIsFriend(true);
      setFollowersCount(prev => prev + 1);
      toast({
        title: t("تمت الإضافة", "Added"),
        description: t("تمت إضافة القائمة للمفضلة", "List added to favorites")
      });
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const removeFromFavorites = async () => {
    if (!user || !profileData) return;

    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${profileData.id}),and(user_id_1.eq.${profileData.id},user_id_2.eq.${user.id})`);

      if (error) throw error;

      setIsFriend(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
      toast({
        title: t("تمت الإزالة", "Removed"),
        description: t("تمت إزالة القائمة من المفضلة", "List removed from favorites")
      });
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRestaurantClick = async (restaurant: SavedRestaurant) => {
    // Find the restaurant in the main restaurants table with all related data
    // Search by both Arabic name and English name (case-insensitive)
    const { data } = await supabase
      .from("restaurants")
      .select("id, name, cuisine, image_url, phone, website")
      .or(`name.ilike.${restaurant.name},name_en.ilike.${restaurant.name}`)
      .limit(1)
      .maybeSingle();
    
    if (data) {
      // Fetch branches, delivery apps, and rating
      const [branchesRes, appsRes, ratingRes] = await Promise.all([
        supabase.from("restaurant_branches").select("latitude, longitude, address, google_maps_url").eq("restaurant_id", data.id),
        supabase.from("restaurant_delivery_apps").select("app_name, app_url").eq("restaurant_id", data.id),
        supabase.rpc("get_restaurant_avg_rating", { restaurant_uuid: data.id })
      ]);

      setSelectedRestaurant({
        ...data,
        branches: branchesRes.data || [],
        deliveryApps: (appsRes.data || []).map(app => ({
          name: app.app_name,
          color: getDeliveryAppColor(app.app_name),
          url: app.app_url || undefined
        })),
        avgRating: ratingRes.data || 0
      });
    } else {
      // Fallback if not in main table - use saved data
      setSelectedRestaurant({
        id: restaurant.id,
        name: restaurant.name,
        cuisine: restaurant.category || "",
        image_url: restaurant.image_url,
        phone: null,
        website: null,
        branches: [],
        deliveryApps: [],
        avgRating: restaurant.rating || 0
      });
    }
    setShowDetail(true);
  };

  const handleMapClick = (restaurant: SavedRestaurant, e: React.MouseEvent) => {
    e.stopPropagation();
    // We'll need to fetch the map URL when clicking
    supabase
      .from("restaurants")
      .select("id")
      .eq("name", restaurant.name)
      .maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          const { data: branches } = await supabase
            .from("restaurant_branches")
            .select("google_maps_url, latitude, longitude")
            .eq("restaurant_id", data.id)
            .limit(1);
          
          if (branches?.[0]?.google_maps_url) {
            window.open(branches[0].google_maps_url, '_blank', 'noopener,noreferrer');
          } else if (branches?.[0]?.latitude && branches?.[0]?.longitude) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${branches[0].latitude},${branches[0].longitude}`, '_blank', 'noopener,noreferrer');
          }
        }
      });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            {language === "ar" ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </button>
          <h1 className="text-lg font-bold">{profileData.username}</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6" dir={language === "ar" ? "rtl" : "ltr"}>
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Avatar className="w-24 h-24 mx-auto mb-4">
            <AvatarImage src={profileData.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {profileData.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold">{profileData.username}</h2>
          
          {/* Stats and Action */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-bold">{followersCount}</span>
              <span className="text-muted-foreground">{t("متابع", "followers")}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-bold">{ratingsCount}</span>
              <span className="text-muted-foreground">{t("تقييم", "ratings")}</span>
            </div>
            {user && user.id !== profileData.id && !isFriend && (
              <button
                onClick={addToFavorites}
                className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                title={t("متابعة", "Follow")}
              >
                <UserPlus className="w-4 h-4" />
              </button>
            )}
            {user && user.id !== profileData.id && isFriend && (
              <button
                onClick={removeFromFavorites}
                className="p-2 bg-muted rounded-full text-primary hover:bg-destructive/10 hover:text-destructive transition-colors"
                title={t("إلغاء المتابعة", "Unfollow")}
              >
                <UserMinus className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Content - Always visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-bold mb-4">{t(`قائمة ${profileData.username} (${restaurants.length} مطعم)`, `${profileData.username}'s list (${restaurants.length} restaurants)`)}</h3>
          {restaurants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("لم يضف أي مطاعم بعد", "No restaurants added yet")}
            </div>
          ) : (
            <div className="space-y-3">
              {restaurants.map((restaurant, index) => (
                <motion.div
                  key={restaurant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="bg-card rounded-2xl overflow-hidden shadow-card cursor-pointer hover:shadow-elevated transition-shadow"
                  onClick={() => handleRestaurantClick(restaurant)}
                  dir={language === "ar" ? "rtl" : "ltr"}
                >
                  <div className="flex">
                    {/* Image Section */}
                    <div className="relative w-28 h-28 shrink-0">
                      {restaurant.image_url ? (
                        <img
                          src={restaurant.image_url}
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-4xl">🍽️</span>
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-3">
                      {/* Name */}
                      <h3 className="font-bold text-base leading-tight truncate mb-1">{restaurant.name}</h3>

                      {/* Cuisine with emoji - use actualCuisine from restaurants table */}
                      {(restaurant.actualCuisine || restaurant.category) && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {getCuisineDisplay(restaurant.actualCuisine || restaurant.category).emoji} {getCuisineDisplay(restaurant.actualCuisine || restaurant.category).name}
                        </p>
                      )}

                      {/* Distance */}
                      {restaurant.distance && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span>{restaurant.distance}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Column */}
                    <div className="flex flex-col items-center justify-between p-2">
                      {/* Rating */}
                      <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-lg">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-bold text-foreground">{(restaurant.rating || 0).toFixed(1)}</span>
                      </div>

                      {/* Map */}
                      <button
                        onClick={(e) => handleMapClick(restaurant, e)}
                        className="p-1"
                      >
                        <MapPin className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      <BottomNav />

      <UnifiedRestaurantDetail
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        restaurant={selectedRestaurant ? {
          id: selectedRestaurant.id,
          name: selectedRestaurant.name,
          image_url: selectedRestaurant.image_url,
          cuisine: selectedRestaurant.cuisine,
          phone: selectedRestaurant.phone,
          rating: selectedRestaurant.avgRating,
          address: selectedRestaurant.branches?.[0]?.address,
          latitude: selectedRestaurant.branches?.[0]?.latitude,
          longitude: selectedRestaurant.branches?.[0]?.longitude,
          mapsUrl: selectedRestaurant.branches?.[0]?.google_maps_url
        } : null}
        ownerName={profileData.username}
        ownerId={profileData.id}
      />
    </div>
  );
};

export default UserProfile;
