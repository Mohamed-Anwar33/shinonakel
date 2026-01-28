import { useState, useEffect, useRef } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker } from "@vis.gl/react-google-maps";
import { MapPin, Star, Loader2 } from "lucide-react";
import { useSmartLocation } from "@/hooks/useSmartLocation";

interface Branch {
  id: string;
  lat: number;
  lng: number;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  cuisine: string;
  rating: number | null;
  mapsUrl: string;
  address: string;
  isManual: boolean; // True if from admin-entered data
}

interface GoogleMapViewProps {
  restaurants: any[];
  userLocation: { lat: number; lng: number } | null;
  category: string;
}

const GoogleMapView = ({ restaurants, userLocation, category }: GoogleMapViewProps) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { searchMultiple } = useSmartLocation();
  const searchInProgress = useRef(false);

  // Default center (Kuwait City)
  const defaultCenter = { lat: 29.3759, lng: 47.9774 };

  // Build branches from database data
  useEffect(() => {
    const buildBranches = async () => {
      if (searchInProgress.current) return;
      
      const manualBranches: Branch[] = [];
      const restaurantsNeedingSearch: Array<{
        id: string;
        name_en: string | null;
        hasManualLocation: boolean;
        restaurantData: any;
      }> = [];

      // First pass: extract manual branches and identify restaurants needing search
      for (const restaurant of restaurants) {
        const hasManualMapsUrl = restaurant.mapsUrl && restaurant.mapsUrl.includes("google.com/maps");
        const hasManualCoords = restaurant.latitude != null && 
                                restaurant.longitude != null && 
                                !restaurant.isGeocoded;

        if (hasManualMapsUrl || hasManualCoords) {
          // Restaurant has manual location from admin
          manualBranches.push({
            id: `${restaurant.id}-manual`,
            lat: restaurant.latitude,
            lng: restaurant.longitude,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            restaurantImage: restaurant.image || restaurant.image_url,
            cuisine: restaurant.cuisine,
            rating: restaurant.rating || null,
            mapsUrl: restaurant.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`,
            address: restaurant.address || "",
            isManual: true,
          });
        } else if (restaurant.name_en) {
          // Restaurant has English name - candidate for auto-search
          restaurantsNeedingSearch.push({
            id: restaurant.id,
            name_en: restaurant.name_en,
            hasManualLocation: false,
            restaurantData: restaurant,
          });
        }
      }

      setAllBranches(manualBranches);

      // Second pass: auto-search for restaurants without manual location
      if (restaurantsNeedingSearch.length > 0 && apiKey) {
        searchInProgress.current = true;
        setIsSearching(true);

        try {
          const searchResults = await searchMultiple(
            restaurantsNeedingSearch,
            userLocation?.lat,
            userLocation?.lng
          );

          const autoBranches: Branch[] = [];
          
          searchResults.forEach((result, restaurantId) => {
            const restaurantData = restaurantsNeedingSearch.find(r => r.id === restaurantId)?.restaurantData;
            if (!restaurantData || !result.exactMatch) return;

            // Add all found branches as separate markers
            result.branches.forEach((branch, index) => {
              autoBranches.push({
                id: `${restaurantId}-auto-${index}`,
                lat: branch.lat,
                lng: branch.lng,
                restaurantId: restaurantId,
                restaurantName: restaurantData.name,
                restaurantImage: restaurantData.image || restaurantData.image_url,
                cuisine: restaurantData.cuisine,
                rating: restaurantData.rating || null,
                mapsUrl: branch.mapsUrl,
                address: branch.address,
                isManual: false,
              });
            });
          });

          setAllBranches(prev => [...prev, ...autoBranches]);
        } catch (error) {
          console.error("Auto-search error:", error);
        } finally {
          searchInProgress.current = false;
          setIsSearching(false);
        }
      }
    };

    buildBranches();
  }, [restaurants, userLocation, apiKey, searchMultiple]);

  // Handle marker click - open Google Maps directly
  const handleMarkerClick = (branch: Branch) => {
    window.open(branch.mapsUrl, '_blank', 'noopener,noreferrer');
  };

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center rounded-2xl">
        <p className="text-muted-foreground">Google Maps API Key Missing</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-elevated bg-card">
        <GoogleMap
          defaultCenter={userLocation || defaultCenter}
          defaultZoom={13}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
          mapId="DEMO_MAP_ID"
          className="w-full h-full"
        >
          {/* User Location Marker */}
          {userLocation && (
            <AdvancedMarker position={userLocation}>
              <div className="relative flex items-center justify-center">
                <span className="absolute w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75"></span>
                <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md z-10"></div>
              </div>
            </AdvancedMarker>
          )}

          {/* All Branch Markers */}
          {allBranches.map((branch) => (
            <AdvancedMarker
              key={branch.id}
              position={{ lat: branch.lat, lng: branch.lng }}
              onClick={() => handleMarkerClick(branch)}
              className="cursor-pointer hover:z-50"
            >
              <div className="relative flex flex-col items-center group transition-transform hover:scale-110">
                <div className={`relative w-12 h-12 rounded-full border-[3px] shadow-elevated overflow-hidden z-10 ${
                  branch.isManual ? 'border-white bg-white' : 'border-green-400 bg-green-50'
                }`}>
                  {branch.restaurantImage ? (
                    <img
                      src={branch.restaurantImage}
                      alt={branch.restaurantName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                      branch.isManual ? 'bg-primary text-white' : 'bg-green-500 text-white'
                    }`}>
                      <MapPin className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className={`w-3 h-3 rotate-45 -mt-2 shadow-sm z-0 ${
                  branch.isManual ? 'bg-white' : 'bg-green-400'
                }`}></div>

                {/* Rating Badge */}
                {branch.rating && branch.rating > 0 && (
                  <div className="absolute -top-2 -right-2 bg-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm border border-gray-100 z-20">
                    <Star className="w-2 h-2 fill-amber-500 text-amber-500" />
                    <span className="text-[8px] font-bold text-gray-800">{branch.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </AdvancedMarker>
          ))}
        </GoogleMap>

        {/* Info Overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-center text-sm flex items-center gap-2 z-10">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium">
            {category === "الكل" ? "جميع المطاعم" : `مطاعم ${category}`} ({allBranches.length})
          </span>
          {isSearching && (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}
        </div>

        {/* Legend for auto-discovered branches */}
        {allBranches.some(b => !b.isManual) && (
          <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 z-10 flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-green-400 bg-green-50"></div>
            <span className="text-xs text-muted-foreground">
              تم البحث تلقائياً ({allBranches.filter(b => !b.isManual).length})
            </span>
          </div>
        )}
      </div>
    </APIProvider>
  );
};

export default GoogleMapView;
