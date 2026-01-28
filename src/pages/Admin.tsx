// Admin Panel - Restaurant & Ad Management
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Plus, Trash2, CalendarIcon, Store, Megaphone, Users, MapPin, X, Upload, UserPlus, ExternalLink, Pencil, MessageCircle, Eye, Mail, Phone, CheckCircle, Clock, XCircle, FileText } from "lucide-react";
import AdReportDialog from "@/components/AdReportDialog";
import LegalPagesEditor from "@/components/LegalPagesEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { ar } from "date-fns/locale";

interface Restaurant {
  id: string;
  name: string;
  name_en: string | null;
  cuisine: string;
  cuisines?: string[];
  phone: string | null;
  website: string | null;
  image_url: string | null;
  created_at: string;
}

interface Branch {
  id: string;
  restaurant_id: string;
  branch_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface DeliveryApp {
  id: string;
  restaurant_id: string;
  app_name: string;
  app_url: string | null;
}

interface Advertisement {
  id: string;
  restaurant_id: string;
  placement: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  views_count: number;
  clicks_count: number;
  restaurant?: Restaurant;
}

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    username: string;
    full_name: string | null;
  };
}

import { DELIVERY_APPS } from "@/lib/deliveryApps";

interface Cuisine {
  id: string;
  name: string;
  emoji: string;
}

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  restaurant_name: string | null;
  message: string;
  request_type: "restaurant" | "advertise";
  status: "pending" | "reviewed" | "contacted" | "closed";
  created_at: string;
}

const ADMIN_PERMISSIONS = [
  { id: "most_popular", label: "الأكثر رواجاً" },
  { id: "ads", label: "الإعلانات" },
  { id: "users", label: "المستخدمين" },
  { id: "manage_admins", label: "إدارة المشرفين" },
  { id: "legal_pages", label: "الصفحات القانونية" },
];

