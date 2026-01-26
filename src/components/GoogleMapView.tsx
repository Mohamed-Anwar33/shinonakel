import { MapPin } from "lucide-react";

interface GoogleMapViewProps {
    restaurants: any[];
    userLocation: { lat: number; lng: number } | null;
    category: string;
}

const GoogleMapView = ({ restaurants, userLocation, category }: GoogleMapViewProps) => {
    // Build Google Maps URL for iframe (no API key needed)
    const buildMapUrl = () => {
        // Search query based on category
        // Translate common categories to English for better map results if needed, or stick to Arabic if Google handles it well.
        // Google Maps usually handles Arabic well.
        const query = category === "الكل" ? "مطاعم الكويت" : `مطاعم ${category} الكويت`;

        if (userLocation) {
            // Center map on user location and search nearby
            return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=13&output=embed&center=${userLocation.lat},${userLocation.lng}`;
        }

        // Default to Kuwait
        return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=12&output=embed`;
    };

    return (
        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden shadow-elevated bg-card">
            <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={buildMapUrl()}
                className="w-full h-full"
                title="Google Maps"
            ></iframe>

            {/* Info overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-center text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">{category === "الكل" ? "جميع المطاعم" : `مطاعم ${category}`}</span>
            </div>
        </div>
    );
};

export default GoogleMapView;
