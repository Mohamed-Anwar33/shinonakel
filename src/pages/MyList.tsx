import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Plus, Lock, Trash2, Star, MapPin, Search, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import UnifiedRestaurantDetail from "@/components/UnifiedRestaurantDetail";
import { getDeliveryAppColor } from "@/lib/deliveryApps";
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
}
interface RestaurantFromDB {
  id: string;
  name: string;
  cuisine: string;
  image_url: string | null;
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
  avgRating: number;
}
interface Cuisine {
  name: string;
  name_en: string | null;
  emoji: string;
}
const MyList = () => {
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
  const [restaurants, setRestaurants] = useState<SavedRestaurant[]>([]);
  const [restaurantsData, setRestaurantsData] = useState<Record<string, RestaurantFromDB>>({});
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantFromDB | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RestaurantFromDB[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const filteredRestaurants = useMemo(() => {
    if (!searchQuery.trim()) return restaurants;
    const query = searchQuery.toLowerCase();
    return restaurants.filter(r => r.name.toLowerCase().includes(query) || r.category?.toLowerCase().includes(query));
  }, [restaurants, searchQuery]);

  // Search restaurants from database
  useEffect(() => {
    const searchRestaurants = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const {
          data
        } = await supabase.from("restaurants").select("id, name, name_en, cuisine, image_url, phone, website").or(`name.ilike.%${searchQuery}%,name_en.ilike.%${searchQuery}%,cuisine.ilike.%${searchQuery}%`).limit(10);
        if (data && data.length > 0) {
          // Fetch branches and delivery apps for results
          const ids = data.map(r => r.id);
          const [branchesRes, appsRes] = await Promise.all([supabase.from("restaurant_branches").select("restaurant_id, latitude, longitude, address, google_maps_url").in("restaurant_id", ids), supabase.from("restaurant_delivery_apps").select("restaurant_id, app_name, app_url").in("restaurant_id", ids)]);
          const results: RestaurantFromDB[] = data.map(r => ({
            id: r.id,
            name: r.name,
            cuisine: r.cuisine,
            image_url: r.image_url,
            phone: r.phone,
            website: r.website,
            branches: (branchesRes.data || []).filter(b => b.restaurant_id === r.id).map(b => ({
              latitude: b.latitude,
              longitude: b.longitude,
              address: b.address,
              google_maps_url: b.google_maps_url
            })),
            deliveryApps: (appsRes.data || []).filter(a => a.restaurant_id === r.id).map(a => ({
              name: a.app_name,
              color: getDeliveryAppColor(a.app_name),
              url: a.app_url || undefined
            })),
            avgRating: 0
          }));
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    };
    const debounce = setTimeout(searchRestaurants, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);
  useEffect(() => {
    fetchCuisines();
  }, []);
  useEffect(() => {
    if (user) {
      fetchSavedRestaurants();
    } else {
      setIsLoading(false);
    }
  }, [user]);
  const fetchCuisines = async () => {
    const {
      data
    } = await supabase.from("cuisines").select("name, name_en, emoji").eq("is_active", true);
    setCuisines(data || []);
  };
  const getCuisineDisplay = (cuisineName: string | null) => {
    if (!cuisineName) return {
      emoji: "🍽️",
      name: ""
    };
    const cuisine = cuisines.find(c => c.name === cuisineName);
    const displayName = language === "en" && cuisine?.name_en ? cuisine.name_en : cuisineName;
    return {
      emoji: cuisine?.emoji || "🍽️",
      name: displayName
    };
  };
  const fetchSavedRestaurants = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("saved_restaurants").select("*").eq("user_id", user!.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setRestaurants(data || []);
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
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const {
        error
      } = await supabase.from("saved_restaurants").delete().eq("id", id);
      if (error) throw error;
      setRestaurants(prev => prev.filter(r => r.id !== id));
      toast({
        title: t("تم الحذف", "Deleted"),
        description: t("تم حذف المطعم من قائمتك", "Restaurant deleted from your list")
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
    const {
      data
    } = await supabase.from("restaurants").select("id, name, cuisine, image_url, phone, website").eq("name", restaurant.name).maybeSingle();
    if (data) {
      const [branchesRes, appsRes, ratingRes] = await Promise.all([supabase.from("restaurant_branches").select("latitude, longitude, address, google_maps_url").eq("restaurant_id", data.id), supabase.from("restaurant_delivery_apps").select("app_name, app_url").eq("restaurant_id", data.id), supabase.rpc("get_restaurant_avg_rating", {
        restaurant_uuid: data.id
      })]);
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
    const data = restaurantsData[restaurant.name];
    if (data?.branches?.[0]?.google_maps_url) {
      window.open(data.branches[0].google_maps_url, '_blank', 'noopener,noreferrer');
    } else if (data?.branches?.[0]?.latitude && data?.branches?.[0]?.longitude) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${data.branches[0].latitude},${data.branches[0].longitude}`, '_blank', 'noopener,noreferrer');
    }
  };
  if (isGuest || !user) {
    return <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pb-24">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center">
          <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">{t("سجّل دخولك", "Sign in")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("قم بتسجيل الدخول لحفظ مطاعمك المفضلة", "Sign in to save your favorite restaurants")}
          </p>
          <Button onClick={() => navigate("/welcome")} className="gap-2">
            {t("تسجيل الدخول", "Sign in")}
          </Button>
        </motion.div>
        <BottomNav />
      </div>;
  }
  return <div className="min-h-screen bg-background pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}>
              {language === "ar" ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
            </button>
            <h1 className="text-lg font-bold">{t("قائمتي", "My List")}</h1>
          </div>
          <span className="text-sm text-muted-foreground">
            {restaurants.length} {t("مطعم", "restaurants")}
          </span>
        </div>
        
        {/* Search Bar */}
        <div className="max-w-md mx-auto mt-3 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="text" placeholder={t("ابحث عن مطعم...", "Search for a restaurant...")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-9 pl-9" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>}
        </div>

        {/* Search Results Dropdown */}
        {searchQuery.length >= 2 && <div className="max-w-md mx-auto mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {isSearching ? <div className="p-4 text-center">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              </div> : searchResults.length > 0 ? <div className="max-h-64 overflow-y-auto">
                {searchResults.map(result => <button key={result.id} onClick={() => {
            setSelectedRestaurant(result);
            setShowDetail(true);
            setSearchQuery("");
          }} className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0">
                    {result.image_url ? <img src={result.image_url} alt={result.name} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">🍽️</div>}
                    <div className="flex-1 text-right">
                      <p className="font-medium text-sm">{result.name}</p>
                      <p className="text-xs text-muted-foreground">{getCuisineDisplay(result.cuisine).emoji} {getCuisineDisplay(result.cuisine).name}</p>
                    </div>
                  </button>)}
              </div> : <div className="p-4 text-center text-sm text-muted-foreground">
                {t("لا توجد نتائج", "No results found")}
              </div>}
          </div>}
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {isLoading ? <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div> : filteredRestaurants.length === 0 && searchQuery ? <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t("لا توجد نتائج لـ", "No results for")} "{searchQuery}"
            </p>
          </motion.div> : restaurants.length === 0 ? <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center py-12">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-bold mb-2">{t("قائمتك فارغة", "Your list is empty")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("أضف مطاعمك المفضلة هنا", "Add your favorite restaurants here")}
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              {t("استكشف المطاعم", "Explore restaurants")}
            </Button>
          </motion.div> : <div className="space-y-3">
            {filteredRestaurants.map((restaurant, index) => <motion.div key={restaurant.id} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: index * 0.05
        }} className="bg-card rounded-2xl overflow-hidden shadow-card cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => handleRestaurantClick(restaurant)} dir="rtl">
                <div className="flex">
                  {/* Image Section */}
                  <div className="relative w-28 h-28 shrink-0">
                    {restaurant.image_url ? <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-4xl">🍽️</span>
                      </div>}
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 p-3">
                    {/* Name */}
                    <h3 className="font-bold text-base leading-tight truncate mb-1">{restaurant.name}</h3>

                    {/* Cuisine with emoji */}
                    {restaurant.category && <p className="text-sm text-muted-foreground mb-2">
                        {getCuisineDisplay(restaurant.category).emoji} {getCuisineDisplay(restaurant.category).name}
                      </p>}

                    {/* Distance */}
                    {restaurant.distance && <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span>{restaurant.distance}</span>
                      </div>}

                    {/* Notes */}
                    {restaurant.notes && <p className="text-xs text-primary truncate">
                        🍽️ {restaurant.notes}
                      </p>}
                  </div>

                  {/* Action Buttons Column */}
                  <div className="flex flex-col items-center justify-between p-2">
                    {/* Rating */}
                    <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-lg">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold text-foreground font-mono">{(restaurant.rating || 0).toFixed(1)}</span>
                    </div>

                    {/* Map */}
                    <button onClick={e => handleMapClick(restaurant, e)} className="p-1">
                      <MapPin className="w-4 h-4 text-primary" />
                    </button>

                    {/* Delete */}
                    <button onClick={e => handleDelete(restaurant.id, e)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>)}
          </div>}
      </main>

      <BottomNav />

      <UnifiedRestaurantDetail isOpen={showDetail} onClose={() => setShowDetail(false)} restaurant={selectedRestaurant ? {
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
    } : null} isOwner={true} />
    </div>;
};
export default MyList;