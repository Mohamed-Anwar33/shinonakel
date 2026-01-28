
import { useState, useEffect } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker } from "@vis.gl/react-google-maps";
import { MapPin, Star } from "lucide-react";
import { isValidBranch } from "@/lib/locationUtils";
import { MapController } from "./MapController";

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

  // STRICT: Build branches ONLY from admin-entered data using shared validation
  useEffect(() => {
    const manualBranches: Branch[] = [];

    for (const restaurant of restaurants) {
      const branches = restaurant.branches || [];

      // Logic must MATCH Results.tsx identically
      if (branches.length > 0) {
        // Filter using shared helper
        const validBranches = branches.filter(isValidBranch);

        validBranches.forEach((branch: any, index: number) => {
          manualBranches.push({
            id: `${restaurant.id}-branch-${index}`,
            lat: Number(branch.latitude),
            lng: Number(branch.longitude),
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            restaurantImage: restaurant.image || restaurant.image_url,
            cuisine: restaurant.cuisine,
            rating: restaurant.rating || null,
            mapsUrl: branch.google_maps_url,
            address: branch.address || restaurant.address || "",
          });
        });

      } else {
        // Legacy fallback check - map to branch-like object to validate
        const legacyCandidate = {
          google_maps_url: restaurant.mapsUrl,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude
        };

        if (isValidBranch(legacyCandidate as any)) {
          manualBranches.push({
            id: `${restaurant.id}-manual`,
            lat: Number(restaurant.latitude),
            lng: Number(restaurant.longitude),
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
          defaultCenter={defaultCenter}
          defaultZoom={11}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
          mapId="DEMO_MAP_ID"
          className="w-full h-full"
        >
          {/* Controller to auto-fit bounds */}
          <MapController branches={branches} />

          {/* User Location Marker */}
          {userLocation && (
            <AdvancedMarker position={userLocation}>
              <div className="relative flex items-center justify-center">
                <span className="absolute w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75"></span>
                <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md z-10"></div>
              </div>
            </AdvancedMarker>
          )}

          {/* Restaurant Branch Markers */}
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