const Admin = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [restaurantInteractions, setRestaurantInteractions] = useState<Record<string, number>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Restaurant form state
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantNameEn, setRestaurantNameEn] = useState("");
  const [restaurantCuisines, setRestaurantCuisines] = useState<string[]>([]);
  const [restaurantPhone, setRestaurantPhone] = useState("");
  const [restaurantWebsite, setRestaurantWebsite] = useState("");
  const [restaurantImage, setRestaurantImage] = useState("");
  const [restaurantImageUrlInput, setRestaurantImageUrlInput] = useState(""); // For manual URL entry
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [branches, setBranches] = useState<{ mapsUrl: string; latitude: string; longitude: string; isExtracting?: boolean; extractionError?: string }[]>([
    { mapsUrl: "", latitude: "", longitude: "" },
  ]);
  const [selectedDeliveryApps, setSelectedDeliveryApps] = useState<{ name: string; url: string }[]>([]);
  const [isSubmittingRestaurant, setIsSubmittingRestaurant] = useState(false);

  // Ad form state
  const [adRestaurantId, setAdRestaurantId] = useState("");
  const [adRestaurantSearchQuery, setAdRestaurantSearchQuery] = useState("");
  const [showAdRestaurantDropdown, setShowAdRestaurantDropdown] = useState(false);
  const [adPlacements, setAdPlacements] = useState<string[]>(["pinned_ad"]);
  const [adStartDate, setAdStartDate] = useState<Date>(new Date());
  const [adEndDate, setAdEndDate] = useState<Date | null>(null);
  const [adPopupCount, setAdPopupCount] = useState<number>(10);
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);

  // Pinned ad placement type: "cuisine" | "all_and_cuisine"
  const [pinnedAdType, setPinnedAdType] = useState<"cuisine" | "all_and_cuisine">("cuisine");
  const [pinnedAdCuisine, setPinnedAdCuisine] = useState<string>("");
  const [pinnedAdCuisineCount, setPinnedAdCuisineCount] = useState<number>(10);
  const [pinnedAdAllCount, setPinnedAdAllCount] = useState<number>(10);

  // Admin form state
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "moderator">("moderator");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // Edit restaurant state
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [editRestaurantName, setEditRestaurantName] = useState("");
  const [editRestaurantNameEn, setEditRestaurantNameEn] = useState("");
  const [editRestaurantCuisines, setEditRestaurantCuisines] = useState<string[]>([]);
  const [editRestaurantPhone, setEditRestaurantPhone] = useState("");
  const [editRestaurantWebsite, setEditRestaurantWebsite] = useState("");
  const [editRestaurantImage, setEditRestaurantImage] = useState("");
  const [editDeliveryApps, setEditDeliveryApps] = useState<{ name: string; url: string }[]>([]);
  const [editBranches, setEditBranches] = useState<{ id?: string; mapsUrl: string; latitude: string; longitude: string }[]>([]);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const [isUpdatingRestaurant, setIsUpdatingRestaurant] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Edit ad state
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [editAdRestaurantId, setEditAdRestaurantId] = useState("");
  const [editAdPlacements, setEditAdPlacements] = useState<string[]>([]);
  const [editAdStartDate, setEditAdStartDate] = useState<Date>(new Date());
  const [editAdEndDate, setEditAdEndDate] = useState<Date>(new Date());
  const [editAdIsActive, setEditAdIsActive] = useState(true);
  const [editAdMaxViews, setEditAdMaxViews] = useState<number | null>(null);
  const [isUpdatingAd, setIsUpdatingAd] = useState(false);

  // Ad report state
  const [reportAd, setReportAd] = useState<Advertisement | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState("");
  const [restaurantCuisineFilter, setRestaurantCuisineFilter] = useState<string>("");
  const [restaurantSortBy, setRestaurantSortBy] = useState<"date" | "clicks">("date");

  // Ad list filter state
  const [adSearchQuery, setAdSearchQuery] = useState("");
  const [adPlacementFilter, setAdPlacementFilter] = useState<string>("");

  // Contact requests filter state
  const [contactTypeFilter, setContactTypeFilter] = useState<string>("");
  const [contactStatusFilter, setContactStatusFilter] = useState<string>("");

  // Filtered and sorted restaurants
  const filteredRestaurants = restaurants
    .filter((restaurant) => {
      const matchesSearch = restaurantSearchQuery === "" ||
        restaurant.name.toLowerCase().includes(restaurantSearchQuery.toLowerCase()) ||
        (restaurant.name_en && restaurant.name_en.toLowerCase().includes(restaurantSearchQuery.toLowerCase()));

      const matchesCuisine = restaurantCuisineFilter === "" ||
        (restaurant.cuisines && restaurant.cuisines.includes(restaurantCuisineFilter)) ||
        restaurant.cuisine === restaurantCuisineFilter;

      return matchesSearch && matchesCuisine;
    })
    .sort((a, b) => {
      if (restaurantSortBy === "clicks") {
        return (restaurantInteractions[b.id] || 0) - (restaurantInteractions[a.id] || 0);
      }
      // Sort by date (newest first) - default
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Filtered advertisements
  const filteredAdvertisements = advertisements.filter((ad) => {
    const matchesSearch = adSearchQuery === "" ||
      (ad.restaurant?.name && ad.restaurant.name.toLowerCase().includes(adSearchQuery.toLowerCase())) ||
      (ad.restaurant?.name_en && ad.restaurant.name_en.toLowerCase().includes(adSearchQuery.toLowerCase()));

    const matchesPlacement = adPlacementFilter === "" ||
      (adPlacementFilter === "most_popular" && ad.placement === "most_popular") ||
      (adPlacementFilter === "pinned_ad" && (ad.placement === "pinned_ad_all" || ad.placement.startsWith("pinned_ad_cuisine_") || ad.placement === "pinned_ad"));

    return matchesSearch && matchesPlacement;
  });

  // Filtered contact requests
  const filteredContactRequests = contactRequests.filter((request) => {
    const matchesType = contactTypeFilter === "" || contactTypeFilter === "all" || request.request_type === contactTypeFilter;
    const matchesStatus = contactStatusFilter === "" || contactStatusFilter === "all" || request.status === contactStatusFilter;
    return matchesType && matchesStatus;
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/welcome");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية الوصول لهذه الصفحة",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [adminLoading, isAdmin, user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);


  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [restaurantsRes, adsRes, adminsRes, cuisinesRes, contactRes, interactionsRes] = await Promise.all([
        supabase.from("restaurants").select("*").order("created_at", { ascending: false }),
        supabase.from("advertisements").select("*, restaurant:restaurants(*)").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*, profile:profiles(username, full_name)").order("created_at", { ascending: false }),
        supabase.from("cuisines").select("id, name, emoji").eq("is_active", true).order("sort_order", { ascending: true }),
        supabase.from("contact_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("restaurant_interactions").select("restaurant_id"),
      ]);

      if (restaurantsRes.data) setRestaurants(restaurantsRes.data);
      if (adsRes.data) {
        const processedAds = adsRes.data.map((ad: any) => ({
          ...ad,
          restaurant: ad.restaurant,
        }));
        setAdvertisements(processedAds);
      }
      if (adminsRes.data) {
        setAdminUsers(adminsRes.data as any);
      }
      if (cuisinesRes.data) {
        setCuisines(cuisinesRes.data);
      }
      if (contactRes.data) {
        setContactRequests(contactRes.data as ContactRequest[]);
      }
      // حساب عدد التفاعلات لكل مطعم
      if (interactionsRes.data) {
        const counts: Record<string, number> = {};
        interactionsRes.data.forEach((interaction: any) => {
          counts[interaction.restaurant_id] = (counts[interaction.restaurant_id] || 0) + 1;
        });
        setRestaurantInteractions(counts);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt} `;
      const filePath = `restaurant - images / ${fileName} `;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath);

      setRestaurantImage(publicUrl);
      toast({
        title: "تم الرفع",
        description: "تم رفع الصورة بنجاح",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء رفع الصورة",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      handleImageUpload(file);
    }
  };

  const handleAddBranch = () => {
    setBranches([...branches, { mapsUrl: "", latitude: "", longitude: "" }]);
  };

  const handleRemoveBranch = (index: number) => {
    if (branches.length > 1) {
      setBranches(branches.filter((_, i) => i !== index));
    }
  };

  // Validate Google Maps URL
  const isValidGoogleMapsUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is allowed
    const trimmed = url.trim().toLowerCase();
    // Accept various Google Maps URL formats
    return (
      trimmed.includes('google.com/maps') ||
      trimmed.includes('maps.google.com') ||
      trimmed.includes('goo.gl/maps') ||
      trimmed.includes('maps.app.goo.gl')
    );
  };

  // Extract coordinates from Google Maps URL via Edge Function
  const extractCoordinatesFromUrl = async (mapsUrl: string, index: number) => {
    if (!mapsUrl || !isValidGoogleMapsUrl(mapsUrl)) return;
    
    // Set extracting state
    setBranches(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isExtracting: true, extractionError: undefined };
      return updated;
    });

    try {
      const { data, error } = await supabase.functions.invoke('extract-coordinates', {
        body: { mapsUrl }
      });

      if (error) throw error;

      if (data.success && data.latitude && data.longitude) {
        setBranches(prev => {
          const updated = [...prev];
          updated[index] = { 
            ...updated[index], 
            latitude: data.latitude.toString(), 
            longitude: data.longitude.toString(),
            isExtracting: false,
            extractionError: undefined
          };
          return updated;
        });
        toast({
          title: "تم استخراج الإحداثيات",
          description: `Lat: ${data.latitude.toFixed(6)}, Lng: ${data.longitude.toFixed(6)}`,
        });
      } else {
        setBranches(prev => {
          const updated = [...prev];
          updated[index] = { 
            ...updated[index], 
            isExtracting: false,
            extractionError: "لم يتم العثور على إحداثيات في الرابط"
          };
          return updated;
        });
      }
    } catch (error: any) {
      console.error('Error extracting coordinates:', error);
      setBranches(prev => {
        const updated = [...prev];
        updated[index] = { 
          ...updated[index], 
          isExtracting: false,
          extractionError: "حدث خطأ أثناء استخراج الإحداثيات"
        };
        return updated;
      });
    }
  };

  const handleBranchChange = (index: number, field: string, value: string) => {
    const updated = [...branches];
    updated[index] = { ...updated[index], [field]: value };
    setBranches(updated);

    // Auto-extract coordinates when a valid Google Maps URL is entered
    if (field === 'mapsUrl' && value && isValidGoogleMapsUrl(value)) {
      // Debounce: wait 500ms after user stops typing
      const timeoutId = setTimeout(() => {
        extractCoordinatesFromUrl(value, index);
      }, 800);
      
      // Store timeout ID to clear it if user types again
      return () => clearTimeout(timeoutId);
    }
  };

  const openGoogleMapsSearch = (address: string) => {
    const query = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const toggleDeliveryApp = (appName: string) => {
    const existing = selectedDeliveryApps.find((a) => a.name === appName);
    if (existing) {
      setSelectedDeliveryApps(selectedDeliveryApps.filter((a) => a.name !== appName));
    } else {
      setSelectedDeliveryApps([...selectedDeliveryApps, { name: appName, url: "" }]);
    }
  };

  const handleDeliveryAppUrlChange = (appName: string, url: string) => {
    setSelectedDeliveryApps(
      selectedDeliveryApps.map((a) => (a.name === appName ? { ...a, url } : a))
    );
  };

  const handleSubmitRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName || !restaurantNameEn || restaurantCuisines.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة (الاسم بالعربي والإنجليزي ونوع المطبخ)",
        variant: "destructive",
      });
      return;
    }

    // Validate Google Maps URLs
    const invalidBranches = branches.filter(b => b.mapsUrl && !isValidGoogleMapsUrl(b.mapsUrl));
    if (invalidBranches.length > 0) {
      toast({
        title: "رابط غير صحيح",
        description: "يرجى إدخال رابط Google Maps صحيح (مثل: https://maps.google.com/...)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingRestaurant(true);
    try {
      // Insert restaurant
      const { data: restaurant, error: restaurantError } = await supabase
        .from("restaurants")
        .insert({
          name: restaurantName,
          name_en: restaurantNameEn || null,
          cuisine: restaurantCuisines[0], // Primary cuisine for backward compatibility
          cuisines: restaurantCuisines,
          phone: restaurantPhone || null,
          website: restaurantWebsite || null,
          image_url: restaurantImage || restaurantImageUrlInput || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (restaurantError) throw restaurantError;

      // Insert branches with extracted coordinates
      const validBranches = branches.filter((b) => b.mapsUrl || b.latitude || b.longitude);
      if (validBranches.length > 0) {
        const branchesData = validBranches.map((b) => ({
          restaurant_id: restaurant.id,
          google_maps_url: b.mapsUrl || null,
          latitude: b.latitude ? parseFloat(b.latitude) : null,
          longitude: b.longitude ? parseFloat(b.longitude) : null,
        }));

        const { error: branchError } = await supabase.from("restaurant_branches").insert(branchesData);
        if (branchError) throw branchError;
      }

      // Insert delivery apps
      if (selectedDeliveryApps.length > 0) {
        const appsData = selectedDeliveryApps.map((a) => ({
          restaurant_id: restaurant.id,
          app_name: a.name,
          app_url: a.url || null,
        }));

        const { error: appsError } = await supabase.from("restaurant_delivery_apps").insert(appsData);
        if (appsError) throw appsError;
      }

      toast({
        title: "تم بنجاح",
        description: "تم إضافة المطعم بنجاح",
      });

      // Reset form
      setRestaurantName("");
      setRestaurantNameEn("");
      setRestaurantCuisines([]);
      setRestaurantPhone("");
      setRestaurantWebsite("");
      setRestaurantImage("");
      setRestaurantImageUrlInput("");
      setImageFile(null);
      setBranches([{ mapsUrl: "", latitude: "", longitude: "" }]);
      setSelectedDeliveryApps([]);
      fetchData();
    } catch (error: any) {
      console.error("Error adding restaurant:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إضافة المطعم",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRestaurant(false);
    }
  };

  const handleSubmitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adRestaurantId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار مطعم",
        variant: "destructive",
      });
      return;
    }

    if (adPlacements.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار نوع الإعلان",
        variant: "destructive",
      });
      return;
    }

    // Validate end date for most popular
    if (adPlacements.includes("most_popular") && !adEndDate) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد تاريخ النهاية للأكثر رواجاً",
        variant: "destructive",
      });
      return;
    }

    // Validate pinned ad settings
    if (adPlacements.includes("pinned_ad")) {
      if (pinnedAdType === "cuisine" && !pinnedAdCuisine) {
        toast({
          title: "خطأ",
          description: "يرجى اختيار نوع المطبخ",
          variant: "destructive",
        });
        return;
      }
      if (pinnedAdType === "all_and_cuisine" && !pinnedAdCuisine) {
        toast({
          title: "خطأ",
          description: "يرجى اختيار نوع المطبخ",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmittingAd(true);
    try {
      const adsToInsert: any[] = [];

      // Calculate far future date for ads without end date (10 years from now)
      const farFutureDate = new Date();
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 10);
      const endDateValue = adEndDate ? format(adEndDate, "yyyy-MM-dd") : format(farFutureDate, "yyyy-MM-dd");

      // Handle pinned ads based on type
      if (adPlacements.includes("pinned_ad")) {
        // Always add cuisine placement for pinned ads
        adsToInsert.push({
          restaurant_id: adRestaurantId,
          placement: `pinned_ad_cuisine_${pinnedAdCuisine}`,
          start_date: format(adStartDate, "yyyy-MM-dd"),
          end_date: endDateValue,
          is_active: true,
          created_by: user?.id,
          max_views: pinnedAdType === "all_and_cuisine" ? pinnedAdCuisineCount : adPopupCount,
        });

        // Add "all" placement only if "all_and_cuisine" is selected
        if (pinnedAdType === "all_and_cuisine") {
          adsToInsert.push({
            restaurant_id: adRestaurantId,
            placement: "pinned_ad_all",
            start_date: format(adStartDate, "yyyy-MM-dd"),
            end_date: endDateValue,
            is_active: true,
            created_by: user?.id,
            max_views: pinnedAdAllCount,
          });
        }
      }

      // Handle most popular
      if (adPlacements.includes("most_popular")) {
        adsToInsert.push({
          restaurant_id: adRestaurantId,
          placement: "most_popular",
          start_date: format(adStartDate, "yyyy-MM-dd"),
          end_date: endDateValue,
          is_active: true,
          created_by: user?.id,
          max_views: null,
        });
      }

      const { error } = await supabase.from("advertisements").insert(adsToInsert);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: `تم إضافة ${adsToInsert.length} إعلان بنجاح`,
      });

      // Reset form
      setAdRestaurantId("");
      setAdPlacements(["pinned_ad"]);
      setAdStartDate(new Date());
      setAdEndDate(null);
      setAdPopupCount(10);
      setPinnedAdType("cuisine");
      setPinnedAdCuisine("");
      setPinnedAdCuisineCount(10);
      setPinnedAdAllCount(10);
      fetchData();
    } catch (error: any) {
      console.error("Error adding ad:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إضافة الإعلان",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAd(false);
    }
  };

  const handleSubmitAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال البريد الإلكتروني",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingAdmin(true);
    try {
      // Find user by email in profiles (we'll search by username as email)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", newAdminEmail)
        .single();

      if (profileError || !profile) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على المستخدم",
          variant: "destructive",
        });
        return;
      }

      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", profile.id)
        .single();

      if (existingRole) {
        toast({
          title: "خطأ",
          description: "هذا المستخدم لديه صلاحيات بالفعل",
          variant: "destructive",
        });
        return;
      }

      // Add role
      const { error } = await supabase.from("user_roles").insert({
        user_id: profile.id,
        role: selectedRole,
      });

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: `تم إضافة ${selectedRole === 'admin' ? 'مشرف' : 'مدير'} جديد`,
      });

      setNewAdminEmail("");
      setSelectedRole("moderator");
      setSelectedPermissions([]);
      fetchData();
    } catch (error: any) {
      console.error("Error adding admin:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إضافة المشرف",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المطعم؟")) return;

    try {
      const { error } = await supabase.from("restaurants").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم الحذف", description: "تم حذف المطعم بنجاح" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإعلان؟")) return;

    try {
      const { error } = await supabase.from("advertisements").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم الحذف", description: "تم حذف الإعلان بنجاح" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm("هل أنت متأكد من إزالة صلاحيات هذا المستخدم؟")) return;

    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم الحذف", description: "تم إزالة الصلاحيات بنجاح" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditRestaurant = async (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setEditRestaurantName(restaurant.name);
    setEditRestaurantNameEn(restaurant.name_en || "");
    setEditRestaurantCuisines(restaurant.cuisines && restaurant.cuisines.length > 0 ? restaurant.cuisines : [restaurant.cuisine]);
    setEditRestaurantPhone(restaurant.phone || "");
    setEditRestaurantWebsite(restaurant.website || "");
    setEditRestaurantImage(restaurant.image_url || "");

    // Fetch existing delivery apps for this restaurant
    const [appsRes, branchesRes] = await Promise.all([
      supabase
        .from("restaurant_delivery_apps")
        .select("app_name, app_url")
        .eq("restaurant_id", restaurant.id),
      supabase
        .from("restaurant_branches")
        .select("id, branch_name, address, google_maps_url, latitude, longitude")
        .eq("restaurant_id", restaurant.id)
    ]);

    if (appsRes.data) {
      setEditDeliveryApps(appsRes.data.map(app => ({ name: app.app_name, url: app.app_url || "" })));
    } else {
      setEditDeliveryApps([]);
    }

    if (branchesRes.data && branchesRes.data.length > 0) {
      setEditBranches(branchesRes.data.map(b => ({
        id: b.id,
        mapsUrl: b.google_maps_url || "",
        latitude: b.latitude?.toString() || "",
        longitude: b.longitude?.toString() || ""
      })));
    } else {
      setEditBranches([{ mapsUrl: "", latitude: "", longitude: "" }]);
    }
  };

  const handleEditImageUpload = async (file: File) => {
    setIsUploadingEditImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `restaurant-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath);

      setEditRestaurantImage(publicUrl);
      toast({
        title: "تم الرفع",
        description: "تم رفع الصورة بنجاح",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء رفع الصورة",
        variant: "destructive",
      });
    } finally {
      setIsUploadingEditImage(false);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleEditImageUpload(file);
    }
  };

  const handleAddEditBranch = () => {
    setEditBranches([...editBranches, { mapsUrl: "", latitude: "", longitude: "" }]);
  };

  const handleRemoveEditBranch = (index: number) => {
    if (editBranches.length > 1) {
      setEditBranches(editBranches.filter((_, i) => i !== index));
    }
  };

  const handleEditBranchChange = (index: number, field: string, value: string) => {
    const updated = [...editBranches];
    updated[index] = { ...updated[index], [field]: value };
    setEditBranches(updated);
  };

  const handleUpdateRestaurant = async () => {
    if (!editingRestaurant) return;
    if (!editRestaurantName || editRestaurantCuisines.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة (الاسم ونوع المطبخ)",
        variant: "destructive",
      });
      return;
    }

    // Validate Google Maps URLs
    const invalidBranches = editBranches.filter(b => b.mapsUrl && !isValidGoogleMapsUrl(b.mapsUrl));
    if (invalidBranches.length > 0) {
      toast({
        title: "رابط غير صحيح",
        description: "يرجى إدخال رابط Google Maps صحيح (مثل: https://maps.google.com/...)",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingRestaurant(true);
    try {
      // Update restaurant info
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: editRestaurantName,
          name_en: editRestaurantNameEn || null,
          cuisine: editRestaurantCuisines[0], // Primary cuisine for backward compatibility
          cuisines: editRestaurantCuisines,
          phone: editRestaurantPhone || null,
          website: editRestaurantWebsite || null,
          image_url: editRestaurantImage || null,
        })
        .eq("id", editingRestaurant.id);

      if (error) throw error;

      // Delete existing delivery apps and insert new ones
      await supabase
        .from("restaurant_delivery_apps")
        .delete()
        .eq("restaurant_id", editingRestaurant.id);

      if (editDeliveryApps.length > 0) {
        const appsData = editDeliveryApps.map((a) => ({
          restaurant_id: editingRestaurant.id,
          app_name: a.name,
          app_url: a.url || null,
        }));

        const { error: appsError } = await supabase
          .from("restaurant_delivery_apps")
          .insert(appsData);

        if (appsError) throw appsError;
      }

      // Delete existing branches and insert new ones
      await supabase
        .from("restaurant_branches")
        .delete()
        .eq("restaurant_id", editingRestaurant.id);

      const validBranches = editBranches.filter((b) => b.mapsUrl || b.latitude || b.longitude);
      if (validBranches.length > 0) {
        const branchesData = validBranches.map((b) => ({
          restaurant_id: editingRestaurant.id,
          google_maps_url: b.mapsUrl || null,
          latitude: null, // Removed latitude input
          longitude: null, // Removed longitude input
        }));

        const { error: branchError } = await supabase
          .from("restaurant_branches")
          .insert(branchesData);

        if (branchError) throw branchError;
      }

      toast({
        title: "تم التحديث",
        description: "تم تحديث بيانات المطعم بنجاح",
      });

      setEditingRestaurant(null);
      setEditDeliveryApps([]);
      setEditBranches([]);
      fetchData();
    } catch (error: any) {
      console.error("Error updating restaurant:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تحديث المطعم",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingRestaurant(false);
    }
  };

  const toggleEditDeliveryApp = (appName: string) => {
    const existing = editDeliveryApps.find((a) => a.name === appName);
    if (existing) {
      setEditDeliveryApps(editDeliveryApps.filter((a) => a.name !== appName));
    } else {
      setEditDeliveryApps([...editDeliveryApps, { name: appName, url: "" }]);
    }
  };

  const handleEditDeliveryAppUrlChange = (appName: string, url: string) => {
    setEditDeliveryApps(
      editDeliveryApps.map((a) => (a.name === appName ? { ...a, url } : a))
    );
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleEditAd = (ad: Advertisement) => {
    setEditingAd(ad);
    setEditAdRestaurantId(ad.restaurant_id);
    setEditAdPlacements([ad.placement]);
    setEditAdStartDate(new Date(ad.start_date));
    setEditAdEndDate(new Date(ad.end_date));
    setEditAdIsActive(ad.is_active);
    setEditAdMaxViews((ad as any).max_views || null);
  };

  const handleUpdateAd = async () => {
    if (!editingAd) return;
    if (!editAdRestaurantId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار مطعم",
        variant: "destructive",
      });
      return;
    }

    if (editAdPlacements.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار مكان عرض واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingAd(true);
    try {
      // Update the existing ad with first placement
      const { error } = await supabase
        .from("advertisements")
        .update({
          restaurant_id: editAdRestaurantId,
          placement: editAdPlacements[0],
          start_date: format(editAdStartDate, "yyyy-MM-dd"),
          end_date: format(editAdEndDate, "yyyy-MM-dd"),
          is_active: editAdIsActive,
          max_views: editAdPlacements.includes("pinned_ad") || editAdPlacements[0]?.startsWith("pinned_ad") ? editAdMaxViews : null,
        })
        .eq("id", editingAd.id);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث الإعلان بنجاح",
      });

      setEditingAd(null);
      fetchData();
    } catch (error: any) {
      console.error("Error updating ad:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تحديث الإعلان",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAd(false);
    }
  };

  const handleUpdateContactStatus = async (requestId: string, newStatus: ContactRequest["status"]) => {
    try {
      const { error } = await supabase
        .from("contact_requests")
        .update({ status: newStatus })
        .eq("id", requestId);

      if (error) throw error;

      setContactRequests(contactRequests.map(req =>
        req.id === requestId ? { ...req, status: newStatus } : req
      ));

      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة الطلب بنجاح",
      });
    } catch (error: any) {
      console.error("Error updating contact status:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تحديث الحالة",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: ContactRequest["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />قيد الانتظار</Badge>;
      case "reviewed":
        return <Badge variant="outline" className="gap-1"><Eye className="w-3 h-3" />تمت المراجعة</Badge>;
      case "contacted":
        return <Badge className="gap-1 bg-blue-500"><Phone className="w-3 h-3" />تم التواصل</Badge>;
      case "closed":
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="w-3 h-3" />مغلق</Badge>;
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-8" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-primary to-primary/80 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/profile")} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <div className="w-10"></div>
        </div>
        <div className="flex gap-4 text-sm justify-center flex-wrap">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            <span>{restaurants.length} مطعم</span>
          </div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            <span>{advertisements.length} إعلان</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{adminUsers.length} مشرف</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span>{contactRequests.filter(r => r.status === "pending").length} طلب جديد</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="restaurants" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="contacts" className="text-sm">
              الطلبات
              <MessageCircle className="w-4 h-4 mr-2 ml-2" />
            </TabsTrigger>
            <TabsTrigger value="admins" className="textسم">
              المشرفين
              <Users className="w-4 h-4 mr-2 ml-2" />
            </TabsTrigger>
            <TabsTrigger value="ads" className="text-sm">
              الإعلانات
              <Megaphone className="w-4 h-4 mr-2 ml-2" />
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="text-sm">
              المطاعم
              <Store className="w-4 h-4 mr-2 ml-2" />
            </TabsTrigger>
            <TabsTrigger value="legal" className="text-sm">
              الصفحات القانونية
              <FileText className="w-4 h-4 mr-2 ml-2" />
            </TabsTrigger>
          </TabsList>

          {/* Contact Requests Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 justify-center flex-row-reverse">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  طلبات التواصل ({filteredContactRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6 flex-row-reverse">
                  <div className="flex-1 min-w-[150px]">
                    <Label className="text-right block mb-2 text-sm">نوع الطلب</Label>
                    <Select value={contactTypeFilter} onValueChange={setContactTypeFilter}>
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="restaurant">إضافة مطعم</SelectItem>
                        <SelectItem value="advertise">إعلان</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <Label className="text-right block mb-2 text-sm">الحالة</Label>
                    <Select value={contactStatusFilter} onValueChange={setContactStatusFilter}>
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                        <SelectItem value="reviewed">تمت المراجعة</SelectItem>
                        <SelectItem value="contacted">تم التواصل</SelectItem>
                        <SelectItem value="closed">مغلق</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredContactRequests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد طلبات تواصل</p>
                ) : (
                  <div className="space-y-4">
                    {filteredContactRequests.map((request) => (
                      <Card key={request.id} className={`border-l-4 ${request.status === "pending" ? "border-l-yellow-500" : request.status === "contacted" ? "border-l-blue-500" : request.status === "closed" ? "border-l-green-500" : "border-l-gray-300"}`}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-3">
                            {/* Header with type and status */}
                            <div className="flex items-center justify-between flex-wrap gap-2 flex-row-reverse">
                              <div className="flex items-center gap-2 flex-row-reverse">
                                {request.request_type === "restaurant" ? (
                                  <Badge variant="outline" className="gap-1 flex-row-reverse">
                                    <Store className="w-3 h-3" />
                                    إضافة مطعم
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1 flex-row-reverse">
                                    <Megaphone className="w-3 h-3" />
                                    إعلان
                                  </Badge>
                                )}
                                {getStatusBadge(request.status)}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(request.created_at).toLocaleDateString("ar-SA", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>

                            {/* Contact info */}
                            <div className="flex flex-col gap-2 text-sm text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <span>{request.name}</span>
                                <span className="font-medium">:الاسم</span>
                              </div>
                              <div className="flex items-center gap-2 justify-end">
                                <a href={`mailto:${request.email}`} className="text-primary hover:underline" dir="ltr">
                                  {request.email}
                                </a>
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">:البريد</span>
                              </div>
                              {request.phone && (
                                <div className="flex items-center gap-2 justify-end">
                                  <a href={`tel:${request.phone}`} className="text-primary hover:underline" dir="ltr">
                                    {request.phone}
                                  </a>
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">:الهاتف</span>
                                </div>
                              )}
                            </div>

                            {/* Restaurant name if applicable */}
                            {request.restaurant_name && (
                              <div className="text-sm text-right">
                                <span className="font-medium">اسم المطعم: </span>
                                <span>{request.restaurant_name}</span>
                              </div>
                            )}

                            {/* Message */}
                            <div className="bg-muted/50 p-3 rounded-lg text-sm text-right">
                              <p className="whitespace-pre-wrap">{request.message}</p>
                            </div>

                            {/* Status update buttons */}
                            <div className="flex items-center gap-2 flex-wrap flex-row-reverse justify-end">
                              <span className="text-sm font-medium">تحديث الحالة:</span>
                              <Select
                                value={request.status}
                                onValueChange={(value) => handleUpdateContactStatus(request.id, value as ContactRequest["status"])}
                              >
                                <SelectTrigger className="w-[150px] text-right">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-background border shadow-lg z-50">
                                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                                  <SelectItem value="reviewed">تمت المراجعة</SelectItem>
                                  <SelectItem value="contacted">تم التواصل</SelectItem>
                                  <SelectItem value="closed">مغلق</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restaurants Tab */}
          <TabsContent value="restaurants" className="space-y-6">
            {/* Add Restaurant Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 justify-center flex-row-reverse">
                  <Plus className="w-5 h-5 text-primary" />
                  إضافة مطعم جديد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitRestaurant} className="space-y-4">
                  {/* Restaurant Names - Above Cuisine */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 order-2 md:order-1">
                      <Label htmlFor="name-en" className="text-right block">Restaurant Name (English) *</Label>
                      <Input
                        id="name-en"
                        value={restaurantNameEn}
                        onChange={(e) => setRestaurantNameEn(e.target.value)}
                        placeholder="Enter restaurant name in English"
                        dir="ltr"
                        className="text-left"
                        required
                      />
                    </div>
                    <div className="space-y-2 order-1 md:order-2">
                      <Label htmlFor="name" className="text-right block">اسم المطعم (عربي) *</Label>
                      <Input
                        id="name"
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                        placeholder="أدخل اسم المطعم بالعربي"
                        className="text-right"
                        required
                      />
                    </div>
                  </div>

                  {/* Cuisine Type */}
                  <div className="space-y-2">
                    <Label htmlFor="cuisine" className="text-right block">نوع المطبخ * (يمكنك اختيار أكثر من نوع)</Label>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {cuisines.map((cuisine) => {
                        const isSelected = restaurantCuisines.includes(cuisine.name);
                        return (
                          <button
                            key={cuisine.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setRestaurantCuisines(restaurantCuisines.filter(c => c !== cuisine.name));
                              } else {
                                setRestaurantCuisines([...restaurantCuisines, cuisine.name]);
                              }
                            }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                          >
                            {cuisine.emoji} {cuisine.name}
                          </button>
                        );
                      })}
                    </div>
                    {restaurantCuisines.length === 0 && (
                      <p className="text-xs text-muted-foreground text-right">اختر نوع واحد على الأقل</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Image Upload */}
                    <div className="space-y-2 order-2 md:order-1">
                      <Label htmlFor="image" className="text-right block">صورة المطعم</Label>
                      <div className="flex flex-col gap-4">
                        {/* File Upload */}
                        <div className="flex items-center gap-2">
                          <Input
                            ref={fileInputRef}
                            id="image"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground border-none h-12 text-lg font-bold shadow-soft hover:shadow-elevated transition-all duration-300"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingImage}
                          >
                            {isUploadingImage ? (
                              <>
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin ml-2" />
                                جاري الرفع...
                              </>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 ml-2" />
                                رفع صورة
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                              أو
                            </span>
                          </div>
                        </div>

                        {/* URL Input */}
                        <div className="space-y-2">
                          <Label htmlFor="imageUrl" className="text-right block">رابط الصورة (اختياري)</Label>
                          <Input
                            id="imageUrl"
                            placeholder="https://example.com/image.jpg"
                            value={restaurantImageUrlInput}
                            onChange={(e) => {
                              setRestaurantImageUrlInput(e.target.value);
                              // Clear file upload if URL is entered to avoid confusion, or keep both but prioritize one
                              if (e.target.value) {
                                setRestaurantImage("");
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }
                            }}
                            dir="ltr"
                          />
                        </div>

                        {/* Preview */}
                        {(restaurantImage || restaurantImageUrlInput) && (
                          <div className="mt-2 relative w-full h-48 rounded-xl overflow-hidden border border-border shadow-sm group">
                            <img
                              src={restaurantImage || restaurantImageUrlInput}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setRestaurantImage("");
                                setRestaurantImageUrlInput("");
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 order-1 md:order-2">
                      <Label htmlFor="phone" className="text-right block">رقم الاتصال</Label>
                      <Input
                        id="phone"
                        value={restaurantPhone}
                        onChange={(e) => setRestaurantPhone(e.target.value)}
                        placeholder="05xxxxxxxx"
                        dir="ltr"
                        className="text-left"
                      />
                    </div>
                  </div>

                  {/* Branches */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <Label className="flex items-center gap-2 text-right flex-row-reverse">
                        <MapPin className="w-4 h-4 text-primary" />
                        الفروع والمواقع
                      </Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddBranch}>
                        <Plus className="w-4 h-4 ml-1" />
                        إضافة فرع
                      </Button>
                    </div>
                    {branches.map((branch, index) => (
                      <div key={index} className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-right">فرع {index + 1}</span>
                          <div className="flex items-center gap-2">
                            {branches.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveBranch(index)}
                              >
                                <X className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="💡 انسخ رابط الموقع من Google Maps والصقه هنا (اختياري)"
                              value={branch.mapsUrl}
                              onChange={(e) => handleBranchChange(index, "mapsUrl", e.target.value)}
                              className={`w-full text-right ${branch.mapsUrl && !isValidGoogleMapsUrl(branch.mapsUrl) ? 'border-destructive' : ''}`}
                              dir="rtl"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open('https://www.google.com/maps', '_blank')}
                              className="shrink-0"
                              title="فتح Google Maps للبحث"
                            >
                              <MapPin className="w-4 h-4" />
                            </Button>
                          </div>
                          {branch.mapsUrl && !isValidGoogleMapsUrl(branch.mapsUrl) && (
                            <p className="text-xs text-destructive text-right" dir="rtl">
                              ⚠️ الرابط غير صحيح - يجب أن يكون رابط Google Maps
                            </p>
                          )}
                          {/* Extraction Status */}
                          {branch.isExtracting && (
                            <div className="flex items-center gap-2 text-xs text-primary text-right" dir="rtl">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                              <span>جاري استخراج الإحداثيات...</span>
                            </div>
                          )}
                          {branch.extractionError && (
                            <p className="text-xs text-amber-600 text-right" dir="rtl">
                              ⚠️ {branch.extractionError}
                            </p>
                          )}
                          {/* Show extracted coordinates */}
                          {branch.latitude && branch.longitude && !branch.isExtracting && (
                            <div className="flex items-center gap-2 text-xs text-green-600 text-right bg-green-50 p-2 rounded" dir="rtl">
                              <CheckCircle className="w-3 h-3" />
                              <span>✅ تم استخراج الإحداثيات: {parseFloat(branch.latitude).toFixed(6)}, {parseFloat(branch.longitude).toFixed(6)}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground text-right" dir="rtl">
                          💡 أدخل رابط Google Maps وسيتم استخراج الإحداثيات تلقائياً
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Apps */}
                  <div className="space-y-3">
                    <Label className="text-right block">تطبيقات التوصيل</Label>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {DELIVERY_APPS.map((app) => {
                        const isSelected = selectedDeliveryApps.some((a) => a.name === app.name);
                        return (
                          <button
                            key={app.name}
                            type="button"
                            onClick={() => toggleDeliveryApp(app.name)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isSelected
                              ? "text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            style={isSelected ? { backgroundColor: app.color } : {}}
                          >
                            {app.name}
                          </button>
                        );
                      })}
                    </div>
                    {selectedDeliveryApps.length > 0 && (
                      <div className="space-y-2">
                        {selectedDeliveryApps.map((app) => (
                          <div key={app.name} className="flex items-center gap-2 flex-row-reverse">
                            <span className="text-sm min-w-[80px] text-right">{app.name}:</span>
                            <Input
                              placeholder="رابط التطبيق (اختياري)"
                              value={app.url}
                              onChange={(e) => handleDeliveryAppUrlChange(app.name, e.target.value)}
                              dir="ltr"
                              className="flex-1 text-left"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmittingRestaurant}>
                    {isSubmittingRestaurant ? "جاري الإضافة..." : "إضافة المطعم"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Restaurants List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-center">المطاعم المضافة ({filteredRestaurants.length} من {restaurants.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="🔍 ابحث بالاسم..."
                      value={restaurantSearchQuery}
                      onChange={(e) => setRestaurantSearchQuery(e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <Select value={restaurantCuisineFilter || "all"} onValueChange={(val) => setRestaurantCuisineFilter(val === "all" ? "" : val)} dir="rtl">
                      <SelectTrigger className="text-right flex-row-reverse">
                        <SelectValue placeholder="نوع المطبخ" />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="all" className="text-right justify-end">الكل</SelectItem>
                        {cuisines.filter(c => c.name !== "الكل").map((cuisine) => (
                          <SelectItem key={cuisine.id} value={cuisine.name} className="text-right justify-end">
                            {cuisine.emoji} {cuisine.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* زر التبديل بين الترتيب */}
                  <button
                    onClick={() => setRestaurantSortBy(restaurantSortBy === "date" ? "clicks" : "date")}
                    className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      restaurantSortBy === "clicks" 
                        ? "bg-primary text-primary-foreground shadow-soft" 
                        : "bg-card text-foreground border border-border"
                    }`}
                  >
                    <span>{restaurantSortBy === "clicks" ? "👆 الأكثر نقرات" : "🕐 الأحدث"}</span>
                  </button>
                </div>

                {isLoadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredRestaurants.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {restaurants.length === 0 ? "لا توجد مطاعم مضافة" : "لا توجد نتائج مطابقة"}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredRestaurants.map((restaurant) => (
                      <div
                        key={restaurant.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg flex-row-reverse"
                      >
                        <div className="flex items-center gap-3 flex-row-reverse">
                          {restaurant.image_url ? (
                            <img
                              src={restaurant.image_url}
                              alt={restaurant.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Store className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div className="text-right">
                            <div className="flex items-center gap-2 flex-row-reverse">
                              <h3 className="font-semibold">{restaurant.name}</h3>
                              {restaurant.name_en && (
                                <span className="text-sm text-muted-foreground">({restaurant.name_en})</span>
                              )}
                              <span className="text-xs text-muted-foreground" dir="rtl">
                                👆 نقرة {restaurantInteractions[restaurant.id] || 0}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {restaurant.cuisines && restaurant.cuisines.length > 0
                                ? restaurant.cuisines.join(" • ")
                                : restaurant.cuisine}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRestaurant(restaurant)}
                          >
                            <Pencil className="w-4 h-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRestaurant(restaurant.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legal Pages Tab */}
          <TabsContent value="legal_pages" className="space-y-6">
            <LegalPagesEditor />
          </TabsContent>

          {/* Ads Tab */}
          <TabsContent value="ads" className="space-y-6">
            {/* Add Ad Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 justify-center flex-row-reverse">
                  <Plus className="w-5 h-5 text-primary" />
                  إضافة إعلان جديد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitAd} className="space-y-4">
                  {/* Restaurant Search + Ad Type - side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 order-1">
                      <Label className="text-right block">نوع الإعلان *</Label>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setAdPlacements(["pinned_ad"])}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${adPlacements.includes("pinned_ad")
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                          إعلان مثبت
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdPlacements(["most_popular"])}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${adPlacements.includes("most_popular")
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                          الأكثر رواجاً
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 order-2 relative">
                      <Label className="text-right block">اختر المطعم *</Label>
                      <Input
                        type="text"
                        value={adRestaurantSearchQuery}
                        onChange={(e) => {
                          setAdRestaurantSearchQuery(e.target.value);
                          setShowAdRestaurantDropdown(true);
                        }}
                        onFocus={() => setShowAdRestaurantDropdown(true)}
                        placeholder="ابحث عن مطعم..."
                        className="text-right"
                      />
                      {showAdRestaurantDropdown && adRestaurantSearchQuery && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {restaurants
                            .filter(r =>
                              r.name.includes(adRestaurantSearchQuery) ||
                              r.name_en?.toLowerCase().includes(adRestaurantSearchQuery.toLowerCase()) ||
                              r.cuisine.includes(adRestaurantSearchQuery)
                            )
                            .slice(0, 10)
                            .map((restaurant) => (
                              <button
                                key={restaurant.id}
                                type="button"
                                onClick={() => {
                                  setAdRestaurantId(restaurant.id);
                                  setAdRestaurantSearchQuery(restaurant.name);
                                  setShowAdRestaurantDropdown(false);
                                  // Auto-set cuisine from selected restaurant
                                  const restaurantCuisine = restaurant.cuisines?.[0] || restaurant.cuisine;
                                  setPinnedAdCuisine(restaurantCuisine || "");
                                }}
                                className="w-full px-3 py-2 text-right hover:bg-muted transition-colors border-b last:border-b-0"
                              >
                                <span className="font-medium">{restaurant.name}</span>
                                <span className="text-muted-foreground text-sm mr-2">- {restaurant.cuisine}</span>
                              </button>
                            ))}
                          {restaurants.filter(r =>
                            r.name.includes(adRestaurantSearchQuery) ||
                            r.name_en?.toLowerCase().includes(adRestaurantSearchQuery.toLowerCase()) ||
                            r.cuisine.includes(adRestaurantSearchQuery)
                          ).length === 0 && (
                              <div className="px-3 py-2 text-muted-foreground text-right">لا توجد نتائج</div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  {adPlacements.includes("pinned_ad") && (
                    <div className="space-y-4 p-4 border rounded-lg bg-white">
                      <Label className="text-right block font-semibold">إعدادات الإعلان المثبت</Label>

                      {/* Pinned Ad Type Selection */}
                      <div className="space-y-2">
                        <Label className="text-right block text-sm">نوع الظهور</Label>
                        <div className="flex flex-wrap gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setPinnedAdType("cuisine")}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${pinnedAdType === "cuisine"
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border text-muted-foreground hover:bg-muted"
                              }`}
                          >
                            المطبخ فقط
                          </button>
                          <button
                            type="button"
                            onClick={() => setPinnedAdType("all_and_cuisine")}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${pinnedAdType === "all_and_cuisine"
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border text-muted-foreground hover:bg-muted"
                              }`}
                          >
                            الكل + المطبخ
                          </button>
                        </div>
                      </div>

                      {/* Cuisine Display + Views Count - side by side */}
                      {pinnedAdType === "all_and_cuisine" ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 order-1">
                              <Label className="text-right block text-sm">الكل</Label>
                              <Input
                                type="number"
                                min={1}
                                value={pinnedAdAllCount}
                                onChange={(e) => setPinnedAdAllCount(Number(e.target.value))}
                                className="text-right"
                                placeholder="عدد الظهور"
                              />
                            </div>
                            <div className="space-y-2 order-2">
                              <Label className="text-right block text-sm">
                                {pinnedAdCuisine ? (
                                  <span>{cuisines.find(c => c.name === pinnedAdCuisine)?.emoji} {pinnedAdCuisine}</span>
                                ) : (
                                  "المطبخ"
                                )}
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                value={pinnedAdCuisineCount}
                                onChange={(e) => setPinnedAdCuisineCount(Number(e.target.value))}
                                className="text-right"
                                placeholder="عدد الظهور"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground text-right">
                            💡 سيتم حفظ إعلانين منفصلين: واحد للمطبخ وواحد للكل
                          </p>
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 order-1">
                            <Label className="text-right block text-sm">عدد مرات الظهور</Label>
                            <Input
                              type="number"
                              min={1}
                              value={adPopupCount}
                              onChange={(e) => setAdPopupCount(Number(e.target.value))}
                              className="text-right"
                              placeholder="أدخل عدد مرات الظهور"
                            />
                          </div>
                          <div className="space-y-2 order-2">
                            <Label className="text-right block text-sm">نوع المطبخ</Label>
                            <div className="p-3 bg-muted rounded-lg text-right h-10 flex items-center justify-end">
                              {pinnedAdCuisine ? (
                                <span className="font-medium">
                                  {cuisines.find(c => c.name === pinnedAdCuisine)?.emoji} {pinnedAdCuisine}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">اختر مطعم أولاً</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right order-2">
                      <Label>تاريخ البداية *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-end text-right flex-row-reverse">
                            {format(adStartDate, "PPP", { locale: ar })}
                            <CalendarIcon className="mr-2 h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={adStartDate}
                            onSelect={(date) => date && setAdStartDate(date)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2 text-right order-1">
                      <Label>
                        تاريخ النهاية {adPlacements.includes("most_popular") ? "*" : "(اختياري)"}
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-end text-right flex-row-reverse">
                            {adEndDate
                              ? format(adEndDate, "PPP", { locale: ar })
                              : adPlacements.includes("most_popular")
                                ? "اختر تاريخ النهاية"
                                : "حتى انتهاء المشاهدات"}
                            <CalendarIcon className="mr-2 h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          {adPlacements.includes("pinned_ad") && (
                            <div className="p-2 border-b">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-right"
                                onClick={() => setAdEndDate(null)}
                              >
                                إزالة تاريخ النهاية
                              </Button>
                            </div>
                          )}
                          <Calendar
                            mode="single"
                            selected={adEndDate || undefined}
                            onSelect={(date) => setAdEndDate(date || null)}
                            initialFocus
                            disabled={(date) => date < adStartDate}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      {!adEndDate && adPlacements.includes("pinned_ad") && (
                        <p className="text-xs text-muted-foreground text-right">
                          سيعمل الإعلان حتى تنتهي المشاهدات
                        </p>
                      )}
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmittingAd}>
                    {isSubmittingAd ? "جاري الإضافة..." : "إضافة الإعلان"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Ads List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-center">الإعلانات الحالية ({filteredAdvertisements.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="بحث باسم المطعم..."
                      value={adSearchQuery}
                      onChange={(e) => setAdSearchQuery(e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select value={adPlacementFilter} onValueChange={setAdPlacementFilter} dir="rtl">
                      <SelectTrigger className="text-right flex-row-reverse">
                        <SelectValue placeholder="نوع الإعلان" />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="all" className="text-right justify-end">الكل</SelectItem>
                        <SelectItem value="most_popular" className="text-right justify-end">الأكثر رواجاً</SelectItem>
                        <SelectItem value="pinned_ad" className="text-right justify-end">إعلان مثبت</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isLoadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredAdvertisements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {advertisements.length === 0 ? "لا توجد إعلانات" : "لا توجد نتائج للبحث"}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredAdvertisements.map((ad) => (
                      <div
                        key={ad.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg flex-row-reverse"
                      >
                        <div className="space-y-1 text-right">
                          <div className="flex items-center gap-2 flex-row-reverse">
                            <h3 className="font-semibold">{ad.restaurant?.name || "مطعم محذوف"}</h3>
                            <Badge
                              variant={ad.is_active ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {ad.is_active ? "نشط" : "متوقف"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {ad.placement === "most_popular"
                              ? "الأكثر رواجاً"
                              : ad.placement === "pinned_ad_all"
                                ? "إعلان مثبت (الكل)"
                                : ad.placement.startsWith("pinned_ad_cuisine_")
                                  ? `إعلان مثبت (${ad.placement.replace("pinned_ad_cuisine_", "")})`
                                  : ad.placement === "pinned_ad"
                                    ? "إعلان مثبت"
                                    : ad.placement
                            }
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(ad.start_date), "PPP", { locale: ar })} -{" "}
                            {new Date(ad.end_date).getFullYear() >= new Date().getFullYear() + 5
                              ? "حتى انتهاء المشاهدات"
                              : format(new Date(ad.end_date), "PPP", { locale: ar })}
                          </p>
                          <div className="flex gap-4 text-xs text-muted-foreground flex-row-reverse">
                            <span>👆 نقرة {ad.clicks_count}</span>
                            <span>👁 {ad.views_count} مشاهدة</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteAd(ad.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditAd(ad)}>
                            <Pencil className="w-4 h-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReportAd(ad);
                              setShowReportDialog(true);
                            }}
                            title="تقرير الإعلان"
                          >
                            <FileText className="w-4 h-4 text-blue-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins" className="space-y-6">
            {/* Add Admin Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 justify-center flex-row-reverse">
                  <UserPlus className="w-5 h-5 text-primary" />
                  إضافة مشرف جديد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitAdmin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-right block">اسم المستخدم أو البريد الإلكتروني *</Label>
                    <Input
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="أدخل اسم المستخدم"
                      className="text-right"
                      required
                    />
                  </div>

                  <div className="space-y-2" dir="rtl">
                    <Label className="text-right block">نوع الصلاحية</Label>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)} dir="rtl">
                      <SelectTrigger className="text-right flex-row-reverse">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="admin" className="text-right justify-end">مشرف (Admin) - صلاحيات كاملة</SelectItem>
                        <SelectItem value="moderator" className="text-right justify-end">مدير (Moderator) - صلاحيات محدودة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRole === "moderator" && (
                    <div className="space-y-3" dir="rtl">
                      <Label className="text-right block">اختر الصلاحيات</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {ADMIN_PERMISSIONS.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg flex-row-reverse"
                          >
                            <Checkbox
                              id={permission.id}
                              checked={selectedPermissions.includes(permission.id)}
                              onCheckedChange={() => togglePermission(permission.id)}
                            />
                            <Label htmlFor={permission.id} className="text-sm cursor-pointer">
                              {permission.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isSubmittingAdmin}>
                    {isSubmittingAdmin ? "جاري الإضافة..." : "إضافة المشرف"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Admins List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-center">المشرفين الحاليين ({adminUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : adminUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا يوجد مشرفين</p>
                ) : (
                  <div className="space-y-3">
                    {adminUsers.map((admin) => (
                      <div
                        key={admin.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              {admin.profile?.full_name || admin.profile?.username || "مستخدم"}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge variant={admin.role === "admin" ? "default" : "secondary"}>
                                {admin.role === "admin" ? "مشرف" : "مدير"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {admin.profile?.username}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAdmin(admin.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legal Pages Tab */}
          <TabsContent value="legal" className="space-y-6">
            <LegalPagesEditor />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Restaurant Dialog */}
      <Dialog open={!!editingRestaurant} onOpenChange={(open) => !open && setEditingRestaurant(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">تعديل المطعم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-right block">اسم المطعم (عربي) *</Label>
              <Input
                id="edit-name"
                value={editRestaurantName}
                onChange={(e) => setEditRestaurantName(e.target.value)}
                placeholder="أدخل اسم المطعم بالعربي"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name-en" className="text-right block">Restaurant Name (English)</Label>
              <Input
                id="edit-name-en"
                value={editRestaurantNameEn}
                onChange={(e) => setEditRestaurantNameEn(e.target.value)}
                placeholder="Enter restaurant name in English"
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cuisine" className="text-right block">نوع المطبخ * (يمكنك اختيار أكثر من نوع)</Label>
              <div className="flex flex-wrap gap-2 justify-end">
                {cuisines.map((cuisine) => {
                  const isSelected = editRestaurantCuisines.includes(cuisine.name);
                  return (
                    <button
                      key={cuisine.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setEditRestaurantCuisines(editRestaurantCuisines.filter(c => c !== cuisine.name));
                        } else {
                          setEditRestaurantCuisines([...editRestaurantCuisines, cuisine.name]);
                        }
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                      {cuisine.emoji} {cuisine.name}
                    </button>
                  );
                })}
              </div>
              {editRestaurantCuisines.length === 0 && (
                <p className="text-xs text-muted-foreground text-right">اختر نوع واحد على الأقل</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="text-right block">رقم الاتصال</Label>
              <Input
                id="edit-phone"
                value={editRestaurantPhone}
                onChange={(e) => setEditRestaurantPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-website" className="text-right block">الموقع الإلكتروني</Label>
              <Input
                id="edit-website"
                value={editRestaurantWebsite}
                onChange={(e) => setEditRestaurantWebsite(e.target.value)}
                placeholder="https://..."
                dir="ltr"
                className="text-left"
              />
            </div>
            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label className="text-right block">صورة المطعم</Label>
              <div className="flex gap-2">
                <Input
                  value={editRestaurantImage}
                  onChange={(e) => setEditRestaurantImage(e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                  className="text-left flex-1"
                />
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEditFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => editFileInputRef.current?.click()}
                  disabled={isUploadingEditImage}
                  className="shrink-0"
                >
                  {isUploadingEditImage ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {editRestaurantImage && (
                <img
                  src={editRestaurantImage}
                  alt="Preview"
                  className="w-20 h-20 rounded-lg object-cover mt-2"
                />
              )}
            </div>

            {/* Branches Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-right">الفروع والمواقع</Label>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddEditBranch}>
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة فرع
                </Button>
              </div>
              {editBranches.map((branch, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">فرع {index + 1}</span>
                    {editBranches.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEditBranch(index)}
                        className="text-destructive h-6 w-6 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={branch.mapsUrl}
                        onChange={(e) => handleEditBranchChange(index, "mapsUrl", e.target.value)}
                        placeholder="رابط Google Maps (اختياري)"
                        className={`text-left flex-1 ${branch.mapsUrl && !isValidGoogleMapsUrl(branch.mapsUrl) ? 'border-destructive' : ''}`}
                        dir="ltr"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://www.google.com/maps', '_blank')}
                      >
                        <MapPin className="w-4 h-4" />
                      </Button>
                    </div>
                    {branch.mapsUrl && !isValidGoogleMapsUrl(branch.mapsUrl) && (
                      <p className="text-xs text-destructive text-right">
                        ⚠️ الرابط غير صحيح - يجب أن يكون رابط Google Maps
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-right" dir="rtl">
                    💡 أدخل رابط Google Maps للموقع
                  </p>
                </div>
              ))}
            </div>

            {/* Delivery Apps Section  */}
            <div className="space-y-3">
              <Label className="text-right block">تطبيقات التوصيل</Label>
              <div className="flex flex-wrap gap-2">
                {DELIVERY_APPS.map((app) => (
                  <button
                    key={app.name}
                    type="button"
                    onClick={() => toggleEditDeliveryApp(app.name)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${editDeliveryApps.find((a) => a.name === app.name)
                      ? "text-white"
                      : "bg-background"
                      }`}
                    style={{
                      borderColor: app.color,
                      backgroundColor: editDeliveryApps.find((a) => a.name === app.name)
                        ? app.color
                        : undefined,
                      color: editDeliveryApps.find((a) => a.name === app.name)
                        ? "white"
                        : app.color,
                    }}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
              {editDeliveryApps.length > 0 && (
                <div className="space-y-2 mt-3">
                  {editDeliveryApps.map((app) => (
                    <div key={app.name} className="flex items-center gap-2">
                      <span className="text-sm font-medium w-20">{app.name}:</span>
                      <Input
                        value={app.url}
                        onChange={(e) => handleEditDeliveryAppUrlChange(app.name, e.target.value)}
                        placeholder="رابط التطبيق (اختياري)"
                        dir="ltr"
                        className="text-left flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex gap-2 flex-row-reverse sm:flex-row-reverse">
            <Button onClick={handleUpdateRestaurant} disabled={isUpdatingRestaurant}>
              {isUpdatingRestaurant ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
            <Button variant="outline" onClick={() => setEditingRestaurant(null)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Ad Dialog */}
      <Dialog open={!!editingAd} onOpenChange={(open) => !open && setEditingAd(null)}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">تعديل الإعلان</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-right block">المطعم *</Label>
              <Select value={editAdRestaurantId} onValueChange={setEditAdRestaurantId} dir="rtl">
                <SelectTrigger className="text-right flex-row-reverse">
                  <SelectValue placeholder="اختر المطعم" />
                </SelectTrigger>
                <SelectContent align="end">
                  {restaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id} className="text-right justify-end">
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-right block">مكان عرض الإعلان</Label>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-row-reverse">
                  <Checkbox
                    id="edit-placement-spin"
                    checked={editAdPlacements.includes("pinned_ad") || editAdPlacements.some(p => p.startsWith("pinned_ad"))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setEditAdPlacements([...editAdPlacements, "pinned_ad"]);
                      } else {
                        setEditAdPlacements(editAdPlacements.filter(p => !p.startsWith("pinned_ad")));
                      }
                    }}
                  />
                  <Label htmlFor="edit-placement-spin" className="cursor-pointer">إعلان مثبت</Label>
                </div>
                <div className="flex items-center gap-2 flex-row-reverse">
                  <Checkbox
                    id="edit-placement-weekly"
                    checked={editAdPlacements.includes("most_popular")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setEditAdPlacements([...editAdPlacements, "most_popular"]);
                      } else {
                        setEditAdPlacements(editAdPlacements.filter(p => p !== "most_popular"));
                      }
                    }}
                  />
                  <Label htmlFor="edit-placement-weekly" className="cursor-pointer">الأكثر رواجاً</Label>
                </div>
              </div>
            </div>

            {/* Max Views for pinned_ad */}
            {(editAdPlacements.includes("pinned_ad") || editAdPlacements.some(p => p.startsWith("pinned_ad"))) && (
              <div className="space-y-2">
                <Label className="text-right block">عدد مرات الظهور</Label>
                <Input
                  type="number"
                  value={editAdMaxViews || ""}
                  onChange={(e) => setEditAdMaxViews(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="أدخل عدد مرات الظهور"
                  min={1}
                  className="text-right"
                  dir="rtl"
                />
                <p className="text-xs text-muted-foreground">اتركه فارغاً للظهور بلا حدود</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right order-2">
                <Label>تاريخ البداية</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-end text-right flex-row-reverse">
                      {format(editAdStartDate, "PPP", { locale: ar })}
                      <CalendarIcon className="mr-2 h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editAdStartDate}
                      onSelect={(date) => date && setEditAdStartDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2 text-right order-1">
                <Label>تاريخ النهاية</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-end text-right flex-row-reverse">
                      {format(editAdEndDate, "PPP", { locale: ar })}
                      <CalendarIcon className="mr-2 h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editAdEndDate}
                      onSelect={(date) => date && setEditAdEndDate(date)}
                      initialFocus
                      disabled={(date) => date < editAdStartDate}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-row-reverse">
              <Label htmlFor="edit-ad-active">الحالة</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-ad-active"
                  checked={editAdIsActive}
                  onCheckedChange={(checked) => setEditAdIsActive(checked as boolean)}
                />
                <Label htmlFor="edit-ad-active" className="text-sm cursor-pointer">
                  {editAdIsActive ? "نشط" : "متوقف"}
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 flex-row-reverse sm:flex-row-reverse">
            <Button onClick={handleUpdateAd} disabled={isUpdatingAd}>
              {isUpdatingAd ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
            <Button variant="outline" onClick={() => setEditingAd(null)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ad Report Dialog */}
      <AdReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        ad={reportAd}
      />
    </div>
  );
};

export default Admin;
