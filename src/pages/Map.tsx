import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import LeafletMapView from "@/components/LeafletMapView";
import UnifiedRestaurantDetail from "@/components/UnifiedRestaurantDetail";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import restaurant1 from "@/assets/restaurant-1.jpg";

interface Restaurant {
    id: string;
    name: string;
    name_en?: string | null;
    image: string;
    rating: number;
    distance: string;
    cuisine: string;
    latitude: number | null;
    longitude: number | null;
    phone?: string | null;
    address?: string | null;
    mapsUrl?: string | null;
}

const Map = () => {
    const navigate = useNavigate();
    const { language, t } = useLanguage();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [showRestaurantDetail, setShowRestaurantDetail] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
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

    const fetchRestaurants = async () => {
        setIsLoading(true);
        try {
            // Fetch all restaurant branches with coordinates
            const { data: branches, error } = await supabase
                .from("restaurant_branches")
                .select(`
          id,
          restaurant_id,
          latitude,
          longitude,
          address,
          google_maps_url,
          restaurants (
            id,
            name,
            name_en,
            image_url,
            cuisine,
            phone
          )
        `)
                .not("latitude", "is", null)
                .not("longitude", "is", null);

            if (error) throw error;

            // Get ratings for all restaurants
            const restaurantIds = [...new Set(branches?.map(b => b.restaurant_id) || [])];
            const ratingsPromises = restaurantIds.map(id =>
                supabase.rpc("get_restaurant_avg_rating", { restaurant_uuid: id })
            );
            const ratingsResults = await Promise.all(ratingsPromises);

            // Map branches to restaurant format
            const mappedRestaurants: Restaurant[] = (branches || []).map((branch, index) => ({
                id: branch.restaurant_id,
                name: branch.restaurants.name,
                name_en: branch.restaurants.name_en,
                image: branch.restaurants.image_url || restaurant1,
                rating: ratingsResults[restaurantIds.indexOf(branch.restaurant_id)]?.data || 0,
                distance: "", // Calculate distance if userLocation is available
                cuisine: branch.restaurants.cuisine,
                latitude: branch.latitude,
                longitude: branch.longitude,
                phone: branch.restaurants.phone,
                address: branch.address,
                mapsUrl: branch.google_maps_url,
            }));

            setRestaurants(mappedRestaurants);
        } catch (error) {
            console.error("Error fetching restaurants:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestaurantClick = (restaurant: Restaurant) => {
        setSelectedRestaurant(restaurant);
        setShowRestaurantDetail(true);
    };

    return (
        <div className="min-h-screen bg-background pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
            <Header />

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Page Title */}
                <div className="flex items-center justify-center gap-3 mb-6">
                    <MapPin className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold text-center">
                        {t("خريطة المطاعم", "Restaurants Map")}
                    </h1>
                </div>

                {/* Map Container */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-[500px] bg-muted rounded-2xl">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="h-[calc(100vh-250px)] min-h-[400px]">
                        <LeafletMapView
                            restaurants={restaurants}
                            userLocation={userLocation}
                            onRestaurantClick={handleRestaurantClick}
                        />
                    </div>
                )}

                {/* Stats */}
                <div className="mt-4 text-center text-sm text-muted-foreground">
                    {t(
                        `عرض ${restaurants.length} مطعم على الخريطة`,
                        `Showing ${restaurants.length} restaurants on map`
                    )}
                </div>
            </main>

            <BottomNav />

            {/* Restaurant Detail Modal */}
            <UnifiedRestaurantDetail
                isOpen={showRestaurantDetail}
                onClose={() => setShowRestaurantDetail(false)}
                restaurant={selectedRestaurant ? {
                    id: selectedRestaurant.id,
                    name: language === "en" && selectedRestaurant.name_en ? selectedRestaurant.name_en : selectedRestaurant.name,
                    image_url: selectedRestaurant.image,
                    cuisine: selectedRestaurant.cuisine,
                    rating: selectedRestaurant.rating,
                    phone: selectedRestaurant.phone,
                    address: selectedRestaurant.address,
                    latitude: selectedRestaurant.latitude,
                    longitude: selectedRestaurant.longitude,
                    mapsUrl: selectedRestaurant.mapsUrl,
                } : null}
            />
        </div>
    );
};

export default Map;
