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
    const markers = restaurants.flatMap(r => {
        const validBranches = r.branches?.filter((b: any) => b.latitude && b.longitude) || [];

        if (validBranches.length > 0) {
            return validBranches.map((b: any) => ({
                ...b,
                restaurantName: r.name,
                restaurantImage: r.image || r.image_url,
                cuisine: r.cuisine,
                rating: r.ratings && r.ratings.length > 0
                    ? r.ratings.reduce((acc: number, curr: any) => acc + curr.rating, 0) / r.ratings.length
                    : null
            }));
        } else if (r.latitude && r.longitude) {
            // Fallback: Use the restaurant's direct coordinates (e.g. from geocoding in Results.tsx)
            return [{
                id: r.id,
                latitude: r.latitude,
                longitude: r.longitude,
                restaurantName: r.name,
                restaurantImage: r.image || r.image_url,
                cuisine: r.cuisine,
                rating: r.ratings && r.ratings.length > 0
                    ? r.ratings.reduce((acc: number, curr: any) => acc + curr.rating, 0) / r.ratings.length
                    : (r.rating || null), // r.rating might be pre-calculated in Results.tsx
                google_maps_url: r.mapsUrl // Use the calculated mapsUrl from Results.tsx if available
            }];
        }
        return [];
    });

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

                    {/* Restaurant Markers */}
                    {markers.map((branch, index) => (
                        <AdvancedMarker
                            key={`${branch.id}-${index}`}
                            position={{ lat: branch.latitude, lng: branch.longitude }}
                            onClick={() => {
                                const url = branch.google_maps_url ||
                                    `https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                            className="cursor-pointer hover:z-50"
                        >
                            <div className="relative flex flex-col items-center group transition-transform hover:scale-110">
                                <div className="relative w-12 h-12 rounded-full border-[3px] border-white shadow-elevated overflow-hidden bg-white z-10">
                                    {branch.restaurantImage ? (
                                        <img
                                            src={branch.restaurantImage}
                                            alt={branch.restaurantName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary text-white">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="w-3 h-3 bg-white rotate-45 -mt-2 shadow-sm z-0"></div>

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
                        {category === "الكل" ? "جميع المطاعم" : `مطاعم ${category}`} ({markers.length})
                    </span>
                </div>
            </div>
        </APIProvider>
    );
};

export default GoogleMapView;
