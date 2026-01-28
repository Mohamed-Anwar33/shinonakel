import { useState, useCallback, useRef } from "react";

interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  placeId: string;
  types: string[];
  isPhysicalLocation: boolean;
}

// Cloud kitchen / delivery-only indicators
const DELIVERY_ONLY_TYPES = [
  "storage",
  "warehouse",
  "establishment", // generic, might be cloud kitchen
  "point_of_interest", // too generic
];

const PHYSICAL_LOCATION_TYPES = [
  "restaurant",
  "food",
  "cafe",
  "bakery",
  "bar",
  "meal_delivery", // has physical location for pickup
  "meal_takeaway",
];

export function useGoogleGeocoding() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, GeocodingResult | null>>(new Map());

  const geocodeRestaurant = useCallback(async (
    restaurantName: string,
    restaurantNameEn?: string | null
  ): Promise<GeocodingResult | null> => {
    // Check cache first
    const cacheKey = `${restaurantName}-${restaurantNameEn || ''}`;
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey) || null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn("Google Maps API key not configured");
        return null;
      }

      // Try English name first (more accurate), then Arabic
      const searchName = restaurantNameEn || restaurantName;
      const query = encodeURIComponent(`${searchName} restaurant Kuwait`);
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}&language=en&region=kw`
      );

      if (!response.ok) {
        throw new Error("Geocoding request failed");
      }

      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        const types = result.types || [];
        
        // Check if this is a physical location (not a cloud kitchen)
        const isPhysicalLocation = types.some((t: string) => 
          PHYSICAL_LOCATION_TYPES.includes(t)
        ) || !types.some((t: string) => 
          DELIVERY_ONLY_TYPES.includes(t) && !PHYSICAL_LOCATION_TYPES.some(pt => types.includes(pt))
        );

        // Also check if the location is within Kuwait bounds
        const isInKuwait = location.lat >= 28.5 && location.lat <= 30.1 &&
                          location.lng >= 46.5 && location.lng <= 48.5;

        if (!isInKuwait) {
          cacheRef.current.set(cacheKey, null);
          return null;
        }

        const geocodingResult: GeocodingResult = {
          lat: location.lat,
          lng: location.lng,
          displayName: result.formatted_address,
          placeId: result.place_id,
          types,
          isPhysicalLocation,
        };

        cacheRef.current.set(cacheKey, geocodingResult);
        return geocodingResult;
      }

      // No results found
      cacheRef.current.set(cacheKey, null);
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geocoding failed");
      cacheRef.current.set(cacheKey, null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const geocodeMultiple = useCallback(async (
    restaurants: Array<{ 
      id: string; 
      name: string; 
      name_en?: string | null;
      latitude: number | null;
      longitude: number | null;
    }>
  ): Promise<Map<string, GeocodingResult>> => {
    const results = new Map<string, GeocodingResult>();
    
    // Only geocode restaurants without coordinates
    const needsGeocoding = restaurants.filter(r => 
      r.latitude == null || r.longitude == null
    );

    // Process with delay to respect API rate limits
    for (const restaurant of needsGeocoding) {
      const result = await geocodeRestaurant(restaurant.name, restaurant.name_en);
      
      if (result && result.isPhysicalLocation) {
        results.set(restaurant.id, result);
      }
      
      // Rate limiting: 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }, [geocodeRestaurant]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    geocodeRestaurant,
    geocodeMultiple,
    clearCache,
    isLoading,
    error,
  };
}
