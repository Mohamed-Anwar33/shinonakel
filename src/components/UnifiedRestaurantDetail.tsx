import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Phone, Heart, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { getDeliveryAppColor } from "@/lib/deliveryApps";
import GuestSignInPrompt from "@/components/GuestSignInPrompt";
interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  } | null;
}

interface DeliveryApp {
  name: string;
  color: string;
  url?: string | null;
}

export interface UnifiedRestaurantData {
  id?: string;
  name: string;
  image_url?: string | null;
  cuisine?: string | null;
  rating?: number | null;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl?: string | null;
}

interface UnifiedRestaurantDetailProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: UnifiedRestaurantData | null;
  ownerName?: string;
  ownerId?: string;
  isOwner?: boolean;
}

const UnifiedRestaurantDetail = ({
  isOpen,
  onClose,
  restaurant,
  ownerName,
  ownerId,
  isOwner = false
}: UnifiedRestaurantDetailProps) => {
  const { user, isGuest } = useAuth();
  const { language, t } = useLanguage();
  const { toast } = useToast();

  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const [deliveryApps, setDeliveryApps] = useState<DeliveryApp[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingUserRating, setExistingUserRating] = useState<Review | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [cuisineEmoji, setCuisineEmoji] = useState("🍽️");
  const [cuisineDisplay, setCuisineDisplay] = useState("");
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);

  useEffect(() => {
    if (isOpen && restaurant) {
      checkFavoriteStatus();
      fetchDeliveryApps();
      fetchReviews();
      fetchCuisineEmoji();
    }
  }, [isOpen, restaurant?.id, restaurant?.name]);

  const fetchCuisineEmoji = async () => {
    if (!restaurant?.cuisine) {
      setCuisineEmoji("🍽️");
      setCuisineDisplay("");
      return;
    }

    const { data } = await supabase
      .from("cuisines")
      .select("emoji, name, name_en")
      .eq("name", restaurant.cuisine)
      .maybeSingle();

    setCuisineEmoji(data?.emoji || "🍽️");
    setCuisineDisplay(language === "en" ? (data?.name_en || restaurant.cuisine) : restaurant.cuisine);
  };

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

  const fetchDeliveryApps = async () => {
    if (!restaurant?.id) {
      setDeliveryApps([]);
      return;
    }

    const { data } = await supabase
      .from("restaurant_delivery_apps")
      .select("app_name, app_url")
      .eq("restaurant_id", restaurant.id);

    if (data) {
      setDeliveryApps(data.map(app => ({
        name: app.app_name,
        color: getDeliveryAppColor(app.app_name),
        url: app.app_url
      })));
    } else {
      setDeliveryApps([]);
    }
  };

  const fetchReviews = async () => {
    if (!restaurant?.id) {
      setReviews([]);
      return;
    }

    setIsLoadingReviews(true);
    try {
      const { data: ratingsData, error } = await supabase
        .from("restaurant_ratings")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = (ratingsData || []).map(r => r.user_id);
      const uniqueUserIds = [...new Set(userIds)];

      let profilesMap: Record<string, { username: string; avatar_url: string | null }> = {};

      if (uniqueUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", uniqueUserIds);

        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = { username: p.username, avatar_url: p.avatar_url };
          return acc;
        }, {} as Record<string, { username: string; avatar_url: string | null }>);
      }

      const reviewsWithProfiles: Review[] = (ratingsData || []).map(rating => ({
        ...rating,
        profile: profilesMap[rating.user_id] || null
      }));

      setReviews(reviewsWithProfiles);

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

  const toggleFavorite = async () => {
    if (!user || isGuest) {
      setShowGuestPrompt(true);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileData?.username) {
      toast({
        title: t("أكمل ملفك الشخصي", "Complete your profile"),
        description: t("يرجى إضافة اسم مستخدم أولاً من صفحة الملف الشخصي", "Please add a username first from the profile page"),
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
      } else {
        await supabase.from("saved_restaurants").insert({
          user_id: user.id,
          name: restaurant.name,
          image_url: restaurant.image_url,
          rating: restaurant.rating,
          category: restaurant.cuisine,
          address: restaurant.address || null
        });
        setIsFavorite(true);
      }
    } catch (error: any) {
      toast({ title: t("خطأ", "Error"), description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!user || isGuest) {
      setShowGuestPrompt(true);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileData?.username) {
      toast({
        title: t("أكمل ملفك الشخصي", "Complete your profile"),
        description: t("يرجى إضافة اسم مستخدم أولاً من صفحة الملف الشخصي", "Please add a username first from the profile page"),
        variant: "destructive"
      });
      return;
    }

    if (!restaurant?.id || userRating === 0) {
      toast({ title: t("اختر تقييم", "Select rating"), description: t("يرجى اختيار عدد النجوم", "Please select a star rating"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingUserRating) {
        const { error } = await supabase
          .from("restaurant_ratings")
          .update({ rating: userRating, comment: userComment || null })
          .eq("id", existingUserRating.id);

        if (error) throw error;
        toast({ title: t("تم التحديث", "Updated"), description: t("تم تحديث تقييمك بنجاح", "Your review was updated successfully") });
      } else {
        const { error } = await supabase
          .from("restaurant_ratings")
          .insert({
            restaurant_id: restaurant.id,
            user_id: user.id,
            rating: userRating,
            comment: userComment || null
          });

        if (error) throw error;
        toast({ title: t("تم الإضافة", "Added"), description: t("تم إضافة تقييمك بنجاح", "Your review was added successfully") });
      }

      setShowRatingForm(false);
      fetchReviews();
    } catch (error: any) {
      toast({ title: t("خطأ", "Error"), description: error.message, variant: "destructive" });
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

      toast({ title: t("تم الحذف", "Deleted"), description: t("تم حذف تقييمك", "Your review was deleted") });
      setExistingUserRating(null);
      setUserRating(0);
      setUserComment("");
      setShowRatingForm(false);
      fetchReviews();
    } catch (error: any) {
      toast({ title: t("خطأ", "Error"), description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!restaurant) return null;

  const openExternal = (url: string) => {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = url;
  };

  const normalizeWebUrl = (urlString: string): string | null => {
    const trimmed = urlString.trim();
    if (!trimmed) return null;
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

  const handleCall = () => {
    if (!restaurant.phone) return;
    window.location.href = `tel:${normalizePhone(restaurant.phone)}`;
  };

  const handleDirections = () => {
    if (restaurant.mapsUrl) {
      openExternal(restaurant.mapsUrl);
    } else if (restaurant.latitude && restaurant.longitude) {
      openExternal(`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`);
    } else {
      // استخدام اسم المطعم للبحث في Google Maps
      const searchQuery = encodeURIComponent(restaurant.name);
      openExternal(`https://www.google.com/maps/search/${searchQuery}`);
    }
  };

  const canShowDirections = !!restaurant.name; // دائماً نعرض الأيقونة لأن لدينا اسم المطعم

  const handleDeliveryApp = (app: DeliveryApp) => {
    if (!app.url) return;
    const url = normalizeWebUrl(app.url);
    if (url) openExternal(url);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : restaurant.rating?.toFixed(1) || "0.0";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 max-h-[85vh] overflow-hidden"
              dir={language === "ar" ? "rtl" : "ltr"}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-muted rounded-full" />
              </div>

              <div className={`absolute top-4 ${language === "ar" ? "left-4" : "right-4"} flex items-center gap-2 z-10`}>
                <button
                  onClick={toggleFavorite}
                  disabled={isLoadingFavorite}
                  className="w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                  />
                </button>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[calc(85vh-40px)]">
                {/* Image */}
                <div className="relative h-60">
                  {restaurant.image_url ? (
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-6xl">🍽️</span>
                    </div>
                  )}
                  {/* Subtle bottom fade for legibility (avoid washing out the whole image) */}
                  <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-28 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />
                </div>

                <div className="px-5 -mt-8 relative">
                  {/* Info Card */}
                  <div className="bg-card rounded-2xl p-5 shadow-elevated mb-5">
                    {/* Cuisine */}
                    {restaurant.cuisine && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                        <span className="text-lg">{cuisineEmoji}</span>
                        <span>{cuisineDisplay || restaurant.cuisine}</span>
                      </div>
                    )}

                    {/* Name and Rating */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold">{restaurant.name}</h2>
                        {ownerName && (
                          <p className="text-sm text-primary mt-1">{t(`من قائمة ${ownerName}`, `From ${ownerName}'s list`)}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 bg-amber-100 px-3 py-1.5 rounded-xl shrink-0">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span className="text-lg font-bold text-foreground">{avgRating}</span>
                        {reviews.length > 0 && (
                          <span className="text-xs text-muted-foreground">({reviews.length})</span>
                        )}
                      </div>
                    </div>

                    {/* Action Icons Row */}
                    <div className="flex items-center gap-3">
                      {/* Phone */}
                      <button
                        onClick={handleCall}
                        disabled={!canCall}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${canCall ? "bg-primary/10 hover:bg-primary/20" : "bg-muted/50 opacity-50 cursor-not-allowed"
                          }`}
                      >
                        <Phone className={`w-5 h-5 ${canCall ? "text-primary" : "text-muted-foreground"}`} />
                      </button>

                      {/* Directions */}
                      <button
                        onClick={handleDirections}
                        disabled={!canShowDirections}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${canShowDirections ? "bg-primary/10 hover:bg-primary/20" : "bg-muted/50 opacity-50 cursor-not-allowed"
                          }`}
                      >
                        <MapPin className={`w-5 h-5 ${canShowDirections ? "text-primary" : "text-muted-foreground"}`} />
                      </button>

                      {/* Delivery Apps */}
                      {deliveryApps.map((app) => (
                        <button
                          key={app.name}
                          onClick={() => handleDeliveryApp(app)}
                          disabled={!app.url}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${app.url ? "hover:scale-105 cursor-pointer bg-card" : "opacity-50 cursor-not-allowed bg-muted/50"
                            }`}
                          style={{ borderColor: app.color, color: app.color }}
                        >
                          {app.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add Rating Button - Show for everyone, but handle auth in action */}
                  {restaurant.id && (
                    <div className="mb-5">
                      {!showRatingForm ? (
                        <Button
                          onClick={() => {
                            if (!user || isGuest) {
                              toast({
                                title: t("سجّل دخولك", "Sign in required"),
                                description: t("قم بتسجيل الدخول لإضافة تقييم", "Sign in to add a review"),
                                variant: "destructive"
                              });
                              return;
                            }
                            setShowRatingForm(true);
                          }}
                          className="w-full"
                          variant={existingUserRating ? "outline" : "default"}
                        >
                          <Star className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                          {existingUserRating ? t("تعديل تقييمك", "Edit your review") : t("أضف تقييمك", "Add your review")}
                        </Button>
                      ) : (
                        <div className="bg-muted/50 rounded-xl p-4 space-y-4">
                          <h4 className="font-bold text-center">
                            {existingUserRating ? t("تعديل تقييمك", "Edit your review") : t("أضف تقييمك", "Add your review")}
                          </h4>

                          <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setUserRating(star)}
                                className="p-1 transition-transform hover:scale-110"
                              >
                                <Star
                                  className={`w-8 h-8 ${star <= userRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                                    }`}
                                />
                              </button>
                            ))}
                          </div>

                          <Textarea
                            placeholder={t("قيّم وشاركنا أطباقك المفضلة...", "Rate and share your favorite dishes...")}
                            value={userComment}
                            onChange={(e) => setUserComment(e.target.value)}
                            className={language === "ar" ? "text-right" : "text-left"}
                            rows={3}
                          />

                          <div className="flex gap-2">
                            <Button
                              onClick={handleSubmitRating}
                              disabled={isSubmitting || userRating === 0}
                              className="flex-1"
                            >
                              {isSubmitting ? t("جاري الحفظ...", "Saving...") : t("حفظ التقييم", "Save Review")}
                            </Button>
                            <Button variant="outline" onClick={() => setShowRatingForm(false)} disabled={isSubmitting}>
                              {t("إلغاء", "Cancel")}
                            </Button>
                            {existingUserRating && (
                              <Button variant="destructive" onClick={handleDeleteRating} disabled={isSubmitting}>
                                {t("حذف", "Delete")}
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
                      <h3 className="text-lg font-bold">{t("التقييمات", "Reviews")}</h3>
                      <span className="text-sm text-muted-foreground">{reviews.length} {t("تقييم", "reviews")}</span>
                    </div>

                    {/* Rating Summary */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl mb-4">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-primary">{avgRating}</p>
                        <div className="flex items-center gap-0.5 mt-1 justify-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-muted"
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
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reviews List */}
                    {isLoadingReviews ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t("لا توجد تقييمات بعد. كن أول من يقيّم!", "No reviews yet. Be the first to review!")}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(() => {
                          // Sort reviews to show owner's review first
                          const sortedReviews = [...reviews].sort((a, b) => {
                            if (ownerId) {
                              if (a.user_id === ownerId) return -1;
                              if (b.user_id === ownerId) return 1;
                            }
                            return 0;
                          });

                          return sortedReviews.map((review, index) => {
                            const isOwnerReview = ownerId && review.user_id === ownerId;
                            return (
                              <motion.div
                                key={review.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`p-4 rounded-xl ${isOwnerReview ? "bg-primary/10 border-2 border-primary/30" : "bg-muted/50"}`}
                              >
                                <div className="flex items-start gap-3 mb-2">
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={review.profile?.avatar_url || undefined} />
                                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                      {review.profile?.username?.charAt(0).toUpperCase() || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-medium">{review.profile?.username || t("مستخدم", "User")}</h4>
                                      {isOwnerReview && (
                                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                          {t("صاحب القائمة", "List Owner")}
                                        </span>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: language === "ar" ? ar : enUS })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-0.5 mt-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-3 h-3 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                {review.comment && (
                                  <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                                )}
                              </motion.div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <GuestSignInPrompt
        isOpen={showGuestPrompt}
        onClose={() => setShowGuestPrompt(false)}
      />
    </>
  );
};

export default UnifiedRestaurantDetail;
