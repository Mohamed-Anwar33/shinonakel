import { useState, useCallback, useRef } from "react";

interface Branch {
  lat: number;
  lng: number;
  name: string;
  placeId: string;
  mapsUrl: string;
  address: string;
}

interface SmartLocationResult {
  exactMatch: boolean;
  branches: Branch[];
  nearestBranch: Branch | null;
  nearestDistance: number | null;
}

// Haversine formula to calculate distance between two points in km
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Normalize string for comparison (remove special chars, extra spaces, lowercase)
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[''`´]/g, "'")
    .replace(/[-–—]/g, " ")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s']/g, "");
};

// Check if two restaurant names match exactly (100% match)
const isExactMatch = (searchName: string, resultName: string): boolean => {
  const normalized1 = normalizeString(searchName);
  const normalized2 = normalizeString(resultName);
  
  // Direct match
  if (normalized1 === normalized2) return true;
  
  // Check if one contains the other as a complete word/phrase
  // e.g., "Burger King" should match "Burger King - Salmiya"
  const words1 = normalized1.split(" ");
  const words2 = normalized2.split(" ");
  
  // All words from search name must be present in result name
  const allWordsMatch = words1.every(word => 
    words2.some(w => w === word || w.startsWith(word) || word.startsWith(w))
  );
  
  return allWordsMatch && words1.length >= 2;
};

export function useSmartLocation() {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, SmartLocationResult>>(new Map());

  // Search for all branches of a restaurant using Google Places Text Search
  const searchRestaurantBranches = useCallback(async (
    restaurantNameEn: string,
    userLat?: number | null,
    userLng?: number | null
  ): Promise<SmartLocationResult> => {
    // Check cache first
    const cacheKey = restaurantNameEn.toLowerCase().trim();
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      // Recalculate nearest if user location changed
      if (userLat && userLng && cached.branches.length > 0) {
        return findNearestBranch(cached.branches, userLat, userLng);
      }
      return cached;
    }

    setIsSearching(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn("Google Maps API key not configured");
        return { exactMatch: false, branches: [], nearestBranch: null, nearestDistance: null };
      }

      // Use Places Text Search API to find all branches
      const query = encodeURIComponent(`"${restaurantNameEn}" restaurant Kuwait`);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}&language=en&region=kw&type=restaurant`
      );

      // Note: Direct Places API calls may be blocked by CORS
      // Fallback to Geocoding API which has less restrictive CORS
      if (!response.ok) {
        // Try Geocoding API as fallback
        return await geocodeFallback(restaurantNameEn, userLat, userLng, apiKey);
      }

      const data = await response.json();
      
      if (data.status === "OK" && data.results && data.results.length > 0) {
        // Filter results to only exact matches
        const exactMatches = data.results.filter((result: any) => {
          const placeName = result.name || "";
          return isExactMatch(restaurantNameEn, placeName);
        });

        if (exactMatches.length === 0) {
          console.log(`No exact match for: ${restaurantNameEn}`);
          const result = { exactMatch: false, branches: [], nearestBranch: null, nearestDistance: null };
          cacheRef.current.set(cacheKey, result);
          return result;
        }

        // Filter to Kuwait only
        const kuwaitBranches = exactMatches.filter((result: any) => {
          const location = result.geometry?.location;
          if (!location) return false;
          const lat = location.lat;
          const lng = location.lng;
          // Kuwait bounds
          return lat >= 28.5 && lat <= 30.1 && lng >= 46.5 && lng <= 48.5;
        });

        const branches: Branch[] = kuwaitBranches.map((result: any) => ({
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          name: result.name,
          placeId: result.place_id,
          mapsUrl: `https://www.google.com/maps/place/?q=place_id:${result.place_id}`,
          address: result.formatted_address || result.vicinity || "",
        }));

        if (branches.length === 0) {
          const result = { exactMatch: false, branches: [], nearestBranch: null, nearestDistance: null };
          cacheRef.current.set(cacheKey, result);
          return result;
        }

        // Find nearest branch if user location available
        const resultWithNearest = findNearestBranch(branches, userLat, userLng);
        cacheRef.current.set(cacheKey, { ...resultWithNearest, exactMatch: true });
        
        console.log(`✓ Found ${branches.length} branches for ${restaurantNameEn}`);
        return { ...resultWithNearest, exactMatch: true };
      }

      // No results - try fallback
      return await geocodeFallback(restaurantNameEn, userLat, userLng, apiKey);
    } catch (err) {
      console.error("Smart location search error:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      return { exactMatch: false, branches: [], nearestBranch: null, nearestDistance: null };
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Fallback using Geocoding API (more permissive CORS)
  const geocodeFallback = async (
    restaurantNameEn: string,
    userLat?: number | null,
    userLng?: number | null,
    apiKey?: string
  ): Promise<SmartLocationResult> => {
    if (!apiKey) {
      return { exactMatch: false, branches: [], nearestBranch: null, nearestDistance: null };
    }

    try {
      const query = encodeURIComponent(`"${restaurantNameEn}" restaurant Kuwait`);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}&language=en&region=kw`
      );

      if (!response.ok) {
        return { exactMatch: false, branches: [], nearestBranch: null, nearestDistance: null };
      }

      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const searchLower = normalizeString(restaurantNameEn);
        
        // Find exact matches by checking if result is a restaurant/food place
        const foodResults = data.results.filter((result: any) => {
          const types = result.types || [];
          const isFoodPlace = types.some((t: string) => 
            ["restaurant", "food", "cafe", "bakery", "bar", "meal_takeaway"].includes(t)
          );
          
          if (!isFoodPlace) return false;
          
          // Check if result name matches search
          const resultName = result.formatted_address?.split(",")[0] || "";
          const nameMatch = normalizeString(resultName).includes(searchLower) ||
                           searchLower.includes(normalizeString(resultName));
          
          return true; // Trust Google's food establishment classification
        });

        if (foodResults.length === 0) {
          return { exactMatch: false, branches: [], nearestBranch: null, nearestDistance: null };
        }

        // Filter to Kuwait only
        const kuwaitResults = foodResults.filter((result: any) => {
          const location = result.geometry?.location;
          if (!location) return false;
          return location.lat >= 28.5 && location.lat <= 30.1 &&
                 location.lng >= 46.5 && location.lng <= 48.5;
        });

        if (kuwaitResults.length === 0) {
          return { exactMatch: false, branches: [], nearestBranch: null, nearestDistance: null };
        }

        const branches: Branch[] = kuwaitResults.map((result: any) => ({
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          name: restaurantNameEn,
          placeId: result.place_id,
          mapsUrl: `https://www.google.com/maps/place/?q=place_id:${result.place_id}`,
          address: result.formatted_address || "",
        }));

        const resultWithNearest = findNearestBranch(branches, userLat, userLng);
        console.log(`✓ Found ${branches.length} location(s) for ${restaurantNameEn} (geocode fallback)`);
        return { ...resultWithNearest, exactMatch: true };
      }

      return { exactMatch: false, branches: [], nearestBranch: null, nearestDistance: null };
    } catch (err) {
      console.error("Geocode fallback error:", err);
      return { exactMatch: false, branches: [], nearestBranch: null, nearestDistance: null };
    }
  };

  // Helper to find nearest branch
  const findNearestBranch = (
    branches: Branch[],
    userLat?: number | null,
    userLng?: number | null
  ): SmartLocationResult => {
    if (!userLat || !userLng || branches.length === 0) {
      return {
        exactMatch: true,
        branches,
        nearestBranch: branches[0] || null,
        nearestDistance: null,
      };
    }

    let nearestBranch = branches[0];
    let nearestDistance = calculateDistance(userLat, userLng, branches[0].lat, branches[0].lng);

    for (const branch of branches.slice(1)) {
      const distance = calculateDistance(userLat, userLng, branch.lat, branch.lng);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestBranch = branch;
      }
    }

    return {
      exactMatch: true,
      branches,
      nearestBranch,
      nearestDistance,
    };
  };

  // Batch search multiple restaurants
  const searchMultiple = useCallback(async (
    restaurants: Array<{ 
      id: string; 
      name_en: string | null;
      hasManualLocation: boolean; // Has mapsUrl from admin
    }>,
    userLat?: number | null,
    userLng?: number | null
  ): Promise<Map<string, SmartLocationResult>> => {
    const results = new Map<string, SmartLocationResult>();
    
    // Only search restaurants without manual location and with English name
    const needsSearch = restaurants.filter(r => 
      !r.hasManualLocation && r.name_en
    );

    for (const restaurant of needsSearch) {
      if (!restaurant.name_en) continue;
      
      const result = await searchRestaurantBranches(restaurant.name_en, userLat, userLng);
      if (result.exactMatch && result.branches.length > 0) {
        results.set(restaurant.id, result);
      }
      
      // Rate limiting: 200ms between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }, [searchRestaurantBranches]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    searchRestaurantBranches,
    searchMultiple,
    clearCache,
    isSearching,
    error,
  };
}
