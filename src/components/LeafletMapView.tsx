import { useEffect, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

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
  phone?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  isGeocoded?: boolean;
}

interface LeafletMapViewProps {
  restaurants: Restaurant[];
  userLocation?: { lat: number; lng: number } | null;
  onRestaurantClick?: (restaurant: Restaurant) => void;
  enableClustering?: boolean;
}

// Kuwait center coordinates
const KUWAIT_CENTER: L.LatLngExpression = [29.3759, 47.9774];

function LeafletMapView({ 
  restaurants, 
  userLocation, 
  onRestaurantClick,
  enableClustering = true 
}: LeafletMapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const validRestaurants = useMemo(
    () => restaurants.filter((r) => r.latitude != null && r.longitude != null),
    [restaurants]
  );

  // Create custom restaurant marker
  const createRestaurantIcon = useCallback((restaurant: Restaurant) => {
    const isGeocoded = restaurant.isGeocoded;
    
    return L.divIcon({
      className: "restaurant-marker-custom",
      html: `
        <div style="position: relative; cursor: pointer; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));">
          <div style="
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: 3px solid ${isGeocoded ? 'hsl(217, 91%, 60%)' : 'white'};
            box-shadow: 0 4px 14px rgba(0,0,0,0.25);
            overflow: hidden;
            background: white;
            position: relative;
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
            top: -4px;
            right: -4px;
            background: white;
            padding: 3px 7px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 3px;
            font-size: 11px;
            font-weight: bold;
            color: #333;
          ">
            <span style="color: #F59E0B;">★</span>
            <span>${restaurant.rating.toFixed(1)}</span>
          </div>
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 10px solid ${isGeocoded ? 'hsl(217, 91%, 60%)' : 'white'};
          "></div>
        </div>
      `,
      iconSize: [56, 70],
      iconAnchor: [28, 70],
      popupAnchor: [0, -70],
    });
  }, []);

  // Create user location marker
  const createUserIcon = useCallback(() => {
    return L.divIcon({
      className: "user-location-marker",
      html: `
        <div style="position: relative;">
          <div style="
            width: 20px;
            height: 20px;
            background: hsl(var(--primary));
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 10px hsl(var(--primary) / 0.5);
            animation: pulse 2s infinite;
          "></div>
          <div style="
            position: absolute;
            top: -5px;
            left: -5px;
            width: 30px;
            height: 30px;
            background: hsl(var(--primary) / 0.2);
            border-radius: 50%;
            animation: pulse-ring 2s infinite;
          "></div>
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(2); opacity: 0; }
          }
        </style>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  }, []);

  // Create cluster icon
  const createClusterIcon = useCallback((cluster: L.MarkerCluster) => {
    const count = cluster.getChildCount();
    let size = 'small';
    let diameter = 40;
    
    if (count >= 10 && count < 30) {
      size = 'medium';
      diameter = 50;
    } else if (count >= 30) {
      size = 'large';
      diameter = 60;
    }

    return L.divIcon({
      html: `
        <div style="
          width: ${diameter}px;
          height: ${diameter}px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${size === 'large' ? '16px' : size === 'medium' ? '14px' : '12px'};
          box-shadow: 0 4px 14px hsl(var(--primary) / 0.4);
          border: 3px solid white;
        ">
          ${count}
        </div>
      `,
      className: 'marker-cluster-custom',
      iconSize: L.point(diameter, diameter),
      iconAnchor: L.point(diameter / 2, diameter / 2),
    });
  }, []);

  // Initialize map only once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: KUWAIT_CENTER,
      zoom: 12,
      zoomControl: true,
    });

    // Use a cleaner map style
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Initialize cluster group
    if (enableClustering) {
      clusterGroupRef.current = L.markerClusterGroup({
        iconCreateFunction: createClusterIcon,
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 16,
      });
      mapRef.current.addLayer(clusterGroupRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [enableClustering, createClusterIcon]);

  // Update markers when restaurants or user location changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    if (clusterGroupRef.current) {
      clusterGroupRef.current.clearLayers();
    }

    // Remove old user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    const bounds: L.LatLngExpression[] = [];

    // Add user location marker
    if (userLocation) {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { 
        icon: createUserIcon(),
        zIndexOffset: 1000 
      }).addTo(mapRef.current);
      
      bounds.push([userLocation.lat, userLocation.lng]);
    }

    // Add restaurant markers
    validRestaurants.forEach((restaurant) => {
      if (restaurant.latitude == null || restaurant.longitude == null) return;

      const marker = L.marker([restaurant.latitude, restaurant.longitude], { 
        icon: createRestaurantIcon(restaurant) 
      });

      // Click handler - trigger bottom sheet
      marker.on('click', () => {
        onRestaurantClick?.(restaurant);
      });

      if (enableClustering && clusterGroupRef.current) {
        clusterGroupRef.current.addLayer(marker);
      } else {
        marker.addTo(mapRef.current!);
        markersRef.current.push(marker);
      }

      bounds.push([restaurant.latitude, restaurant.longitude]);
    });

    // Fit bounds if we have markers
    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression, {
        padding: [50, 50],
        maxZoom: 14
      });
    }
  }, [validRestaurants, userLocation, onRestaurantClick, createRestaurantIcon, createUserIcon, enableClustering]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-elevated">
      <div ref={mapContainerRef} className="w-full h-full" />

      {restaurants.length > 0 && validRestaurants.length === 0 && (
        <div className="absolute inset-x-3 top-3 z-[1100] rounded-xl border border-border bg-card/95 backdrop-blur-sm p-3 text-sm text-foreground shadow-soft">
          لا يمكن عرض المطاعم على الخريطة لأن المطاعم الحالية لا تحتوي إحداثيات (Latitude/Longitude).
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 backdrop-blur-sm rounded-lg p-2 shadow-soft text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
          <span>موقعك</span>
        </div>
        {validRestaurants.some(r => r.isGeocoded) && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white"></div>
            <span>موقع تقريبي</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeafletMapView;
