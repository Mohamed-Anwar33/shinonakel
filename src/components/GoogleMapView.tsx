import { useState, useEffect } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker } from "@vis.gl/react-google-maps";
import { MapPin, Star } from "lucide-react";

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
}

interface GoogleMapViewProps {
  restaurants: any[];
  userLocation: { lat: number; lng: number } | null;
  category: string;
}

const GoogleMapView = ({ restaurants, userLocation, category }: GoogleMapViewProps) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [branches, setBranches] = useState<Branch[]>([]);

  // Default center (Kuwait City)
  const defaultCenter = { lat: 29.3759, lng: 47.9774 };

  // Build branches ONLY from manually-entered database data (NO auto-search)
  useEffect(() => {
    const manualBranches: Branch[] = [];

    for (const restaurant of restaurants) {
      // STRICT: Only include if admin manually added mapsUrl
      // Accept all Google Maps URL formats
      const hasManualMapsUrl = restaurant.mapsUrl && (
        restaurant.mapsUrl.includes("google.com/maps") || 
        restaurant.mapsUrl.includes("maps.app.goo.gl") || 
        restaurant.mapsUrl.includes("maps.google.com") ||
        restaurant.mapsUrl.includes("goo.gl/maps")
      );
      if (hasManualMapsUrl && restaurant.latitude != null && restaurant.longitude != null) {
        manualBranches.push({
          id: `${restaurant.id}-manual`,
          lat: restaurant.latitude,
          lng: restaurant.longitude,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          restaurantImage: restaurant.image || restaurant.image_url,
          cuisine: restaurant.cuisine,
          rating: restaurant.rating || null,
          mapsUrl: restaurant.mapsUrl,
          address: restaurant.address || "",
        });
      }
    }

    setBranches(manualBranches);
  }, [restaurants]);

  // Handle marker click - open the manually-added Maps URL directly
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

          {/* Restaurant Branch Markers - ONLY manually-added locations */}
          {branches.map((branch) => (
            <AdvancedMarker
              key={branch.id}
              position={{ lat: branch.lat, lng: branch.lng }}
              onClick={() => handleMarkerClick(branch)}
              className="cursor-pointer hover:z-50"
            >
              <div className="relative flex flex-col items-center group transition-transform hover:scale-110">
                <div className="relative w-12 h-12 rounded-full border-[3px] border-white bg-white shadow-elevated overflow-hidden z-10">
                  {branch.restaurantImage ? (
                    <img
                      src={branch.restaurantImage}
                      alt={branch.restaurantName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center text-white">
                      <MapPin className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="w-3 h-3 bg-white rotate-45 -mt-2 shadow-sm z-0"></div>

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
            {category === "الكل" ? "جميع المطاعم" : `مطاعم ${category}`} ({branches.length})
          </span>
        </div>
      </div>
    </APIProvider>
  );
};

export default GoogleMapView;
