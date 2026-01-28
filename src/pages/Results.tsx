import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Star, Heart, Phone, MapPin, Globe, ChevronDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompactRestaurantCard from "@/components/CompactRestaurantCard";
import BottomNav from "@/components/BottomNav";
import GoogleMapView from "@/components/GoogleMapView";
import ViewToggle from "@/components/ViewToggle";
import GuestSignInPrompt from "@/components/GuestSignInPrompt";
import UnifiedRestaurantDetail from "@/components/UnifiedRestaurantDetail";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isValidBranch } from "@/lib/locationUtils";
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";
import { getDeliveryAppColor } from "@/lib/deliveryApps";

// NO AUTO-GEOCODING - Only manually-added locations are used
interface Restaurant {
  id: string;
  name: string;
  name_en: string | null;
  cuisine: string;
  cuisines?: string[]; // إضافة مصفوفة الفئات
  image_url: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
  branches?: {
    id: string;
    branch_name: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    google_maps_url: string | null;
  }[];
  delivery_apps?: {
    id: string;
    app_name: string;
    app_url: string | null;
  }[];
  ratings?: {
    id: string;
    rating: number;
    comment: string | null;
    user_id: string;
  }[];
}
interface Cuisine {
  name: string;
  name_en: string | null;
  emoji: string;
}
const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = searchParams.get("category") || "الكل";
  const emojiParam = searchParams.get("emoji");
  const {
    user,
    isGuest
  } = useAuth();
  const {
    language,
    t
  } = useLanguage();
  const {
    toast
  } = useToast();
  const {
    latitude: userLat,
    longitude: userLon,
    requestLocation,
    isLoading: isLoadingLocation,
    error: locationError,
    permissionDenied: locationPermissionDenied
  } = useGeolocation(true); // Enable watchPosition for real-time updates
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [savedRestaurantIds, setSavedRestaurantIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [filterNearby, setFilterNearby] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [showRestaurantDetail, setShowRestaurantDetail] = useState(false);
  const [selectedRestaurantData, setSelectedRestaurantData] = useState<any>(null);
  // REMOVED: No more auto-geocoding state needed
  const [pinnedAdRestaurantId, setPinnedAdRestaurantId] = useState<string | null>(null);
  const [pinnedAdId, setPinnedAdId] = useState<string | null>(null);
  const pinnedAdViewTrackedRef = useRef<Set<string>>(new Set());
  const pinnedCardRef = useRef<HTMLDivElement>(null);

  // State for pagination and shuffle
  const [visibleCount, setVisibleCount] = useState(10);
  const [shuffledOrder, setShuffledOrder] = useState<string[]>([]); // Stores restaurant IDs in shuffled order
  const shuffleKey = useRef<string>(""); // Track when to re-shuffle
  const loadMoreRef = useRef<HTMLDivElement>(null); // Ref for infinite scroll trigger
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Show location error if it occurs
  useEffect(() => {
    if (locationError && filterNearby) {
      toast({
        title: t("تعذر تحديد الموقع", "Location Error"),
        description: locationError,
        variant: "destructive"
      });
    }
  }, [locationError, filterNearby, t, toast]);
  // REMOVED: geocodingInProgress ref no longer needed
  useEffect(() => {
    fetchRestaurants();
    fetchCuisines();
    fetchPinnedAd();
  }, [category]);
  const fetchCuisines = async () => {
    const {
      data
    } = await supabase.from("cuisines").select("name, name_en, emoji").eq("is_active", true);
    setCuisines(data || []);
  };
  useEffect(() => {
    if (user && !isGuest) {
      fetchSavedRestaurants();
    }
  }, [user, isGuest]);
  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from("restaurants").select(`
          *,
          branches:restaurant_branches(*),
          delivery_apps:restaurant_delivery_apps(*),
          ratings:restaurant_ratings(*)
        `).eq("is_deleted", false).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Unified Click Handler for Analytics & ROI
  const handleUnifiedClick = async (
    restaurant: any,
    interactionType: string,
    targetUrl?: string | null,
    adId?: string
  ) => {
    // 1. Redirection (Immediate & Non-blocking)
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }

    // 2. Logging (Fire & Forget pattern)
    try {
      // A) Analytics Log
      const interactionData = {
        restaurant_id: restaurant.id,
        interaction_type: interactionType,
        user_id: user?.id || null,
        ad_id: adId || null
      };

      // Use a non-blocking promise to ensure UI is responsive
      // Note: Since we opened a new tab, this page remains active, so await is safe here.
      // We prioritize the insert to ensure accurate stats.
      const logPromise = supabase
        .from("restaurant_interactions")
        .insert(interactionData);

      // B) Ad Credit Consumption (ROI)
      let roiPromise = Promise.resolve();
      if (adId) {
        roiPromise = supabase.rpc("increment_ad_clicks", { ad_uuid: adId }) as any;
      }

      await Promise.all([logPromise, roiPromise]);

    } catch (error) {
      console.error("Error tracking click:", error);
      // Do not show error to user as action was successful (tab opened)
    }
  };

  const fetchPinnedAd = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // A) Determine placements
      // Normalize category/cuisine usage to match DB storage
      let cuisinePlacement = null;
      if (category !== "الكل") {
        const { data: cuisineData } = await supabase
          .from("cuisines")
          .select("name_en")
          .eq("name", category)
          .single();

        if (cuisineData?.name_en) {
          // Robust slug generation: replace non-alphanumeric with _, collapse _, lowercase
          const slug = cuisineData.name_en
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');

          cuisinePlacement = `pinned_ad_cuisine_${slug}`;
        }
      }

      const globalPlacement = "pinned_ad_all";

      // B) Query advertisements using strict eligibility filters
      const targetPlacements = cuisinePlacement ? [cuisinePlacement, globalPlacement] : [globalPlacement];

      const { data: ads, error } = await supabase
        .from("advertisements")
        .select("restaurant_id, id, placement, views_count, max_views, end_date")
        .in("placement", targetPlacements)
        .eq("is_active", true)
        .lte("start_date", today);

      if (error) throw error;

      // Filter candidates based on strict rules
      const validAds = (ads || []).filter(ad => {
        // Rule: views_count < max_views 
        // Strict Eligibility: max_views MUST be defined and > 0 to be valid for this system
        const hasViewsRemaining = ad.max_views && ad.max_views > 0 && (ad.views_count || 0) < ad.max_views;

        // Rule: end_date >= today OR end_date IS NULL
        const notExpiredByDate = !ad.end_date || ad.end_date >= today;

        return hasViewsRemaining && notExpiredByDate;
      });

      if (validAds.length === 0) {
        setPinnedAdRestaurantId(null);
        setPinnedAdId(null);
        return;
      }

      // C) Priority rule: Cuisine > Global
      let candidates = validAds;
      if (cuisinePlacement) {
        const cuisineAds = validAds.filter(ad => ad.placement === cuisinePlacement);
        if (cuisineAds.length > 0) {
          candidates = cuisineAds;
        } else {
          candidates = validAds.filter(ad => ad.placement === globalPlacement);
        }
      }

      if (candidates.length === 0) {
        setPinnedAdRestaurantId(null);
        setPinnedAdId(null);
        return;
      }

      // D) Randomization
      // Pick one at random per page load
      const picked = candidates[Math.floor(Math.random() * candidates.length)];

      // E) Immediate termination cleanup (Safety check)
      if (picked.end_date && picked.end_date < today) {
        await supabase.from("advertisements").update({ is_active: false }).eq("id", picked.id);
        setPinnedAdRestaurantId(null);
        setPinnedAdId(null);
        return;
      }

      setPinnedAdRestaurantId(picked.restaurant_id);
      setPinnedAdId(picked.id);

    } catch (error) {
      console.error("Error fetching pinned ad:", error);
    }
  };

  // 3) IntersectionObserver for impression tracking
  useEffect(() => {
    // Only proceed if ad ID exists AND the card is rendered (ref is current)
    // Map View GUARD: Do not track impressions if in Map View
    if (!pinnedAdId || !pinnedCardRef.current || viewMode !== "list") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            // Ad is visible!
            // Deduplication check
            if (pinnedAdViewTrackedRef.current.has(pinnedAdId)) {
              // Already tracked this ad ID this session
              // We can stop observing this specific element since it's "done"
              observer.unobserve(entry.target);
              return;
            }

            // Add to Set immediately
            pinnedAdViewTrackedRef.current.add(pinnedAdId);

            // Stop observing immediately after successful first impression logic trigger
            // to prevent repeated triggers during this mount
            observer.unobserve(entry.target);

            try {
              // Insert into ad_interactions
              await supabase.from("ad_interactions").insert({
                ad_id: pinnedAdId,
                interaction_type: "view",
                user_id: user?.id || null
              });

              // Call RPC
              await supabase.rpc("increment_ad_views", { ad_uuid: pinnedAdId });

              // After RPC, fetch latest values to check termination
              const { data: currentAd } = await supabase
                .from("advertisements")
                .select("views_count, max_views, end_date")
                .eq("id", pinnedAdId)
                .single();

              if (currentAd) {
                const today = new Date().toISOString().split('T')[0];

                // Check Mode A (Time + Views) & Mode B (Views only)
                const viewsExceeded = currentAd.max_views && (currentAd.views_count || 0) >= currentAd.max_views;
                const dateExpired = currentAd.end_date && currentAd.end_date < today;

                if (viewsExceeded || dateExpired) {
                  await supabase
                    .from("advertisements")
                    .update({ is_active: false })
                    .eq("id", pinnedAdId);
                }
              }
            } catch (error) {
              console.error("Error tracking pinned ad view:", error);
            }
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% visible
      }
    );

    observer.observe(pinnedCardRef.current);

    return () => {
      observer.disconnect();
    };
  }, [pinnedAdId, user, viewMode]); // Added viewMode dependency

  const fetchSavedRestaurants = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("saved_restaurants").select("name").eq("user_id", user!.id);
      if (!error && data) {
        setSavedRestaurantIds(data.map(r => r.name));
      }
    } catch (error) {
      console.error("Error fetching saved restaurants:", error);
    }
  };

  // Show location error if it occurs
  useEffect(() => {
    if (locationError && filterNearby) {
      toast({
        title: t("تعذر تحديد الموقع", "Location Error"),
        description: locationError,
        variant: "destructive"
      });
    }
  }, [locationError, filterNearby, t, toast]);

  // Helper: Check if a URL is a valid Google Maps URL
  const isValidMapsUrl = (url: string | null): boolean => {
    if (!url) return false;
    return url.includes("google.com/maps") ||
      url.includes("maps.app.goo.gl") ||
      url.includes("maps.google.com") ||
      url.includes("goo.gl/maps");
  };

  // STRICT LOCATION LOGIC - Only admin-added data, with Multi-Branch support
  const transformedRestaurants = useMemo(() => {
    return restaurants.map((r, index) => {
      const ratings = r.ratings || [];
      const avgRating = ratings.length > 0 ? Number((ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length).toFixed(1)) : 0;
      const ratingCount = ratings.length;

      // STRICT LOGIC: Only consider branches with valid URL AND Coordinates
      const branchesWithManualLocation = (r.branches || []).filter(isValidBranch);

      // Check if restaurant has any manual location
      const hasManualLocation = branchesWithManualLocation.length > 0;

      // MULTI-BRANCH LOGIC: Find the nearest branch if user location is available
      // Default to the first valid branch if no user location
      let nearestBranch = branchesWithManualLocation[0] || null;
      let distanceNum: number | null = null;
      let distanceText = "";

      if (hasManualLocation && userLat != null && userLon != null) {
        // Calculate distance to all VALID branches and find the nearest one
        let minDistance = Infinity;

        for (const branch of branchesWithManualLocation) {
          // strict check is already done by isValidBranch, but safely cast to number to prevent NaN
          const bLat = Number(branch.latitude);
          const bLon = Number(branch.longitude);

          const dist = calculateDistance(userLat, userLon, bLat, bLon);
          if (dist < minDistance) {
            minDistance = dist;
            nearestBranch = branch;
            distanceNum = dist;
          }
        }

        // Format distance text with strict rules
        if (distanceNum !== null) {
          if (distanceNum < 1) {
            // Less than 1km -> show meters rounded (e.g. "350 m")
            const meters = Math.round(distanceNum * 1000);
            distanceText = `${meters} ${t("م", "m")}`;
          } else {
            // 1km or more -> show km with 1 decimal (e.g. "3.5 km")
            distanceText = `${distanceNum.toFixed(1)} ${t("كم", "km")}`;
          }
        }
      }
      // NOTE: If location permission denied, distanceText stays empty (no display)

      // Fallback for Icon: If no "valid" branch (with coords) found, check if ANY branch has a URL
      // This satisfies Rule #3: Icon appears if mapsUrl exists, even if no distance
      const anyBranchWithUrl = (r.branches || []).find((b: any) => b.google_maps_url && b.google_maps_url.trim().length > 0);

      // Use nearest branch's data for display if valid, otherwise fallback to any URL-having branch
      const displayBranch = nearestBranch || anyBranchWithUrl || null;

      const address = displayBranch?.address || "";
      const mapsUrl = displayBranch?.google_maps_url || null;
      const branchLat = nearestBranch?.latitude || null; // Only verified data for these
      const branchLon = nearestBranch?.longitude || null;

      return {
        id: r.id,
        name: r.name,
        name_en: r.name_en,
        image: r.image_url || "/placeholder.svg",
        rating: avgRating,
        ratingCount,
        distance: distanceText,
        distanceNum,
        cuisine: r.cuisine,
        category: r.cuisine,
        isOpen: true,
        isSponsored: r.id === pinnedAdRestaurantId,
        adId: r.id === pinnedAdRestaurantId ? pinnedAdId : null,
        deliveryApps: (r.delivery_apps || []).map(app => ({
          name: app.app_name,
          color: getDeliveryAppColor(app.app_name),
          url: app.app_url
        })),
        isFavorite: savedRestaurantIds.includes(r.name),
        position: {
          top: `${15 + index * 20 % 70}%`,
          right: `${20 + index * 25 % 60}%`
        },
        latitude: branchLat,
        longitude: branchLon,
        createdAt: new Date(r.created_at || Date.now()),
        phone: r.phone,
        website: r.website,
        branches: r.branches,
        address,
        mapsUrl, // This is now the NEAREST branch's mapsUrl
        hasVerifiedLocation: hasManualLocation // Only true if admin added at least one mapsUrl
      };
    });
  }, [restaurants, savedRestaurantIds, userLat, userLon, t, pinnedAdRestaurantId, pinnedAdId]);
  // Fisher-Yates shuffle function
  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Pre-filter restaurants by category and newest filter
  const categoryFilteredRestaurants = useMemo(() => {
    let filtered = category === "الكل" ? [...transformedRestaurants] : transformedRestaurants.filter(r => {
      // البحث في الفئة الرئيسية
      if (r.cuisine === category) return true;

      // البحث في مصفوفة الفئات (cuisines array)
      const restaurant = restaurants.find(rest => rest.id === r.id);
      if (restaurant?.cuisines && Array.isArray(restaurant.cuisines)) {
        return restaurant.cuisines.includes(category);
      }
      return false;
    });
    return filtered;
  }, [category, transformedRestaurants, restaurants]);

  // Generate shuffle key based on filters to detect when to re-shuffle
  const currentShuffleKey = useMemo(() => {
    return `${category}-${filterNearby}`;
  }, [category, filterNearby]);

  // Shuffle restaurants when filters change or on initial load
  useEffect(() => {
    if (currentShuffleKey !== shuffleKey.current && categoryFilteredRestaurants.length > 0) {
      shuffleKey.current = currentShuffleKey;

      // Separate pinned ad from other restaurants
      const pinnedAd = categoryFilteredRestaurants.find(r => r.isSponsored);
      const otherRestaurants = categoryFilteredRestaurants.filter(r => !r.isSponsored);

      // Shuffle only non-pinned restaurants
      const shuffledIds = shuffleArray(otherRestaurants).map(r => r.id);

      // Pinned ad always first (if exists)
      const finalOrder = pinnedAd ? [pinnedAd.id, ...shuffledIds] : shuffledIds;

      setShuffledOrder(finalOrder);
      setVisibleCount(10); // Reset to first 10 when filters change
    }
  }, [currentShuffleKey, categoryFilteredRestaurants, shuffleArray]);

  // Apply sorting based on filters and shuffled order
  const filteredRestaurants = useMemo(() => {
    // If nearby filter is active, use deterministic sorting
    if (filterNearby) {
      return [...categoryFilteredRestaurants].sort((a, b) => {
        // Pinned ad always comes first
        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;

        const aDistance = a.distanceNum ?? Infinity;
        const bDistance = b.distanceNum ?? Infinity;
        if (aDistance !== bDistance) {
          return aDistance - bDistance;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    // Use shuffled order for random display
    if (shuffledOrder.length === 0) {
      return categoryFilteredRestaurants;
    }

    // Sort by shuffled order
    const orderMap = new Map(shuffledOrder.map((id, index) => [id, index]));
    return [...categoryFilteredRestaurants].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? Infinity;
      const orderB = orderMap.get(b.id) ?? Infinity;
      return orderA - orderB;
    });
  }, [categoryFilteredRestaurants, filterNearby, shuffledOrder]);

  // Visible restaurants based on pagination
  const visibleRestaurants = useMemo(() => {
    return filteredRestaurants.slice(0, visibleCount);
  }, [filteredRestaurants, visibleCount]);

  // Load more function with loading state
  const loadMore = useCallback(() => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    // Simulate slight delay for smooth UX
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 10, filteredRestaurants.length));
      setIsLoadingMore(false);
    }, 300);
  }, [filteredRestaurants.length, isLoadingMore]);

  // Remaining count
  const remainingCount = filteredRestaurants.length - visibleCount;

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && remainingCount > 0 && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [remainingCount, isLoadingMore, loadMore]);

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Show/hide scroll to top button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const getCuisineDisplay = (cuisineName: string) => {
    const cuisine = cuisines.find(c => c.name === cuisineName);
    const displayName = language === "en" && cuisine?.name_en ? cuisine.name_en : cuisineName;
    return {
      emoji: cuisine?.emoji || "🍽️",
      name: displayName
    };
  };
  const categoryDisplay = useMemo(() => {
    const cuisine = cuisines.find(c => c.name === category);
    return language === "en" && cuisine?.name_en ? cuisine.name_en : category;
  }, [category, cuisines, language]);
  // Request location on mount to ensure distance is shown if allowed
  useEffect(() => {
    if (!userLat && !userLon && !isLoadingLocation) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        requestLocation();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [userLat, userLon, isLoadingLocation, requestLocation]);

  // Re-request when switching to map view or enabling nearby filter
  useEffect(() => {
    if ((filterNearby || viewMode === "map") && !userLat && !userLon && !isLoadingLocation) {
      requestLocation();
    }
  }, [filterNearby, viewMode, userLat, userLon, isLoadingLocation, requestLocation]);
  const toggleFavorite = async (restaurant: any) => {
    if (!user || isGuest) {
      setShowGuestPrompt(true);
      return;
    }
    const isSaved = savedRestaurantIds.includes(restaurant.name);
    try {
      if (isSaved) {
        const {
          error
        } = await supabase.from("saved_restaurants").delete().eq("user_id", user.id).eq("name", restaurant.name);
        if (error) throw error;
        setSavedRestaurantIds(prev => prev.filter(name => name !== restaurant.name));
      } else {
        const {
          error
        } = await supabase.from("saved_restaurants").insert({
          user_id: user.id,
          name: restaurant.name,
          image_url: restaurant.image,
          rating: restaurant.rating,
          distance: restaurant.distance,
          category: restaurant.cuisine,
          address: restaurant.distance
        });
        if (error) throw error;
        setSavedRestaurantIds(prev => [...prev, restaurant.name]);
        /* toast({
          title: t("تم الحفظ", "Saved"),
          description: t("تم إضافة المطعم إلى قائمتك", "Restaurant added to your list")
        }); */
      }
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // REMOVED: handleRestaurantInteraction (replaced by handleUnifiedClick above)

  const handleDeliveryAppClick = async (restaurant: any, app: any) => {
    // Check if this restaurant is the currently displayed Pinned Ad to use the correct Ad ID
    // Note: transformedRestaurants usually don't carry adId unless from fetchPinnedAd,
    // but the `featuredRestaurant` DOES.
    // If clicking from "More Restaurants", they shouldn't have adId unless they are "Most Popular" (not yet implemented fully in Results)
    // or if `adId` is passed in the restaurant object.

    // Logic: If restaurant object has adId, use it.
    // If we are clicking the 'featuredRestaurant', it definitively has the pinned ad ID.
    const effectiveAdId = restaurant.adId;

    await handleUnifiedClick(
      restaurant,
      app.name.toLowerCase(),
      app.url || app.app_url,
      effectiveAdId
    );
  };

  const handleMapClick = (restaurant: any) => {
    // SMART LOCATION: Only navigate if location is verified
    if (!restaurant.hasVerifiedLocation) {
      return; // Don't open map for non-verified locations
    }

    let url = '';
    if (restaurant.mapsUrl) {
      url = restaurant.mapsUrl;
    } else if (restaurant.latitude && restaurant.longitude) {
      url = `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`;
    } else {
      return; // No valid location
    }

    const effectiveAdId = restaurant.adId;

    handleUnifiedClick(
      restaurant,
      'location',
      url,
      effectiveAdId
    );
  };

  // Get featured restaurant - ONLY show if there's an active pinned ad
  // If no pinned ad exists, all restaurants appear in the "More" list equally
  const hasPinnedAd = pinnedAdRestaurantId !== null;
  const pinnedAdRestaurant = hasPinnedAd ? visibleRestaurants.find(r => r.isSponsored) : null;

  // If there's a pinned ad, show it as featured; otherwise all go to moreRestaurants
  const featuredRestaurant = pinnedAdRestaurant;
  const moreRestaurants = hasPinnedAd
    ? visibleRestaurants.filter(r => r.id !== pinnedAdRestaurant?.id)
    : visibleRestaurants;
  const handleRestaurantClick = (restaurant: any) => {
    // Prepare data for popup
    const primaryBranch = restaurant.branches?.[0] || restaurants.find(r => r.id === restaurant.id)?.branches?.[0];
    setSelectedRestaurantData({
      id: restaurant.id,
      name: language === "en" && restaurant.name_en ? restaurant.name_en : restaurant.name,
      image_url: restaurant.image,
      cuisine: restaurant.cuisine,
      phone: restaurant.phone,
      website: restaurant.website,
      mapsUrl: primaryBranch?.google_maps_url || restaurant.mapsUrl || null,
      latitude: primaryBranch?.latitude || restaurant.latitude,
      longitude: primaryBranch?.longitude || restaurant.longitude,
      address: primaryBranch?.address || restaurant.address,
      deliveryApps: restaurant.deliveryApps,
      adId: restaurant.adId
    });
    setShowRestaurantDetail(true);
  };
  return <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
    {/* Header with Primary Color like Admin Panel */}
    <header className="sticky top-0 z-40 bg-primary/95 backdrop-blur-sm shadow-md my-0 mx-0 px-px mb-px mr-0 pr-[12px] pb-0 pl-[7px]">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
          {language === "ar" ? <ArrowRight className="w-5 h-5 text-white flex-shrink-0 border-none mx-0 mb-[2px]" /> : <ArrowLeft className="w-5 h-5 text-white flex-shrink-0" />}
        </button>

        <h1 className="font-bold text-lg text-white text-center py-0 px-0 my-0 mx-0">{t("نتيجة الاختيار", "Choice Result")}</h1>

        <ViewToggle view={viewMode} onChange={setViewMode} />
      </div>
    </header>

    <main className="max-w-md mx-auto px-4 pt-6">


      {/* Hero Emoji */}
      <div className="text-center mb-6 pt-4">
        {emojiParam ? <span className="text-6xl">{emojiParam}</span> : cuisines.length > 0 ? <span className="text-6xl">{getCuisineDisplay(category).emoji}</span> : <span className="text-6xl animate-pulse opacity-50">🍽️</span>}

        {/* Cuisine Name Badge */}
        <div className="mt-3">
          <span className="inline-flex items-center justify-center px-6 py-2 bg-card border-2 border-border rounded-full text-lg font-bold shadow-soft">
            {categoryDisplay}
          </span>
        </div>
      </div>

      {/* Filters - Hide in Map View */}
      {viewMode === "list" && <div className="flex items-center gap-2 mb-8">
        <button onClick={() => {
          if (!userLat || !userLon) {
            requestLocation();
          }
          setFilterNearby(!filterNearby);
        }} className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-full text-sm font-medium transition-all leading-none ${filterNearby ? "bg-primary text-primary-foreground shadow-soft" : "bg-card text-foreground border border-border"}`}>
          <span>{t("الأقرب", "Nearby")}</span>
          <span>📍</span>
        </button>
      </div>}

      {/* Results Content */}
      {isLoading ? <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div> : visibleRestaurants.length === 0 ? <div className="text-center py-20">
        <p className="text-muted-foreground">{t("لا توجد مطاعم متاحة حالياً", "No restaurants available currently")}</p>
      </div> : <AnimatePresence mode="wait">
        {viewMode === "map" ? <motion.div key="map" initial={{
          opacity: 0,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} exit={{
          opacity: 0,
          scale: 0.95
        }}>
          <GoogleMapView restaurants={filteredRestaurants} userLocation={userLat && userLon ? {
            lat: userLat,
            lng: userLon
          } : null} category={category} />
        </motion.div> : <motion.div key="list" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} className="space-y-6">
          {/* Featured Restaurant - Inline Display */}
          {featuredRestaurant && <motion.div ref={pinnedCardRef} initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} className="relative">
            {/* Featured Image Card */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-primary/20 to-primary/5 p-4">
              {/* Main Image */}
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4">
                <img src={featuredRestaurant.image} alt={language === "en" && featuredRestaurant.name_en ? featuredRestaurant.name_en : featuredRestaurant.name} className="w-full h-full object-cover" />

                {/* Ad Badge - Always show for pinned ad */}
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center justify-center bg-accent text-accent-foreground font-bold rounded-full shadow-soft py-[3px] px-[13px] text-center font-sans text-base">
                    {t("إعلان مثبت", "Pinned Ad")}
                  </span>
                </div>

                {/* Favorite Button - Inside Image */}
                <button onClick={e => {
                  e.stopPropagation();
                  toggleFavorite(featuredRestaurant);
                }} className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-soft">
                  <Heart className={`w-5 h-5 transition-colors ${savedRestaurantIds.includes(featuredRestaurant.name) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </button>

                {/* Rating Badge */}
                <div className="absolute bottom-3 left-3 inline-flex items-center justify-center gap-1 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft">
                  <Star className="w-4 h-4 fill-accent text-accent" />
                  <span className="text-sm font-bold leading-none pt-0.5 font-mono">{featuredRestaurant.rating.toFixed(1)}</span>
                  {featuredRestaurant.distance && (
                    <>
                      <span className="text-muted-foreground/50 mx-1">•</span>
                      <span className="text-xs font-medium text-muted-foreground" dir="ltr">{featuredRestaurant.distance}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Restaurant Info Row - Name/Cuisine on Right, Actions on Left */}
              <div className="flex items-center justify-between gap-3 mb-4 bg-card rounded-2xl p-4 shadow-soft">
                {/* Right Side - Name & Cuisine */}
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-0.5">
                    {language === "en" && featuredRestaurant.name_en ? featuredRestaurant.name_en : featuredRestaurant.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {getCuisineDisplay(featuredRestaurant.cuisine).emoji} {getCuisineDisplay(featuredRestaurant.cuisine).name}
                  </p>
                </div>

                {/* Left Side - Phone & Location Icons */}
                <div className="flex items-center gap-2">
                  {/* Location - ONLY show if verified */}
                  {featuredRestaurant.hasVerifiedLocation && (
                    <button onClick={() => handleMapClick(featuredRestaurant)} className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </button>
                  )}
                  {featuredRestaurant.phone && <a href={`tel:${featuredRestaurant.phone}`} className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </a>}
                </div>
              </div>

              {/* Delivery Apps Section */}
              {featuredRestaurant.deliveryApps.length > 0 && <div className="bg-card rounded-2xl p-4 shadow-soft">
                <p className="text-xs text-muted-foreground text-center mb-3 font-bold">
                  {t("اطلب الآن عبر التطبيقات", "Order now via apps")}
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {featuredRestaurant.deliveryApps.map(app => <button key={app.name} onClick={() => {
                    // Track click for sponsored restaurant (featured card)
                    handleDeliveryAppClick(featuredRestaurant, app);
                    // handleDeliveryAppClick now handles the opening via handleUnifiedClick
                  }} className="inline-flex items-center justify-center px-4 h-8 rounded-full text-sm font-extrabold border-2 bg-white transition-transform hover:scale-105 leading-none" style={{
                    borderColor: app.color,
                    color: app.color
                  }}>
                    {app.name}
                  </button>)}
                </div>
              </div>}
            </div>
          </motion.div>}

          {/* More Restaurants Section - Show title based on context */}
          {moreRestaurants.length > 0 && <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {hasPinnedAd ? t("المزيد", "More") : t("المطاعم", "Restaurants")}
              </h3>
              <span className="text-sm text-muted-foreground">
                {hasPinnedAd ? filteredRestaurants.length - 1 : filteredRestaurants.length} {t("مطعم", "restaurants")}
              </span>
            </div>

            <div className="space-y-3">
              {moreRestaurants.map((restaurant, index) => <motion.div key={restaurant.id} initial={{
                opacity: 0,
                y: 10
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: index * 0.05
              }}>
                <CompactRestaurantCard name={language === "en" && restaurant.name_en ? restaurant.name_en : restaurant.name} cuisine={`${getCuisineDisplay(restaurant.cuisine).emoji} ${getCuisineDisplay(restaurant.cuisine).name}`} image={restaurant.image} rating={restaurant.rating} distance={restaurant.distance} deliveryApps={restaurant.deliveryApps} isFavorite={savedRestaurantIds.includes(restaurant.name)} onFavoriteClick={() => toggleFavorite(restaurant)} onMapClick={() => handleMapClick(restaurant)} onClick={() => handleRestaurantClick(restaurant)} onDeliveryAppClick={(app) => handleDeliveryAppClick(restaurant, app)} isSponsored={restaurant.isSponsored} locationAvailable={!locationPermissionDenied && (userLat !== null && userLon !== null)} hasVerifiedLocation={restaurant.hasVerifiedLocation} mapUrl={restaurant.mapsUrl} />
              </motion.div>)}
            </div>

            {/* Infinite Scroll Trigger & Loading Indicator */}
            <div ref={loadMoreRef} className="flex justify-center py-6">
              {isLoadingMore && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm">{t("جاري التحميل...", "Loading...")}</span>
                </motion.div>
              )}
              {!isLoadingMore && remainingCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {remainingCount} {t("مطعم متبقي", "remaining")}
                </span>
              )}
            </div>
          </div>}
        </motion.div>}
      </AnimatePresence>}
    </main>

    <BottomNav />

    {/* Scroll to Top Button */}
    <AnimatePresence>
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-24 left-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          aria-label={t("العودة للأعلى", "Scroll to top")}
        >
          <ArrowUp className="w-5 h-5 flex-shrink-0" />
        </motion.button>
      )}
    </AnimatePresence>

    <GuestSignInPrompt isOpen={showGuestPrompt} onClose={() => setShowGuestPrompt(false)} />

    <UnifiedRestaurantDetail isOpen={showRestaurantDetail} onClose={() => {
      setShowRestaurantDetail(false);
      setSelectedRestaurantData(null);
    }} restaurant={selectedRestaurantData} onDeliveryAppClick={(app) => {
      if (selectedRestaurantData) handleDeliveryAppClick(selectedRestaurantData, app);
    }} onMapClick={() => {
      if (selectedRestaurantData) handleMapClick(selectedRestaurantData);
    }} />
  </div>;
};
export default Results;