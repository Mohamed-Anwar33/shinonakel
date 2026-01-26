import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, MapPin, Clock, Phone, ExternalLink, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface DeliveryApp {
  name: string;
  color: string;
  url?: string | null;
}

interface RestaurantDetailProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: {
    id?: string | number;
    name: string;
    image: string;
    rating: number;
    ratingCount?: number;
    distance: string;
    cuisine: string;
    isOpen?: boolean;
    phone?: string | null;
    website?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    mapsUrl?: string | null;
    deliveryApps?: DeliveryApp[];
  } | null;
}

const RestaurantDetail = ({ isOpen, onClose, restaurant }: RestaurantDetailProps) => {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingUserRating, setExistingUserRating] = useState<Review | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);

  useEffect(() => {
    if (isOpen && restaurant?.id) {
      fetchReviews();
      checkFavoriteStatus();
    }
  }, [isOpen, restaurant?.id]);

  const checkFavoriteStatus = async () => {
    if (!user || isGuest || !restaurant?.name) return;
    
    const { data } = await supabase
      .from("saved_restaurants")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", restaurant.name)
      .maybeSingle();
    
    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    if (!user || isGuest) {
      toast({
        title: "سجّل دخولك",
        description: "قم بتسجيل الدخول لحفظ المطاعم في قائمتك",
        variant: "destructive"
      });
      return;
    }

    // Check if user has a profile with username
    const { data: profileData } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileData?.username) {
      toast({
        title: "أكمل ملفك الشخصي",
        description: "يرجى إضافة اسم مستخدم أولاً من صفحة الملف الشخصي",
        variant: "destructive"
      });
      return;
    }

    if (!restaurant) return;

    setIsLoadingFavorite(true);
    try {
      if (isFavorite) {
        await supabase
          .from("saved_restaurants")
          .delete()
          .eq("user_id", user.id)
          .eq("name", restaurant.name);
        setIsFavorite(false);
        toast({
          title: "تم الإزالة",
          description: "تم إزالة المطعم من قائمتك"
        });
      } else {
        await supabase.from("saved_restaurants").insert({
          user_id: user.id,
          name: restaurant.name,
          image_url: restaurant.image,
          rating: restaurant.rating,
          category: restaurant.cuisine,
          address: restaurant.distance || null
        });
        setIsFavorite(true);
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const fetchReviews = async () => {
    if (!restaurant?.id || typeof restaurant.id !== 'string') return;
    
    const restaurantId = restaurant.id;
    
    setIsLoadingReviews(true);
    try {
      // Fetch ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("restaurant_ratings")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (ratingsError) throw ratingsError;
      
      // Fetch all profiles in a single batch query (fixes N+1 query issue)
      const userIds = (ratingsData || []).map(r => r.user_id);
      const uniqueUserIds = [...new Set(userIds)];
      
      let profilesMap: Record<string, { username: string; full_name: string | null; avatar_url: string | null }> = {};
      
      if (uniqueUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", uniqueUserIds);
        
        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = { username: p.username, full_name: p.full_name, avatar_url: p.avatar_url };
          return acc;
        }, {} as Record<string, { username: string; full_name: string | null; avatar_url: string | null }>);
      }
      
      const reviewsWithProfiles: Review[] = (ratingsData || []).map(rating => ({
        ...rating,
        profile: profilesMap[rating.user_id] || null
      }));
      
      setReviews(reviewsWithProfiles);
      
      // Check if user has already rated
      if (user && !isGuest) {
        const userReview = reviewsWithProfiles.find(r => r.user_id === user.id);
        if (userReview) {
          setExistingUserRating(userReview);
          setUserRating(userReview.rating);
          setUserComment(userReview.comment || "");
        } else {
          setExistingUserRating(null);
          setUserRating(0);
          setUserComment("");
        }
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!user || isGuest) {
      toast({
        title: "سجّل دخولك",
        description: "قم بتسجيل الدخول لإضافة تقييم",
        variant: "destructive"
      });
      return;
    }

    // Check if user has a profile with username
    const { data: profileData } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileData?.username) {
      toast({
        title: "أكمل ملفك الشخصي",
        description: "يرجى إضافة اسم مستخدم أولاً من صفحة الملف الشخصي",
        variant: "destructive"
      });
      return;
    }

    if (!restaurant?.id) return;
    if (userRating === 0) {
      toast({
        title: "اختر تقييم",
        description: "يرجى اختيار عدد النجوم",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingUserRating) {
        // Update existing rating
        const { error } = await supabase
          .from("restaurant_ratings")
          .update({
            rating: userRating,
            comment: userComment || null
          })
          .eq("id", existingUserRating.id);

        if (error) throw error;

        toast({
          title: "تم التحديث",
          description: "تم تحديث تقييمك بنجاح"
        });
      } else {
        // Insert new rating
        if (typeof restaurant.id !== 'string') return;
        
        const { error } = await supabase
          .from("restaurant_ratings")
          .insert({
            restaurant_id: restaurant.id,
            user_id: user.id,
            rating: userRating,
            comment: userComment || null
          });

        if (error) throw error;

        toast({
          title: "تم الإضافة",
          description: "تم إضافة تقييمك بنجاح"
        });
      }

      setShowRatingForm(false);
      fetchReviews();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!existingUserRating) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("restaurant_ratings")
        .delete()
        .eq("id", existingUserRating.id);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف تقييمك"
      });

      setExistingUserRating(null);
      setUserRating(0);
      setUserComment("");
      setShowRatingForm(false);
      fetchReviews();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!restaurant) return null;

  const openExternal = (url: string) => {
    // Some in-app browsers/iframes block window.open; fallback to location change.
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      window.location.href = url;
    }
  };

  const normalizeWebUrl = (urlString: string): string | null => {
    const trimmed = urlString.trim();
    if (!trimmed) return null;

    // If user entered domain without protocol, assume https.
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
      const url = new URL(withProtocol);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url.toString();
    } catch {
      return null;
    }
  };

  const normalizePhone = (phone: string): string => phone.replace(/\s+/g, "");

  const canCall = !!restaurant.phone?.trim();
  const websiteUrl = restaurant.website ? normalizeWebUrl(restaurant.website) : null;
  const canOpenWebsite = !!websiteUrl;

  const handleCall = () => {
    if (!restaurant.phone) return;
    // Prefer location for tel: links (more compatible than window.open in iframes)
    window.location.href = `tel:${normalizePhone(restaurant.phone)}`;
  };

  const handleDirections = () => {
    // Priority: mapsUrl > coordinates > address
    if (restaurant.mapsUrl) {
      openExternal(restaurant.mapsUrl);
    } else if (restaurant.latitude && restaurant.longitude) {
      openExternal(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${restaurant.latitude},${restaurant.longitude}`
        )}`
      );
    } else if (restaurant.address) {
      openExternal(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(restaurant.address)}`
      );
    }
  };

  const canShowDirections = !!restaurant.mapsUrl || !!(restaurant.latitude && restaurant.longitude) || !!restaurant.address;

  const handleWebsite = () => {
    if (!websiteUrl) {
      toast({
        title: "رابط غير صحيح",
        description: "أضف رابط يبدأ بـ https:// أو اكتب اسم الموقع مثل thinnies.com",
        variant: "destructive",
      });
      return;
    }
    openExternal(websiteUrl);
  };
  const handleDeliveryApp = (app: DeliveryApp) => {
    if (!app.url) return;
    const url = normalizeWebUrl(app.url);
    if (!url) {
      toast({
        title: "رابط غير صحيح",
        description: "تأكد من أن رابط التطبيق يبدأ بـ https://",
        variant: "destructive",
      });
      return;
    }
    openExternal(url);
  };

  const deliveryApps = restaurant.deliveryApps || [];
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : restaurant.rating.toFixed(1);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 max-h-[85vh] overflow-hidden"
            dir="rtl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted rounded-full" />
            </div>

            {/* Action buttons */}
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
              {/* Favorite button */}
              <button
                onClick={toggleFavorite}
                disabled={isLoadingFavorite}
                className="w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isFavorite ? "fill-primary text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                />
              </button>
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-40px)]">
              {/* Restaurant Header Image */}
              <div className="relative h-52">
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              </div>

              <div className="px-5 -mt-8 relative">
                {/* Restaurant Info Card */}
                <div className="bg-card rounded-2xl p-5 shadow-elevated mb-5">
                  {/* Name and Rating Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {/* Name */}
                    <h2 className="text-xl font-bold flex-1">{restaurant.name}</h2>
                    
                    {/* Rating Badge */}
                    <div className="flex items-center gap-1.5 bg-amber-100 px-3 py-1.5 rounded-xl shrink-0">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      <span className="text-lg font-bold text-foreground">{avgRating}</span>
                      {reviews.length > 0 && (
                        <span className="text-xs text-muted-foreground">({reviews.length})</span>
                      )}
                    </div>
                  </div>

                  {/* Info Row */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">🍽️</span>
                      <span>{restaurant.cuisine}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{restaurant.distance}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-success" />
                      <span className="text-success font-medium">مفتوح الآن</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                 <div className="grid grid-cols-3 gap-3 mb-6">
                  <button 
                    onClick={handleCall}
                    disabled={!canCall}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
                      canCall 
                        ? "bg-primary/10 hover:bg-primary/15" 
                        : "bg-muted/50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <Phone className={`w-6 h-6 ${canCall ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${canCall ? "text-primary" : "text-muted-foreground"}`}>اتصال</span>
                  </button>
                  <button 
                    onClick={handleDirections}
                    disabled={!canShowDirections}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
                      canShowDirections 
                        ? "bg-primary/10 hover:bg-primary/15" 
                        : "bg-muted/50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <MapPin className={`w-6 h-6 ${canShowDirections ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${canShowDirections ? "text-primary" : "text-muted-foreground"}`}>الاتجاهات</span>
                  </button>
                  <button 
                    onClick={handleWebsite}
                    disabled={!canOpenWebsite}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
                      canOpenWebsite 
                        ? "bg-primary/10 hover:bg-primary/15" 
                        : "bg-muted/50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <ExternalLink className={`w-6 h-6 ${canOpenWebsite ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${canOpenWebsite ? "text-primary" : "text-muted-foreground"}`}>الموقع</span>
                  </button>
                </div>

                {/* Delivery Apps Section */}
                {deliveryApps.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-4">اطلب عبر</h3>
                    <div className="flex flex-wrap gap-3">
                      {deliveryApps.map((app) => (
                        <button
                          key={app.name}
                          onClick={() => handleDeliveryApp(app)}
                          disabled={!app.url}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-full text-sm font-semibold border-2 transition-all bg-card leading-none ${
                            app.url ? "hover:scale-105 cursor-pointer" : "opacity-50 cursor-not-allowed"
                          }`}
                          style={{ borderColor: app.color, color: app.color }}
                        >
                          {app.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Rating Button */}
                {user && !isGuest && restaurant.id && (
                  <div className="mb-6">
                    {!showRatingForm ? (
                      <Button 
                        onClick={() => setShowRatingForm(true)}
                        className="w-full"
                        variant={existingUserRating ? "outline" : "default"}
                      >
                        <Star className="w-4 h-4 ml-2" />
                        {existingUserRating ? "تعديل تقييمك" : "أضف تقييمك"}
                      </Button>
                    ) : (
                      <div className="bg-muted/50 rounded-xl p-4 space-y-4">
                        <h4 className="font-bold text-center">
                          {existingUserRating ? "تعديل تقييمك" : "أضف تقييمك"}
                        </h4>
                        
                        {/* Star Rating */}
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setUserRating(star)}
                              className="p-1 transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-8 h-8 ${
                                  star <= userRating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </button>
                          ))}
                        </div>

                        {/* Comment */}
                        <Textarea
                          placeholder="قيّم وشاركنا أطباقك المفضلة..."
                          value={userComment}
                          onChange={(e) => setUserComment(e.target.value)}
                          className="text-right"
                          rows={3}
                        />

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            onClick={handleSubmitRating}
                            disabled={isSubmitting || userRating === 0}
                            className="flex-1"
                          >
                            {isSubmitting ? "جاري الحفظ..." : "حفظ التقييم"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowRatingForm(false)}
                            disabled={isSubmitting}
                          >
                            إلغاء
                          </Button>
                          {existingUserRating && (
                            <Button
                              variant="destructive"
                              onClick={handleDeleteRating}
                              disabled={isSubmitting}
                            >
                              حذف
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reviews Section */}
                <div className="pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">التقييمات والآراء</h3>
                    <span className="text-sm text-muted-foreground">
                      {reviews.length} تقييم
                    </span>
                  </div>

                  {/* Rating Summary */}
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl mb-4">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-primary">{avgRating}</p>
                      <div className="flex items-center gap-0.5 mt-1 justify-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= Math.round(Number(avgRating))
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = reviews.filter(r => r.rating === rating).length;
                        const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                        return (
                          <div key={rating} className="flex items-center gap-2 flex-row-reverse">
                            <span className="text-xs w-3">{rating}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reviews List */}
                  {isLoadingReviews ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      لا توجد تقييمات بعد. كن أول من يقيّم!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review, index) => (
                        <motion.div
                          key={review.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 bg-muted/50 rounded-xl"
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-xl overflow-hidden">
                              {review.profile?.avatar_url ? (
                                <img 
                                  src={review.profile.avatar_url} 
                                  alt="" 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                "👤"
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">
                                  {review.profile?.username || "مستخدم"}
                                </h4>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(review.created_at), { 
                                    addSuffix: true, 
                                    locale: ar 
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3 h-3 ${
                                      star <= review.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-muted"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {review.comment}
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RestaurantDetail;