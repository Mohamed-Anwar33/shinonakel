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

    // Filter restaurants that have valid coordinates
    const validRestaurants = restaurants.filter(r =>
        r.branches &&
        r.branches.some((b: any) => b.latitude && b.longitude)
    );

    // flatten branches to show all locations
    const markers = validRestaurants.flatMap(r =>
        r.branches
            .filter((b: any) => b.latitude && b.longitude)
            .map((b: any) => ({
                ...b,
                restaurantName: r.name,
                restaurantImage: r.image_url,
                cuisine: r.cuisine,
                rating: r.ratings && r.ratings.length > 0
                    ? r.ratings.reduce((acc: number, curr: any) => acc + curr.rating, 0) / r.ratings.length
                    : null
            }))
    );

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
                            onClick={() => setSelectedRestaurant(branch)}
                        >
                            <Pin background={"#ea580c"} borderColor={"#c2410c"} glyphColor={"#fff"} />
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
