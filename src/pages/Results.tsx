import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Star, Heart, Phone, MapPin, Globe } from "lucide-react";
import CompactRestaurantCard from "@/components/CompactRestaurantCard";
import BottomNav from "@/components/BottomNav";
import GoogleMapView from "@/components/GoogleMapView";
import ViewToggle from "@/components/ViewToggle";
import GuestSignInPrompt from "@/components/GuestSignInPrompt";
import UnifiedRestaurantDetail from "@/components/UnifiedRestaurantDetail";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";
import { getDeliveryAppColor } from "@/lib/deliveryApps";

// Cache for geocoded coordinates to avoid repeated API calls
const geocodeCache = new Map<string, {
  lat: number;
  lon: number;
} | null>();

// Geocode a restaurant name using OpenStreetMap Nominatim
const geocodeRestaurant = async (name: string, nameEn?: string | null): Promise<{
  lat: number;
  lon: number;
} | null> => {
  const cacheKey = name;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) || null;
  }
  try {
    // Try English name first (usually more accurate for geocoding)
    const searchName = nameEn || name;
    const query = encodeURIComponent(`${searchName}, Kuwait`);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=kw`, {
      headers: {
        "Accept-Language": "ar,en",
        "User-Agent": "ShiNoNakel-App/1.0"
      }
    });
    if (!response.ok) {
      geocodeCache.set(cacheKey, null);
      return null;
    }
    const data = await response.json();
    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }
    geocodeCache.set(cacheKey, null);
    return null;
  } catch (err) {
    console.error("Geocoding error for", name, err);
    geocodeCache.set(cacheKey, null);
    return null;
  }
};
interface Restaurant {
  id: string;
  name: string;
  name_en: string | null;
  cuisine: string;
  cuisines?: string[]; // إضافة مصفوفة الفئات
  image_url: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
  branches?: {
    id: string;
    branch_name: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    google_maps_url: string | null;
  }[];
  delivery_apps?: {
    id: string;
    app_name: string;
    app_url: string | null;
  }[];
  ratings?: {
    id: string;
    rating: number;
    comment: string | null;
    user_id: string;
  }[];
}
interface Cuisine {
  name: string;
  name_en: string | null;
  emoji: string;
}
const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = searchParams.get("category") || "الكل";
  const emojiParam = searchParams.get("emoji");
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
  const {
    latitude: userLat,
    longitude: userLon,
    requestLocation,
    isLoading: isLoadingLocation,
    error: locationError
  } = useGeolocation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [savedRestaurantIds, setSavedRestaurantIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [filterNearby, setFilterNearby] = useState(false);
  const [filterNewest, setFilterNewest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [showRestaurantDetail, setShowRestaurantDetail] = useState(false);
  const [selectedRestaurantData, setSelectedRestaurantData] = useState<any>(null);
  const [geocodedCoords, setGeocodedCoords] = useState<Map<string, {
    lat: number;
    lon: number;
  }>>(new Map());

  // Show location error if it occurs
  useEffect(() => {
    if (locationError && filterNearby) {
      toast({
        title: t("تعذر تحديد الموقع", "Location Error"),
        description: locationError,
        variant: "destructive"
      });
    }
  }, [locationError, filterNearby, t, toast]);
  const geocodingInProgress = useRef(false);
  useEffect(() => {
    fetchRestaurants();
    fetchCuisines();
  }, []);
  const fetchCuisines = async () => {
    const {
      data
    } = await supabase.from("cuisines").select("name, name_en, emoji").eq("is_active", true);
    setCuisines(data || []);
  };
  useEffect(() => {
    if (user && !isGuest) {
      fetchSavedRestaurants();
    }
  }, [user, isGuest]);
  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from("restaurants").select(`
          *,
          branches:restaurant_branches(*),
          delivery_apps:restaurant_delivery_apps(*),
          ratings:restaurant_ratings(*)
        `).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    } finally {
      setIsLoading(false);
    }
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

  // Show location error if it occurs
  useEffect(() => {
    if (locationError && filterNearby) {
      toast({
        title: t("تعذر تحديد الموقع", "Location Error"),
        description: locationError,
        variant: "destructive"
      });
    }
  }, [locationError, filterNearby, t, toast]);

  // Geocode restaurants that don't have coordinates
  useEffect(() => {
    if (geocodingInProgress.current || restaurants.length === 0) return;
    const restaurantsNeedingGeocode = restaurants.filter(r => {
      const hasBranchCoords = r.branches?.some(b => b.latitude != null && b.longitude != null);
      return !hasBranchCoords && !geocodedCoords.has(r.id);
    });
    if (restaurantsNeedingGeocode.length === 0) return;
    geocodingInProgress.current = true;
    const geocodeSequentially = async () => {
      const newCoords = new Map(geocodedCoords);
      for (const restaurant of restaurantsNeedingGeocode.slice(0, 5)) {
        // Limit to 5 at a time
        const result = await geocodeRestaurant(restaurant.name, restaurant.name_en);
        if (result) {
          newCoords.set(restaurant.id, result);
        }
        // Respect Nominatim rate limit: 1 request per second
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
      setGeocodedCoords(newCoords);
      geocodingInProgress.current = false;
    };
    geocodeSequentially();
  }, [restaurants, geocodedCoords]);
  const transformedRestaurants = useMemo(() => {
    return restaurants.map((r, index) => {
      const ratings = r.ratings || [];
      const avgRating = ratings.length > 0 ? Number((ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length).toFixed(1)) : 0;
      const ratingCount = ratings.length;
      const primaryBranch = r.branches?.find(b => b.google_maps_url) ?? r.branches?.find(b => b.latitude != null && b.longitude != null) ?? r.branches?.[0];
      const address = primaryBranch?.address || "";
      const mapsUrl = primaryBranch?.google_maps_url || null;

      // Use database coords if available, otherwise use geocoded coords
      let branchLat = primaryBranch?.latitude;
      let branchLon = primaryBranch?.longitude;
      if (branchLat == null || branchLon == null) {
        const geocoded = geocodedCoords.get(r.id);
        if (geocoded) {
          branchLat = geocoded.lat;
          branchLon = geocoded.lon;
        }
      }
      let distanceNum: number | null = null;
      let distanceText = "";
      if (userLat != null && userLon != null && branchLat != null && branchLon != null) {
        distanceNum = calculateDistance(userLat, userLon, branchLat, branchLon);
        distanceText = `${distanceNum.toFixed(1)} ${t("كم", "km")}`;
      } else if (branchLat != null && branchLon != null) {
        distanceText = "📍";
      } else {
        distanceText = "";
      }
      return {
        id: r.id,
        name: r.name,
        name_en: r.name_en,
        image: r.image_url || "/placeholder.svg",
        rating: avgRating,
        ratingCount,
        distance: distanceText,
        distanceNum,
        cuisine: r.cuisine,
        category: r.cuisine,
        isOpen: true,
        isSponsored: false,
        deliveryApps: (r.delivery_apps || []).map(app => ({
          name: app.app_name,
          color: getDeliveryAppColor(app.app_name),
          url: app.app_url
        })),
        isFavorite: savedRestaurantIds.includes(r.name),
        position: {
          top: `${15 + index * 20 % 70}%`,
          right: `${20 + index * 25 % 60}%`
        },
        latitude: branchLat || null,
        longitude: branchLon || null,
        createdAt: new Date(r.created_at || Date.now()),
        phone: r.phone,
        website: r.website,
        branches: r.branches,
        address,
        mapsUrl
      };
    });
  }, [restaurants, savedRestaurantIds, userLat, userLon, t, geocodedCoords]);
  const filteredRestaurants = useMemo(() => {
    let filtered = category === "الكل" ? [...transformedRestaurants] : transformedRestaurants.filter(r => {
      // البحث في الفئة الرئيسية
      if (r.cuisine === category) return true;

      // البحث في مصفوفة الفئات (cuisines array)
      const restaurant = restaurants.find(rest => rest.id === r.id);
      if (restaurant?.cuisines && Array.isArray(restaurant.cuisines)) {
        return restaurant.cuisines.includes(category);
      }
      return false;
    });
    if (filterNewest) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(r => r.createdAt >= thirtyDaysAgo);
    }
    return filtered.sort((a, b) => {
      if (filterNearby && filterNewest) {
        const aDistance = a.distanceNum ?? Infinity;
        const bDistance = b.distanceNum ?? Infinity;
        if (aDistance !== bDistance) {
          return aDistance - bDistance;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      } else if (filterNearby) {
        const aDistance = a.distanceNum ?? Infinity;
        const bDistance = b.distanceNum ?? Infinity;
        if (aDistance !== bDistance) {
          return aDistance - bDistance;
        }
        // Fallback to default sort if distances are equal (or both unknown)
        return b.createdAt.getTime() - a.createdAt.getTime();
      } else if (filterNewest) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      return 0;
    });
  }, [category, filterNearby, filterNewest, transformedRestaurants]);
  const getCuisineDisplay = (cuisineName: string) => {
    const cuisine = cuisines.find(c => c.name === cuisineName);
    const displayName = language === "en" && cuisine?.name_en ? cuisine.name_en : cuisineName;
    return {
      emoji: cuisine?.emoji || "🍽️",
      name: displayName
    };
  };
  const categoryDisplay = useMemo(() => {
    const cuisine = cuisines.find(c => c.name === category);
    return language === "en" && cuisine?.name_en ? cuisine.name_en : category;
  }, [category, cuisines, language]);
  useEffect(() => {
    if (filterNearby && !userLat && !userLon && !isLoadingLocation) {
      requestLocation();
    }
  }, [filterNearby, userLat, userLon, isLoadingLocation, requestLocation]);
  const toggleFavorite = async (restaurant: any) => {
    if (!user || isGuest) {
      setShowGuestPrompt(true);
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
          image_url: restaurant.image,
          rating: restaurant.rating,
          distance: restaurant.distance,
          category: restaurant.cuisine,
          address: restaurant.distance
        });
        if (error) throw error;
        setSavedRestaurantIds(prev => [...prev, restaurant.name]);
        /* toast({
          title: t("تم الحفظ", "Saved"),
          description: t("تم إضافة المطعم إلى قائمتك", "Restaurant added to your list")
        }); */
      }
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleMapClick = (restaurant: any) => {
    if (restaurant.mapsUrl) {
      window.open(restaurant.mapsUrl, '_blank', 'noopener,noreferrer');
    } else if (restaurant.latitude && restaurant.longitude) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`, '_blank', 'noopener,noreferrer');
    } else {
      const searchQuery = encodeURIComponent(restaurant.name);
      window.open(`https://www.google.com/maps/search/${searchQuery}`, '_blank', 'noopener,noreferrer');
    }
  };

  // Get featured restaurant - either selected one or first one
  // Get featured restaurant - either selected one or first one. 
  // If Near By is active, we force the first result (which is nearest).
  const featuredRestaurant = filterNearby ? filteredRestaurants.length > 0 ? filteredRestaurants[0] : null : selectedRestaurantId ? filteredRestaurants.find(r => r.id === selectedRestaurantId) || filteredRestaurants[0] : filteredRestaurants[0] || null;
  const moreRestaurants = filteredRestaurants.filter(r => r.id !== featuredRestaurant?.id);
  const handleRestaurantClick = (restaurant: any) => {
    // Prepare data for popup
    const primaryBranch = restaurant.branches?.[0] || restaurants.find(r => r.id === restaurant.id)?.branches?.[0];
    setSelectedRestaurantData({
      id: restaurant.id,
      name: language === "en" && restaurant.name_en ? restaurant.name_en : restaurant.name,
      image_url: restaurant.image,
      cuisine: restaurant.cuisine,
      phone: restaurant.phone,
      website: restaurant.website,
      mapsUrl: primaryBranch?.google_maps_url || restaurant.mapsUrl || null,
      latitude: primaryBranch?.latitude || restaurant.latitude,
      longitude: primaryBranch?.longitude || restaurant.longitude,
      address: primaryBranch?.address || restaurant.address,
      deliveryApps: restaurant.deliveryApps
    });
    setShowRestaurantDetail(true);
  };
  return <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header with Primary Color like Admin Panel */}
      <header className="sticky top-0 z-40 bg-primary/95 backdrop-blur-sm shadow-md my-0 mx-0 px-px mb-px mr-0 pr-[12px] pb-0 pl-[7px]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            {language === "ar" ? <ArrowRight className="w-5 h-5 text-white flex-shrink-0 border-none mx-0 mb-[2px]" /> : <ArrowLeft className="w-5 h-5 text-white flex-shrink-0" />}
          </button>

          <h1 className="font-bold text-lg text-white text-center py-0 px-0 my-0 mx-0">{t("نتيجة الاختيار", "Choice Result")}</h1>

          <ViewToggle view={viewMode} onChange={setViewMode} />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">


        {/* Hero Emoji */}
        <div className="text-center mb-6 pt-4">
          {emojiParam ? <span className="text-6xl">{emojiParam}</span> : cuisines.length > 0 ? <span className="text-6xl">{getCuisineDisplay(category).emoji}</span> : <span className="text-6xl animate-pulse opacity-50">🍽️</span>}

          {/* Cuisine Name Badge */}
          <div className="mt-3">
            <span className="inline-flex items-center justify-center px-6 py-2 bg-card border-2 border-border rounded-full text-lg font-bold shadow-soft">
              {categoryDisplay}
            </span>
          </div>
        </div>

        {/* Filters - Hide in Map View */}
        {viewMode === "list" && <div className="flex items-center gap-2 mb-8">
            <button onClick={() => setFilterNearby(!filterNearby)} className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-full text-sm font-medium transition-all leading-none ${filterNearby ? "bg-primary text-primary-foreground shadow-soft" : "bg-card text-foreground border border-border"}`}>
              <span>{t("الأقرب", "Nearby")}</span>
              <span>📍</span>
            </button>
            <button onClick={() => setFilterNewest(!filterNewest)} className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-full text-sm font-medium transition-all leading-none ${filterNewest ? "bg-primary text-primary-foreground shadow-soft" : "bg-card text-foreground border border-border"}`}>
              <span>{t("الأحدث", "Newest")}</span>
              <span>⏰</span>
            </button>
          </div>}

        {/* Results Content */}
        {isLoading ? <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div> : filteredRestaurants.length === 0 ? <div className="text-center py-20">
            <p className="text-muted-foreground">{t("لا توجد مطاعم متاحة حالياً", "No restaurants available currently")}</p>
          </div> : <AnimatePresence mode="wait">
            {viewMode === "map" ? <motion.div key="map" initial={{
          opacity: 0,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} exit={{
          opacity: 0,
          scale: 0.95
        }}>
                <GoogleMapView restaurants={filteredRestaurants} userLocation={userLat && userLon ? {
            lat: userLat,
            lng: userLon
          } : null} category={category} />
              </motion.div> : <motion.div key="list" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} className="space-y-6">
                {/* Featured Restaurant - Inline Display */}
                {featuredRestaurant && <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} className="relative">
                    {/* Featured Image Card */}
                    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-primary/20 to-primary/5 p-4">
                      {/* Main Image */}
                      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4">
                        <img src={featuredRestaurant.image} alt={language === "en" && featuredRestaurant.name_en ? featuredRestaurant.name_en : featuredRestaurant.name} className="w-full h-full object-cover" />

                        {/* Ad Badge - Inside Image - Hide when using nearby filter */}
                        {!filterNearby && <div className="absolute top-3 right-3">
                            <span className="inline-flex items-center justify-center px-3 py-1 bg-accent text-accent-foreground text-xs font-bold rounded-full shadow-soft">
                              {t("إعلان مدفوع", "Sponsored")}
                            </span>
                          </div>}

                        {/* Favorite Button - Inside Image */}
                        <button onClick={e => {
                  e.stopPropagation();
                  toggleFavorite(featuredRestaurant);
                }} className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-soft">
                          <Heart className={`w-5 h-5 transition-colors ${savedRestaurantIds.includes(featuredRestaurant.name) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                        </button>

                        {/* Rating Badge */}
                        <div className="absolute bottom-3 left-3 inline-flex items-center justify-center gap-1 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft">
                          <Star className="w-4 h-4 fill-accent text-accent" />
                          <span className="text-sm font-bold leading-none pt-0.5">{featuredRestaurant.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Restaurant Info Row - Name/Cuisine on Right, Actions on Left */}
                      <div className="flex items-center justify-between gap-3 mb-4 bg-card rounded-2xl p-4 shadow-soft">
                        {/* Right Side - Name & Cuisine */}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-0.5">
                            {language === "en" && featuredRestaurant.name_en ? featuredRestaurant.name_en : featuredRestaurant.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {getCuisineDisplay(featuredRestaurant.cuisine).emoji} {getCuisineDisplay(featuredRestaurant.cuisine).name}
                          </p>
                        </div>

                        {/* Left Side - Phone & Location Icons */}
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleMapClick(featuredRestaurant)} className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-primary" />
                          </button>
                          {featuredRestaurant.phone && <a href={`tel:${featuredRestaurant.phone}`} className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                              <Phone className="w-5 h-5 text-primary" />
                            </a>}
                        </div>
                      </div>

                      {/* Delivery Apps Section */}
                      {featuredRestaurant.deliveryApps.length > 0 && <div className="bg-card rounded-2xl p-4 shadow-soft">
                          <p className="text-xs text-muted-foreground text-center mb-3 font-bold">
                            {t("اطلب الآن عبر التطبيقات", "Order now via apps")}
                          </p>
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {featuredRestaurant.deliveryApps.map(app => <button key={app.name} onClick={() => {
                    if (app.url) {
                      window.open(app.url, '_blank', 'noopener,noreferrer');
                    }
                  }} className="inline-flex items-center justify-center px-4 h-8 rounded-full text-sm font-extrabold border-2 bg-white transition-transform hover:scale-105 leading-none" style={{
                    borderColor: app.color,
                    color: app.color
                  }}>
                                {app.name}
                              </button>)}
                          </div>
                        </div>}
                    </div>
                  </motion.div>}

                {/* More Restaurants Section */}
                {moreRestaurants.length > 0 && <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{t("المزيد", "More")}</h3>
                      <span className="text-sm text-muted-foreground">
                        {moreRestaurants.length} {t("مطعم", "restaurants")}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {moreRestaurants.map((restaurant, index) => <motion.div key={restaurant.id} initial={{
                opacity: 0,
                y: 10
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: index * 0.05
              }}>
                          <CompactRestaurantCard name={language === "en" && restaurant.name_en ? restaurant.name_en : restaurant.name} cuisine={`${getCuisineDisplay(restaurant.cuisine).emoji} ${getCuisineDisplay(restaurant.cuisine).name}`} image={restaurant.image} rating={restaurant.rating} distance={restaurant.distance} deliveryApps={restaurant.deliveryApps} isFavorite={savedRestaurantIds.includes(restaurant.name)} onFavoriteClick={() => toggleFavorite(restaurant)} onMapClick={() => handleMapClick(restaurant)} onClick={() => handleRestaurantClick(restaurant)} />
                        </motion.div>)}
                    </div>
                  </div>}
              </motion.div>}
          </AnimatePresence>}
      </main>

      <BottomNav />

      <GuestSignInPrompt isOpen={showGuestPrompt} onClose={() => setShowGuestPrompt(false)} />

      <UnifiedRestaurantDetail isOpen={showRestaurantDetail} onClose={() => {
      setShowRestaurantDetail(false);
      setSelectedRestaurantData(null);
    }} restaurant={selectedRestaurantData} />
    </div>;
};
export default Results;