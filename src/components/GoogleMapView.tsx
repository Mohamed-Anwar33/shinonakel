import { useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { MapPin, Navigation, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleMapViewProps {
    restaurants: any[];
    userLocation: { lat: number; lng: number } | null;
    category: string;
}

const GoogleMapView = ({ restaurants, userLocation, category }: GoogleMapViewProps) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);

    // Default center (Kuwait City)
    const defaultCenter = { lat: 29.3759, lng: 47.9774 };

    // Generate markers from either branches or the restaurant's main location
    // Restaurants without coordinates get a generated position around Kuwait City
    const generateFallbackPosition = (index: number, total: number) => {
        // Spread restaurants without coords in a circle around Kuwait City
        const centerLat = 29.3759;
        const centerLng = 47.9774;
        const radius = 0.03; // ~3km radius spread
        const angle = (index / Math.max(total, 1)) * 2 * Math.PI;
        return {
            lat: centerLat + radius * Math.cos(angle),
            lng: centerLng + radius * Math.sin(angle)
        };
    };

    // First pass: collect all restaurants and identify which need fallback positions
    const restaurantsWithoutCoords: any[] = [];
    const markersWithCoords: any[] = [];

    restaurants.forEach(r => {
        const validBranches = r.branches?.filter((b: any) => b.latitude && b.longitude) || [];

        if (validBranches.length > 0) {
            validBranches.forEach((b: any) => {
                markersWithCoords.push({
                    ...b,
                    restaurantName: r.name,
                    restaurantImage: r.image || r.image_url,
                    cuisine: r.cuisine,
                    rating: r.ratings && r.ratings.length > 0
                        ? r.ratings.reduce((acc: number, curr: any) => acc + curr.rating, 0) / r.ratings.length
                        : null,
                    hasRealCoords: true
                });
            });
        } else if (r.latitude && r.longitude) {
            markersWithCoords.push({
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
            });
        } else {
            restaurantsWithoutCoords.push({
                id: r.id,
                restaurantName: r.name,
                restaurantImage: r.image || r.image_url,
                cuisine: r.cuisine,
                rating: r.ratings && r.ratings.length > 0
                    ? r.ratings.reduce((acc: number, curr: any) => acc + curr.rating, 0) / r.ratings.length
                    : (r.rating || null),
                hasRealCoords: false
            });
        }
    });

    // Generate fallback positions for restaurants without coordinates
    const markersWithFallback = restaurantsWithoutCoords.map((r, index) => {
        const fallbackPos = generateFallbackPosition(index, restaurantsWithoutCoords.length);
        return {
            ...r,
            latitude: fallbackPos.lat,
            longitude: fallbackPos.lng
        };
    });

    // Combine all markers
    const allMarkers = [...markersWithCoords, ...markersWithFallback];

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
                <Map
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
                                    branch.hasRealCoords ? 'border-white bg-white' : 'border-orange-400 bg-orange-50'
                                }`}>
                                    {branch.restaurantImage ? (
                                        <img
                                            src={branch.restaurantImage}
                                            alt={branch.restaurantName}
                                            className={`w-full h-full object-cover ${!branch.hasRealCoords ? 'opacity-80' : ''}`}
                                        />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${
                                            branch.hasRealCoords ? 'bg-primary text-white' : 'bg-orange-400 text-white'
                                        }`}>
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                    )}
                                    {/* Search indicator for restaurants without real coords */}
                                    {!branch.hasRealCoords && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <Navigation className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className={`w-3 h-3 rotate-45 -mt-2 shadow-sm z-0 ${
                                    branch.hasRealCoords ? 'bg-white' : 'bg-orange-400'
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
                </Map>

                {/* Info Overlay */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-center text-sm flex items-center gap-2 z-10">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                        {category === "الكل" ? "جميع المطاعم" : `مطاعم ${category}`} ({allMarkers.length})
                    </span>
                </div>

                {/* Legend for markers without real coordinates */}
                {markersWithFallback.length > 0 && (
                    <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 z-10 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-orange-400 bg-orange-50"></div>
                        <span className="text-xs text-muted-foreground">
                            موقع تقريبي ({markersWithFallback.length})
                        </span>
                    </div>
                )}
            </div>
        </APIProvider>
    );
};

export default GoogleMapView;
