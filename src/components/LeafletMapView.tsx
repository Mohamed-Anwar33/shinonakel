import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

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
}

interface LeafletMapViewProps {
  restaurants: Restaurant[];
  userLocation?: { lat: number; lng: number } | null;
  onRestaurantClick?: (restaurant: Restaurant) => void;
}

// Kuwait center coordinates
const KUWAIT_CENTER: L.LatLngExpression = [29.3759, 47.9774];

function LeafletMapView({ restaurants, userLocation, onRestaurantClick }: LeafletMapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const validRestaurants = useMemo(
    () => restaurants.filter((r) => r.latitude != null && r.longitude != null),
    [restaurants]
  );

  // Initialize map only once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: KUWAIT_CENTER,
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when restaurants or user location changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const bounds: L.LatLngExpression[] = [];

    // Add user location marker
    if (userLocation) {
      const userIcon = L.divIcon({
        className: "user-location-marker",
        html: `
          <div style="
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px hsl(var(--primary) / 0.35);
            border: 3px solid hsl(var(--background));
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="text-align: center; padding: 4px;">
            <p style="font-weight: bold; font-size: 14px; margin: 0;">موقعك الحالي</p>
            <p style="font-size: 12px; color: #666; margin: 0;">Your Location</p>
          </div>
        `);

      markersRef.current.push(userMarker);
      bounds.push([userLocation.lat, userLocation.lng]);
    }

    // Add restaurant markers
    validRestaurants.forEach((restaurant) => {
      if (restaurant.latitude == null || restaurant.longitude == null) return;

      const restaurantIcon = L.divIcon({
        className: "restaurant-marker-custom",
        html: `
          <div style="position: relative; cursor: pointer;">
            <div style="
              width: 50px;
              height: 50px;
              border-radius: 50%;
              border: 3px solid hsl(var(--background));
              box-shadow: 0 4px 12px rgba(0,0,0,0.25);
              overflow: hidden;
              background: hsl(var(--background));
            ">
              <img 
                src="${restaurant.image}" 
                alt="${restaurant.name}"
                style="width: 100%; height: 100%; object-fit: cover;"
                onerror="this.src='/placeholder.svg'"
              />
            </div>
            <div style="
              position: absolute;
              bottom: -6px;
              left: -6px;
              background: hsl(var(--background));
              padding: 2px 6px;
              border-radius: 10px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.15);
              display: flex;
              align-items: center;
              gap: 2px;
              font-size: 10px;
              font-weight: bold;
            ">
              <span style="color: hsl(var(--accent));">★</span>
              <span>${restaurant.rating.toFixed(1)}</span>
            </div>
          </div>
        `,
        iconSize: [50, 56],
        iconAnchor: [25, 28],
        popupAnchor: [0, -28],
      });

      const marker = L.marker([restaurant.latitude, restaurant.longitude], { icon: restaurantIcon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="min-width: 200px; max-width: 250px; font-family: system-ui;">
            <h3 style="font-weight: bold; font-size: 14px; margin: 0 0 6px 0; color: #000;">${restaurant.name}</h3>
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="gold" stroke="gold">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span style="font-weight: 600; font-size: 13px;">${restaurant.rating.toFixed(1)}</span>
            </div>
            <p style="font-size: 11px; color: #666; margin: 0 0 10px 0;">${restaurant.cuisine}</p>
            <button 
              onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}', '_blank')"
              style="
                width: 100%;
                padding: 8px 12px;
                background: linear-gradient(135deg, #4285F4, #34A853);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                transition: transform 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
              "
              onmouseover="this.style.transform='scale(1.05)'"
              onmouseout="this.style.transform='scale(1)'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              احصل على الاتجاهات
            </button>
          </div>
        `, {
          maxWidth: 250,
          className: 'custom-popup'
        });

      marker.on('click', () => {
        onRestaurantClick?.(restaurant);
      });

      markersRef.current.push(marker);
      bounds.push([restaurant.latitude, restaurant.longitude]);
    });

    // Fit bounds if we have markers
    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression, {
        padding: [50, 50],
        maxZoom: 14
      });
    }
  }, [validRestaurants, userLocation, onRestaurantClick]);

  return (
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden shadow-elevated">
      <div ref={mapContainerRef} className="w-full h-full" />

      {restaurants.length > 0 && validRestaurants.length === 0 && (
        <div className="absolute inset-x-3 top-3 z-[1100] rounded-xl border border-border bg-card/95 backdrop-blur-sm p-3 text-sm text-foreground shadow-soft">
          لا يمكن عرض المطاعم على الخريطة لأن المطاعم الحالية لا تحتوي إحداثيات (Latitude/Longitude).
        </div>
      )}

      {/* Map Attribution Overlay */}
      <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-card/80 backdrop-blur-sm px-2 py-1 rounded z-[1000]">
        📍 الكويت، الكويت
      </div>
    </div>
  );
}

export default LeafletMapView;
