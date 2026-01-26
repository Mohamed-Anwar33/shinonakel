import { useState, useEffect, useRef } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { MapPin, Navigation, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleMapViewProps {
    restaurants: any[];
    userLocation: { lat: number; lng: number } | null;
    category: string;
}

// Cache for geocoded coordinates - using object instead of Map to avoid naming conflict
const geocodeCache: Record<string, { lat: number; lng: number } | null> = {};

const GoogleMapView = ({ restaurants, userLocation, category }: GoogleMapViewProps) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
    const [geocodedMarkers, setGeocodedMarkers] = useState<Record<string, { lat: number; lng: number }>>({});
    const [isGeocoding, setIsGeocoding] = useState(false);
    const geocodingInProgress = useRef(false);

    // Default center (Kuwait City)
    const defaultCenter = { lat: 29.3759, lng: 47.9774 };

    // Geocode restaurant using Google Maps Geocoding API
    const geocodeWithGoogle = async (name: string): Promise<{ lat: number; lng: number } | null> => {
        const cacheKey = name;
        if (cacheKey in geocodeCache) {
            return geocodeCache[cacheKey];
        }

        try {
            const query = encodeURIComponent(`${name} restaurant Kuwait`);
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}&region=kw`
            );

            if (!response.ok) {
                geocodeCache[cacheKey] = null;
                return null;
            }

            const data = await response.json();

            if (data.status === "OK" && data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                const result = { lat: location.lat, lng: location.lng };
                geocodeCache[cacheKey] = result;
                return result;
            }

            geocodeCache[cacheKey] = null;
            return null;
        } catch (err) {
            console.error("Google Geocoding error for", name, err);
            geocodeCache[cacheKey] = null;
            return null;
        }
    };

    // Geocode restaurants without coordinates
    useEffect(() => {
        if (!apiKey || geocodingInProgress.current) return;

        const restaurantsNeedingGeocode = restaurants.filter(r => {
            const hasBranchCoords = r.branches?.some((b: any) => b.latitude && b.longitude);
            const hasDirectCoords = r.latitude && r.longitude;
            return !hasBranchCoords && !hasDirectCoords && !(r.id in geocodedMarkers);
        });

        if (restaurantsNeedingGeocode.length === 0) return;

        geocodingInProgress.current = true;
        setIsGeocoding(true);

        const geocodeAll = async () => {
            const newCoords = { ...geocodedMarkers };

            for (const restaurant of restaurantsNeedingGeocode) {
                const searchName = restaurant.name_en || restaurant.name;
                const result = await geocodeWithGoogle(searchName);
                
                if (result) {
                    newCoords[restaurant.id] = result;
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            setGeocodedMarkers(newCoords);
            geocodingInProgress.current = false;
            setIsGeocoding(false);
        };

        geocodeAll();
    }, [restaurants, apiKey, geocodedMarkers]);

    // Generate markers from database coords, direct coords, or geocoded coords
    const allMarkers = restaurants.flatMap(r => {
        const validBranches = r.branches?.filter((b: any) => b.latitude && b.longitude) || [];

        if (validBranches.length > 0) {
            return validBranches.map((b: any) => ({
                ...b,
                restaurantName: r.name,
                restaurantImage: r.image || r.image_url,
                cuisine: r.cuisine,
                rating: r.ratings && r.ratings.length > 0
                    ? r.ratings.reduce((acc: number, curr: any) => acc + curr.rating, 0) / r.ratings.length
                    : null,
                hasRealCoords: true
            }));
        } else if (r.latitude && r.longitude) {
            return [{
                id: r.id,
                latitude: r.latitude,
                longitude: r.longitude,
                restaurantName: r.name,
                restaurantImage: r.image || r.image_url,
                cuisine: r.cuisine,
                rating: r.ratings && r.ratings.length > 0
                    ? r.ratings.reduce((acc: number, curr: any) => acc + curr.rating, 0) / r.ratings.length
                    : (r.rating || null),
                google_maps_url: r.mapsUrl,
                hasRealCoords: true
            }];
        } else {
            // Check if we have geocoded coordinates
            const geocoded = geocodedMarkers[r.id];
            if (geocoded) {
                return [{
                    id: r.id,
                    latitude: geocoded.lat,
                    longitude: geocoded.lng,
                    restaurantName: r.name,
                    restaurantImage: r.image || r.image_url,
                    cuisine: r.cuisine,
                    rating: r.ratings && r.ratings.length > 0
                        ? r.ratings.reduce((acc: number, curr: any) => acc + curr.rating, 0) / r.ratings.length
                        : (r.rating || null),
                    google_maps_url: null,
                    hasRealCoords: false // Geocoded from Google
                }];
            }
            return [];
        }
    });

    // Count geocoded markers (without real DB coords)
    const geocodedCount = allMarkers.filter(m => !m.hasRealCoords).length;

    if (!apiKey) {
        return (
            <div className="w-full h-[600px] bg-muted flex items-center justify-center rounded-2xl">
                <p className="text-muted-foreground">Google Maps API Key Missing</p>
            </div>
        );
    }

    return (
        <APIProvider apiKey={apiKey}>
            <div className="relative w-full h-[600px] rounded-2xl overflow-hidden shadow-elevated bg-card">
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

                    {/* All Restaurant Markers */}
                    {allMarkers.map((branch, index) => (
                        <AdvancedMarker
                            key={`${branch.id}-${index}`}
                            position={{ lat: branch.latitude, lng: branch.longitude }}
                            onClick={() => {
                                if (branch.hasRealCoords) {
                                    const url = branch.google_maps_url ||
                                        `https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`;
                                    window.open(url, '_blank', 'noopener,noreferrer');
                                } else {
                                    // No real coordinates - open Google Maps search
                                    const searchQuery = encodeURIComponent(`${branch.restaurantName} Kuwait`);
                                    window.open(`https://www.google.com/maps/search/${searchQuery}`, '_blank', 'noopener,noreferrer');
                                }
                            }}
                            className="cursor-pointer hover:z-50"
                        >
                            <div className="relative flex flex-col items-center group transition-transform hover:scale-110">
                                <div className={`relative w-12 h-12 rounded-full border-[3px] shadow-elevated overflow-hidden z-10 ${
                                    branch.hasRealCoords ? 'border-white bg-white' : 'border-blue-400 bg-blue-50'
                                }`}>
                                    {branch.restaurantImage ? (
                                        <img
                                            src={branch.restaurantImage}
                                            alt={branch.restaurantName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${
                                            branch.hasRealCoords ? 'bg-primary text-white' : 'bg-blue-500 text-white'
                                        }`}>
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                                <div className={`w-3 h-3 rotate-45 -mt-2 shadow-sm z-0 ${
                                    branch.hasRealCoords ? 'bg-white' : 'bg-blue-400'
                                }`}></div>

                                {/* Rating Badge */}
                                {branch.rating && (
                                    <div className="absolute -top-2 -right-2 bg-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm border border-gray-100 z-20">
                                        <Star className="w-2 h-2 fill-amber-500 text-amber-500" />
                                        <span className="text-[8px] font-bold text-gray-800">{branch.rating.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                        </AdvancedMarker>
                    ))}

                    {/* Info Window */}
                    {selectedRestaurant && (
                        <InfoWindow
                            position={{ lat: selectedRestaurant.latitude, lng: selectedRestaurant.longitude }}
                            onCloseClick={() => setSelectedRestaurant(null)}
                            headerContent={
                                <div className="font-bold text-sm">
                                    {selectedRestaurant.restaurantName}
                                </div>
                            }
                        >
                            <div className="p-2 min-w-[200px]">
                                {selectedRestaurant.restaurantImage && (
                                    <img
                                        src={selectedRestaurant.restaurantImage}
                                        alt={selectedRestaurant.restaurantName}
                                        className="w-full h-24 object-cover rounded-md mb-2"
                                    />
                                )}
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        {selectedRestaurant.cuisine}
                                    </span>
                                    {selectedRestaurant.rating && (
                                        <div className="flex items-center gap-0.5 text-amber-500">
                                            <Star className="w-3 h-3 fill-current" />
                                            <span className="text-xs font-bold">{selectedRestaurant.rating.toFixed(1)}</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                    {selectedRestaurant.branch_name || selectedRestaurant.address}
                                </p>
                                <Button
                                    size="sm"
                                    className="w-full h-7 text-xs gap-1"
                                    onClick={() => {
                                        const url = selectedRestaurant.google_maps_url ||
                                            `https://www.google.com/maps/search/?api=1&query=${selectedRestaurant.latitude},${selectedRestaurant.longitude}`;
                                        window.open(url, '_blank');
                                    }}
                                >
                                    <Navigation className="w-3 h-3" />
                                    Google Maps
                                </Button>
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>

                {/* Info Overlay */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-center text-sm flex items-center gap-2 z-10">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                        {category === "الكل" ? "جميع المطاعم" : `مطاعم ${category}`} ({allMarkers.length})
                    </span>
                    {isGeocoding && (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                </div>

                {/* Legend for geocoded markers */}
                {geocodedCount > 0 && (
                    <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 z-10 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-blue-400 bg-blue-50"></div>
                        <span className="text-xs text-muted-foreground">
                            تم البحث عن الموقع ({geocodedCount})
                        </span>
                    </div>
                )}
            </div>
        </APIProvider>
    );
};

export default GoogleMapView;
