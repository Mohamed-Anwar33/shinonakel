import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Heart, Star, Phone, MapPin, Globe, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import GuestSignInPrompt from "@/components/GuestSignInPrompt";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getDeliveryAppColor } from "@/lib/deliveryApps";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  user_id: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface DeliveryApp {
  name: string;
  color: string;
  url: string | null;
}

interface RestaurantData {
  id: string;
  name: string;
  name_en: string | null;
  cuisine: string;
  image_url: string | null;
  phone: string | null;
  website: string | null;
  branches: {
    id: string;
    branch_name: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    google_maps_url: string | null;
  }[];
  delivery_apps: DeliveryApp[];
}

const RestaurantDetailPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { language, t } = useLanguage();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [cuisineEmoji, setCuisineEmoji] = useState("🍽️");
  const [cuisineDisplayName, setCuisineDisplayName] = useState("");
  
  // User rating state
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);

  const backUrl = searchParams.get("from") || "/results";

  useEffect(() => {
    if (id) {
      fetchRestaurant();
      fetchReviews();
    }
  }, [id]);

  useEffect(() => {
    if (user && !isGuest && restaurant) {
      checkFavoriteStatus();
    }
  }, [user, isGuest, restaurant]);

  const fetchRestaurant = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select(`
          *,
          branches:restaurant_branches(*),
          delivery_apps:restaurant_delivery_apps(*)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const transformedData: RestaurantData = {
          ...data,
          branches: data.branches || [],
          delivery_apps: (data.delivery_apps || []).map((app: any) => ({
            name: app.app_name,
            color: getDeliveryAppColor(app.app_name),
            url: app.app_url
          }))
        };
        setRestaurant(transformedData);
        
        // Fetch cuisine emoji
        const { data: cuisineData } = await supabase
          .from("cuisines")
          .select("emoji, name, name_en")
          .eq("name", data.cuisine)
          .maybeSingle();
        
        if (cuisineData) {
          setCuisineEmoji(cuisineData.emoji || "🍽️");
          setCuisineDisplayName(language === "en" && cuisineData.name_en ? cuisineData.name_en : cuisineData.name);
        } else {
          setCuisineDisplayName(data.cuisine);
        }
      }
    } catch (error) {
      console.error("Error fetching restaurant:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurant_ratings")
        .select(`
          *,
          profiles:user_id (username, full_name, avatar_url)
        `)
        .eq("restaurant_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reviewsData = (data || []) as Review[];
      setReviews(reviewsData);
      
      // Calculate average
      if (reviewsData.length > 0) {
        const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0);
        setAvgRating(Number((sum / reviewsData.length).toFixed(1)));
        setRatingCount(reviewsData.length);
      }

      // Check for user's existing review
      if (user) {
        const userReview = reviewsData.find(r => r.user_id === user.id);
        if (userReview) {
          setExistingReview(userReview);
          setUserRating(userReview.rating);
          setUserComment(userReview.comment || "");
        }
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user || !restaurant) return;
    
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
      setShowGuestPrompt(true);
      return;
    }
    if (!restaurant) return;

    try {
      if (isFavorite) {
        await supabase
          .from("saved_restaurants")
          .delete()
          .eq("user_id", user.id)
          .eq("name", restaurant.name);

        setIsFavorite(false);
        toast({
          title: t("تم الإزالة", "Removed"),
          description: t("تم إزالة المطعم من قائمتك", "Restaurant removed from your list")
        });
      } else {
        await supabase
          .from("saved_restaurants")
          .insert({
            user_id: user.id,
            name: restaurant.name,
            image_url: restaurant.image_url,
            category: restaurant.cuisine
          });

        setIsFavorite(true);
        toast({
          title: t("تم الحفظ", "Saved"),
          description: t("تم إضافة المطعم إلى قائمتك", "Restaurant added to your list")
        });
      }
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSubmitRating = async () => {
    if (!user || isGuest) {
      setShowGuestPrompt(true);
      return;
    }
    if (userRating === 0) return;

    setIsSubmitting(true);
    try {
      if (existingReview) {
        await supabase
          .from("restaurant_ratings")
          .update({ rating: userRating, comment: userComment || null })
          .eq("id", existingReview.id);
      } else {
        await supabase
          .from("restaurant_ratings")
          .insert({
            restaurant_id: id,
            user_id: user.id,
            rating: userRating,
            comment: userComment || null
          });
      }

      toast({
        title: t("تم الحفظ", "Saved"),
        description: t("تم حفظ تقييمك بنجاح", "Your rating has been saved")
      });
      
      setShowRatingForm(false);
      fetchReviews();
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMapClick = () => {
    const branch = restaurant?.branches?.[0];
    if (branch?.google_maps_url) {
      window.open(branch.google_maps_url, '_blank', 'noopener,noreferrer');
    } else if (branch?.latitude && branch?.longitude) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`, '_blank', 'noopener,noreferrer');
    }
  };

  // Rating distribution calculation
  const ratingDistribution = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(r => r.rating === star).length;
    const percentage = ratingCount > 0 ? (count / ratingCount) * 100 : 0;
    return { star, count, percentage };
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("المطعم غير موجود", "Restaurant not found")}</p>
      </div>
    );
  }

  const displayName = language === "en" && restaurant.name_en ? restaurant.name_en : restaurant.name;
  const primaryBranch = restaurant.branches[0];

  return (
    <div className="min-h-screen bg-background pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header with Image */}
      <div className="relative">
        {/* Back & Favorite Buttons */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
          <button
            onClick={() => navigate(backUrl)}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-soft"
          >
            {language === "ar" ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          
          <button
            onClick={toggleFavorite}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-soft"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        </div>

        {/* Restaurant Image */}
        <div className="w-full aspect-video">
          <img
            src={restaurant.image_url || "/placeholder.svg"}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Content Card */}
      <div className="relative -mt-6 bg-card rounded-t-3xl px-4 pt-6 pb-4">
        {/* Cuisine Badge */}
        <div className="flex justify-end mb-2">
          <span className="text-sm text-muted-foreground">
            {cuisineEmoji} {cuisineDisplayName}
          </span>
        </div>

        {/* Name & Rating Row */}
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-xl font-bold">{displayName}</h1>
          <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
            <Star className="w-4 h-4 fill-accent text-accent" />
            <span className="font-bold">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({ratingCount})</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mb-6">
          {restaurant.delivery_apps.map((app) => (
            <button
              key={app.name}
              onClick={() => app.url && window.open(app.url, '_blank', 'noopener,noreferrer')}
              className="px-4 py-2 rounded-full text-sm font-bold border-2 bg-white transition-transform hover:scale-105"
              style={{ borderColor: app.color, color: app.color }}
            >
              {app.name}
            </button>
          ))}
          
          {(primaryBranch?.google_maps_url || (primaryBranch?.latitude && primaryBranch?.longitude)) && (
            <button
              onClick={handleMapClick}
              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <MapPin className="w-5 h-5 text-primary" />
            </button>
          )}
          
          {restaurant.phone && (
            <a
              href={`tel:${restaurant.phone}`}
              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <Phone className="w-5 h-5 text-primary" />
            </a>
          )}
        </div>

        {/* Rate Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (!user || isGuest) {
              setShowGuestPrompt(true);
            } else {
              setShowRatingForm(!showRatingForm);
            }
          }}
          className="w-full py-4 bg-accent text-accent-foreground font-bold rounded-2xl flex items-center justify-center gap-2 mb-6"
        >
          <Star className="w-5 h-5" />
          {existingReview ? t("تعديل تقييمك", "Edit your rating") : t("أضف تقييمك", "Add your rating")}
        </motion.button>

        {/* Rating Form */}
        {showRatingForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-muted rounded-2xl"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setUserRating(star)}
                  className="p-1"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= userRating ? "fill-accent text-accent" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            
            <textarea
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              placeholder={t("أضف تعليق (اختياري)", "Add a comment (optional)")}
              className="w-full p-3 rounded-xl bg-background border border-border text-foreground resize-none"
              rows={3}
            />
            
            <button
              onClick={handleSubmitRating}
              disabled={userRating === 0 || isSubmitting}
              className="w-full mt-3 py-3 bg-primary text-primary-foreground font-bold rounded-xl disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t("حفظ التقييم", "Save Rating")}
            </button>
          </motion.div>
        )}

        {/* Ratings Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">{t("التقييمات", "Ratings")}</h2>
            <span className="text-sm text-muted-foreground">{ratingCount} {t("تقييم", "reviews")}</span>
          </div>

          {/* Rating Distribution */}
          <div className="bg-primary/5 rounded-2xl p-4">
            <div className="flex items-center gap-4">
              {/* Distribution Bars */}
              <div className="flex-1 space-y-2">
                {ratingDistribution.map(({ star, percentage }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-sm w-4 text-end">{star}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Average Score */}
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{avgRating.toFixed(1)}</div>
                <div className="flex items-center justify-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(avgRating) ? "fill-accent text-accent" : "text-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 bg-muted rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {review.profiles?.avatar_url ? (
                      <img src={review.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-primary">
                        {review.profiles?.username?.charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {review.profiles?.full_name || review.profiles?.username || t("مستخدم", "User")}
                    </p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= review.rating ? "fill-accent text-accent" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      <GuestSignInPrompt 
        isOpen={showGuestPrompt} 
        onClose={() => setShowGuestPrompt(false)} 
      />
    </div>
  );
};

export default RestaurantDetailPage;
