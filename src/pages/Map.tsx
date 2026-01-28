import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin, Loader2, Filter, X } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import LeafletMapView from "@/components/LeafletMapView";
import { MapRestaurantSheet } from "@/components/MapRestaurantSheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleGeocoding } from "@/hooks/useGoogleGeocoding";
import { getDeliveryAppColor } from "@/lib/deliveryApps";
import restaurant1 from "@/assets/restaurant-1.jpg";
import { Button } from "@/components/ui/button";

interface DeliveryApp {
  name: string;
  color: string;
  url?: string | null;
}

interface Restaurant {
  id: string;
  name: string;
  name_en?: string | null;
  image: string;
  rating: number;
  distance: string;
  distanceNum?: number;
  cuisine: string;
  latitude: number | null;
  longitude: number | null;
  phone?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  website?: string | null;
  deliveryApps?: DeliveryApp[];
  isGeocoded?: boolean;
}

// Haversine formula to calculate distance between two points
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface Cuisine {
  name: string;
  name_en: string | null;
  emoji: string;
}

const Map = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language, t } = useLanguage();
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showRestaurantSheet, setShowRestaurantSheet] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const { geocodeMultiple } = useGoogleGeocoding();

  // Get filter from URL
  const categoryFilter = searchParams.get("category") || "الكل";
  const categoryEmoji = searchParams.get("emoji") || "🍽️";

  useEffect(() => {
    fetchCuisines();
    fetchRestaurants();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Location permission denied or error:", error);
        }
      );
    }
  };

  const fetchCuisines = async () => {
    try {
      const { data, error } = await supabase
        .from("cuisines")
        .select("name, name_en, emoji")
        .eq("is_active", true);

      if (error) throw error;
      setCuisines(data || []);
    } catch (error) {
      console.error("Error fetching cuisines:", error);
    }
  };

  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      // Fetch all restaurants with their branches and delivery apps
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from("restaurants")
        .select(`
          *,
          branches:restaurant_branches(*),
          delivery_apps:restaurant_delivery_apps(*)
        `)
        .order("created_at", { ascending: false });

      if (restaurantsError) throw restaurantsError;

      // Get ratings for all restaurants
      const restaurantIds = restaurantsData?.map(r => r.id) || [];
      const ratingsPromises = restaurantIds.map(id =>
        supabase.rpc("get_restaurant_avg_rating", { restaurant_uuid: id })
      );
      const ratingsResults = await Promise.all(ratingsPromises);

      // Map restaurants - prioritize branch coordinates
      const mappedRestaurants: Restaurant[] = (restaurantsData || []).map((restaurant, index) => {
        const branch = restaurant.branches?.[0];
        const lat = branch?.latitude ? Number(branch.latitude) : null;
        const lng = branch?.longitude ? Number(branch.longitude) : null;
        
        // Calculate distance if user location and restaurant location available
        let distanceText = "";
        let distanceNum: number | undefined;
        if (userLocation && lat && lng) {
          const dist = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
          distanceNum = dist;
          distanceText = dist < 1 ? `${Math.round(dist * 1000)} م` : `${dist.toFixed(1)} كم`;
        }
        
        return {
          id: restaurant.id,
          name: restaurant.name,
          name_en: restaurant.name_en,
          image: restaurant.image_url || restaurant1,
          rating: ratingsResults[index]?.data || 0,
          distance: distanceText,
          distanceNum,
          cuisine: restaurant.cuisine,
          latitude: lat,
          longitude: lng,
          phone: restaurant.phone,
          address: branch?.address || null,
          mapsUrl: branch?.google_maps_url || null,
          website: restaurant.website,
          deliveryApps: restaurant.delivery_apps?.map((app: any) => ({
            name: app.app_name,
            color: getDeliveryAppColor(app.app_name),
            url: app.app_url,
          })) || [],
          isGeocoded: false,
        };
      });

      setRestaurants(mappedRestaurants);

      // Geocode restaurants without coordinates
      const needsGeocoding = mappedRestaurants.filter(r => !r.latitude || !r.longitude);
      if (needsGeocoding.length > 0) {
        setIsGeocoding(true);
        try {
          const geocodedResults = await geocodeMultiple(needsGeocoding);
          
          // Update restaurants with geocoded coordinates
          setRestaurants(prev => prev.map(restaurant => {
            const geocoded = geocodedResults.get(restaurant.id);
            if (geocoded) {
              return {
                ...restaurant,
                latitude: geocoded.lat,
                longitude: geocoded.lng,
                isGeocoded: true,
              };
            }
            return restaurant;
          }));
        } catch (error) {
          console.error("Geocoding error:", error);
        } finally {
          setIsGeocoding(false);
        }
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter restaurants by category
  const filteredRestaurants = useMemo(() => {
    if (categoryFilter === "الكل" || categoryFilter === "All") {
      return restaurants;
    }

    return restaurants.filter(restaurant => {
      const cuisineName = restaurant.cuisine?.toLowerCase() || '';
      const filterName = categoryFilter.toLowerCase();
      return cuisineName.includes(filterName) || filterName.includes(cuisineName);
    });
  }, [restaurants, categoryFilter]);

  // Only show restaurants with valid coordinates
  const restaurantsWithCoordinates = useMemo(() => {
    return filteredRestaurants.filter(r => r.latitude != null && r.longitude != null);
  }, [filteredRestaurants]);

  const handleRestaurantClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowRestaurantSheet(true);
  };

  const handleCategoryChange = (cuisineName: string, emoji: string) => {
    if (cuisineName === "الكل") {
      searchParams.delete("category");
      searchParams.delete("emoji");
    } else {
      searchParams.set("category", cuisineName);
      searchParams.set("emoji", emoji);
    }
    setSearchParams(searchParams);
  };

  const clearFilter = () => {
    searchParams.delete("category");
    searchParams.delete("emoji");
    setSearchParams(searchParams);
  };

  const displayCategory = language === "en" 
    ? cuisines.find(c => c.name === categoryFilter)?.name_en || categoryFilter
    : categoryFilter;

  return (
    <div className="min-h-screen bg-background pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">
              {t("خريطة المطاعم", "Restaurants Map")}
            </h1>
          </div>
          
          {/* Active Filter Badge */}
          {categoryFilter !== "الكل" && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilter}
              className="flex items-center gap-2 rounded-full"
            >
              <span>{categoryEmoji}</span>
              <span>{displayCategory}</span>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
          {cuisines.map((cuisine) => {
            const isActive = categoryFilter === cuisine.name;
            const displayName = language === "en" && cuisine.name_en 
              ? cuisine.name_en 
              : cuisine.name;
              
            return (
              <button
                key={cuisine.name}
                onClick={() => handleCategoryChange(cuisine.name, cuisine.emoji)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-card text-foreground border border-border hover:border-primary/50"
                }`}
              >
                <span>{cuisine.emoji}</span>
                <span>{displayName}</span>
              </button>
            );
          })}
        </div>

        {/* Map Container */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] min-h-[400px] bg-muted rounded-2xl gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {t("جاري تحميل المطاعم...", "Loading restaurants...")}
            </p>
          </div>
        ) : (
          <div className="h-[calc(100vh-280px)] min-h-[400px] relative">
            <LeafletMapView
              restaurants={restaurantsWithCoordinates}
              userLocation={userLocation}
              onRestaurantClick={handleRestaurantClick}
              enableClustering={true}
            />
            
            {/* Geocoding Indicator */}
            {isGeocoding && (
              <div className="absolute top-3 right-3 z-[1100] bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-soft flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs">
                  {t("جاري البحث عن المواقع...", "Finding locations...")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {categoryFilter !== "الكل" ? (
            t(
              `عرض ${restaurantsWithCoordinates.length} مطعم ${displayCategory} على الخريطة`,
              `Showing ${restaurantsWithCoordinates.length} ${displayCategory} restaurants on map`
            )
          ) : (
            t(
              `عرض ${restaurantsWithCoordinates.length} مطعم على الخريطة`,
              `Showing ${restaurantsWithCoordinates.length} restaurants on map`
            )
          )}
          {filteredRestaurants.length > restaurantsWithCoordinates.length && (
            <span className="text-muted-foreground/60">
              {" "}
              ({t(
                `${filteredRestaurants.length - restaurantsWithCoordinates.length} بدون موقع`,
                `${filteredRestaurants.length - restaurantsWithCoordinates.length} without location`
              )})
            </span>
          )}
        </div>
      </main>

      <BottomNav />

      {/* Restaurant Detail Sheet */}
      <MapRestaurantSheet
        isOpen={showRestaurantSheet}
        onClose={() => setShowRestaurantSheet(false)}
        restaurant={selectedRestaurant}
      />
    </div>
  );
};

export default Map;
