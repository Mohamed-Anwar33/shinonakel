import { useState, useCallback, useRef } from "react";

interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  placeId: string;
  types: string[];
  isPhysicalLocation: boolean;
  mapsUrl: string; // Auto-generated Google Maps URL
}

// Physical restaurant indicators - ONLY these types are allowed
const PHYSICAL_LOCATION_TYPES = [
  "restaurant",
  "food",
  "cafe",
  "bakery",
  "bar",
  "meal_takeaway",
];

// Cloud kitchen / delivery-only / invalid indicators
const EXCLUDED_TYPES = [
  "storage",
  "warehouse",
  "establishment", // too generic without food types
  "point_of_interest", // too generic
  "locality",
  "political",
  "route",
  "neighborhood",
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

      // Use English name first (more accurate), then Arabic
      const searchName = restaurantNameEn || restaurantName;
      
      // STRICT: Use exact restaurant name with quotes for precise matching
      const query = encodeURIComponent(`"${searchName}" restaurant Kuwait`);
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}&language=en&region=kw`
      );

      if (!response.ok) {
        throw new Error("Geocoding request failed");
      }

      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        // STRICT MATCHING: Find result that EXACTLY matches the restaurant name
        const searchLower = searchName.toLowerCase().trim();
        const searchWords = searchLower.split(/\s+/).filter((w: string) => w.length > 2);
        
        const bestResult = data.results.find((result: any) => {
          const formattedAddress = result.formatted_address?.toLowerCase() || '';
          const types = result.types || [];
          
          // Must be a physical food establishment
          const isFoodEstablishment = types.some((t: string) => 
            PHYSICAL_LOCATION_TYPES.includes(t)
          );
          
          if (!isFoodEstablishment) return false;
          
          // Check if the result contains significant words from restaurant name
          const matchCount = searchWords.filter((word: string) => 
            formattedAddress.includes(word)
          ).length;
          
          // Require at least 50% word match for exact matching
          return matchCount >= Math.ceil(searchWords.length * 0.5);
        });

        if (!bestResult) {
          console.log(`STRICT MATCH FAILED for: ${searchName} - No exact match found`);
          cacheRef.current.set(cacheKey, null);
          return null;
        }

        const location = bestResult.geometry.location;
        const types = bestResult.types || [];
        
        // Double-check: Reject if it has excluded types without being a food place
        const hasExcludedType = types.some((t: string) => 
          EXCLUDED_TYPES.includes(t)
        );
        const hasFoodType = types.some((t: string) => 
          PHYSICAL_LOCATION_TYPES.includes(t)
        );
        
        if (hasExcludedType && !hasFoodType) {
          console.log(`Excluding ${searchName}: has excluded type without food type`);
          cacheRef.current.set(cacheKey, null);
          return null;
        }

        // Check if the location is within Kuwait bounds
        const isInKuwait = location.lat >= 28.5 && location.lat <= 30.1 &&
                          location.lng >= 46.5 && location.lng <= 48.5;

        if (!isInKuwait) {
          console.log(`Excluding ${searchName}: not in Kuwait`);
          cacheRef.current.set(cacheKey, null);
          return null;
        }

        // Generate Google Maps URL from the found place
        const generatedMapsUrl = `https://www.google.com/maps/place/?q=place_id:${bestResult.place_id}`;

        const geocodingResult: GeocodingResult = {
          lat: location.lat,
          lng: location.lng,
          displayName: bestResult.formatted_address,
          placeId: bestResult.place_id,
          types,
          isPhysicalLocation: true,
          mapsUrl: generatedMapsUrl,
        };

        console.log(`✓ STRICT MATCH SUCCESS for: ${searchName}`);
        cacheRef.current.set(cacheKey, geocodingResult);
        return geocodingResult;
      }

      // No results found
      console.log(`No geocoding results for: ${searchName}`);
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
      
      // Only include if it's a verified physical location with strict matching
      if (result && result.isPhysicalLocation) {
        results.set(restaurant.id, result);
      }
      
      // Rate limiting: 150ms between requests
      await new Promise(resolve => setTimeout(resolve, 150));
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
