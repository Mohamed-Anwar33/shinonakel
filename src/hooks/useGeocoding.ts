import { useState, useCallback } from "react";

interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
}

export function useGeocoding() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeRestaurant = useCallback(async (
    restaurantName: string,
    country: string = "Kuwait"
  ): Promise<GeocodingResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Use Nominatim (OpenStreetMap's geocoding service)
      const query = encodeURIComponent(`${restaurantName}, ${country}`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=kw`,
        {
          headers: {
            "Accept-Language": "ar,en",
            "User-Agent": "ShiNoNakel-App/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Geocoding request failed");
      }

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          display_name: data[0].display_name,
        };
      }

      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geocoding failed");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const geocodeMultiple = useCallback(async (
    restaurants: Array<{ id: string; name: string; name_en?: string | null }>
  ): Promise<Map<string, GeocodingResult>> => {
    const results = new Map<string, GeocodingResult>();
    
    // Process sequentially to respect Nominatim rate limits (1 req/sec)
    for (const restaurant of restaurants) {
      // Try English name first (usually more accurate for geocoding)
      const searchName = restaurant.name_en || restaurant.name;
      const result = await geocodeRestaurant(searchName);
      
      if (result) {
        results.set(restaurant.id, result);
      }
      
      // Respect Nominatim's usage policy: max 1 request per second
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    return results;
  }, [geocodeRestaurant]);

  return {
    geocodeRestaurant,
    geocodeMultiple,
    isLoading,
    error,
  };
}
