import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, MapPin, Clock, Phone, ExternalLink, Navigation, Edit2, Save, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SavedRestaurant {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  rating: number | null;
  distance: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

interface OtherUserRating {
  id: string;
  rating: number | null;
  notes: string | null;
  username: string;
  avatar_url: string | null;
}

interface SavedRestaurantDetailProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: SavedRestaurant | null;
  onUpdate?: (restaurant: SavedRestaurant) => void;
  isOwner?: boolean;
  ownerName?: string;
}

const SavedRestaurantDetail = ({ 
  isOpen, 
  onClose, 
  restaurant, 
  onUpdate,
  isOwner = false,
  ownerName
}: SavedRestaurantDetailProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedRating, setEditedRating] = useState<number>(restaurant?.rating || 0);
  const [editedNotes, setEditedNotes] = useState(restaurant?.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [otherRatings, setOtherRatings] = useState<OtherUserRating[]>([]);
  const [isLoadingRatings, setIsLoadingRatings] = useState(false);

  useEffect(() => {
    if (isOpen && restaurant) {
      fetchOtherRatings();
    }
  }, [isOpen, restaurant?.name]);

  const fetchOtherRatings = async () => {
    if (!restaurant) return;
    
    setIsLoadingRatings(true);
    try {
      // Fetch other users' ratings for the same restaurant name
      const { data, error } = await supabase
        .from("saved_restaurants")
        .select(`
          id,
          rating,
          notes,
          user_id
        `)
        .eq("name", restaurant.name)
        .neq("id", restaurant.id)
        .not("rating", "is", null)
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch profile info for each user
        const userIds = data.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        const ratingsWithProfiles: OtherUserRating[] = data.map(r => {
          const profile = profiles?.find(p => p.id === r.user_id);
          return {
            id: r.id,
            rating: r.rating,
            // SECURITY: Notes are private - only show to owner, never to other users
            notes: null,
            username: profile?.username || "مستخدم",
            avatar_url: profile?.avatar_url || null
          };
        });

        setOtherRatings(ratingsWithProfiles);
      } else {
        setOtherRatings([]);
      }
    } catch (error) {
      console.error("Error fetching other ratings:", error);
      setOtherRatings([]);
    } finally {
      setIsLoadingRatings(false);
    }
  };

  if (!restaurant) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("saved_restaurants")
        .update({
          rating: editedRating,
          notes: editedNotes
        })
        .eq("id", restaurant.id);

      if (error) throw error;

      const updatedRestaurant = {
        ...restaurant,
        rating: editedRating,
        notes: editedNotes
      };
      
      onUpdate?.(updatedRestaurant);
      setIsEditing(false);
      toast({
        title: "تم الحفظ",
        description: "تم تحديث معلومات المطعم"
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = () => {
    setEditedRating(restaurant.rating || 0);
    setEditedNotes(restaurant.notes || "");
    setIsEditing(true);
  };

  // Calculate average rating
  const allRatings = [
    ...(restaurant.rating ? [restaurant.rating] : []),
    ...otherRatings.filter(r => r.rating).map(r => r.rating as number)
  ];
  const averageRating = allRatings.length > 0 
    ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1)
    : null;

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
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 max-h-[90vh] overflow-hidden"
            dir="rtl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-40px)]">
              {/* Restaurant Header Image */}
              <div className="relative h-48">
                {restaurant.image_url ? (
                  <img
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-6xl">🍽️</span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              </div>

              <div className="px-5 -mt-8 relative">
                {/* Restaurant Info Card */}
                <div className="bg-card rounded-2xl p-5 shadow-elevated mb-5">
                  {/* Name and Rating Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {/* Name */}
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">{restaurant.name}</h2>
                      {ownerName && (
                        <p className="text-sm text-primary mt-1">
                          من قائمة {ownerName}
                        </p>
                      )}
                    </div>
                    
                    {/* Average Rating Badge */}
                    {averageRating && (
                      <div className="flex items-center gap-1.5 bg-amber-100 px-3 py-1.5 rounded-xl shrink-0">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span className="text-lg font-bold text-foreground">{averageRating}</span>
                      </div>
                    )}
                  </div>

                  {/* Info Row */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {restaurant.category && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🍽️</span>
                        <span>{restaurant.category}</span>
                      </div>
                    )}
                    {restaurant.distance && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>{restaurant.distance}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-success" />
                      <span className="text-success font-medium">مفتوح الآن</span>
                    </div>
                  </div>
                </div>

                {/* Owner's Rating & Notes Section */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-5 mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <span>⭐</span>
                      <span>{isOwner ? "تقييمي" : `تقييم ${ownerName || "المستخدم"}`}</span>
                    </h3>
                    {isOwner && !isEditing && (
                      <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                        <Edit2 className="w-4 h-4 ml-1" />
                        تعديل
                      </Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      {/* Rating Stars */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">التقييم</label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setEditedRating(star)}
                              className="p-1"
                            >
                              <Star
                                className={`w-8 h-8 transition-colors ${
                                  star <= editedRating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">الأطباق المفضلة والملاحظات</label>
                        <Textarea
                          value={editedNotes}
                          onChange={(e) => setEditedNotes(e.target.value)}
                          placeholder="مثال: البيتزا مارغريتا لذيذة جداً، أنصح بالباستا أيضاً..."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                          <Save className="w-4 h-4 ml-1" />
                          {isSaving ? "جاري الحفظ..." : "حفظ"}
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Display Rating */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-6 h-6 ${
                              star <= (restaurant.rating || 0)
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted"
                            }`}
                          />
                        ))}
                        <span className="text-lg font-bold mr-2">{restaurant.rating || 0}/5</span>
                      </div>

                      {/* Display Notes */}
                      {restaurant.notes ? (
                        <div className="bg-card rounded-xl p-4">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <span>🍽️</span>
                            <span>الأطباق المفضلة</span>
                          </h4>
                          <p className="text-muted-foreground">{restaurant.notes}</p>
                        </div>
                      ) : isOwner ? (
                        <p className="text-muted-foreground text-sm">
                          لم تضف ملاحظات بعد. اضغط على تعديل لإضافة أطباقك المفضلة.
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          لا توجد ملاحظات.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Other Users' Ratings Section */}
                <div className="bg-muted/50 rounded-2xl p-5 mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      <span>تقييمات المستخدمين</span>
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {otherRatings.length + (restaurant.rating ? 1 : 0)} تقييم
                    </span>
                  </div>

                  {isLoadingRatings ? (
                    <div className="text-center py-4">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                    </div>
                  ) : otherRatings.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      لا توجد تقييمات أخرى لهذا المطعم بعد
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {otherRatings.map((userRating) => (
                        <motion.div
                          key={userRating.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-card rounded-xl p-4"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={userRating.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                {userRating.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">@{userRating.username}</span>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= (userRating.rating || 0)
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-muted"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              {/* Notes are private and not shown to other users for privacy */}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delivery Apps Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-4">اطلب عبر</h3>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { name: "Talabat", color: "#FF5A00" },
                      { name: "Jahez", color: "#EF4444" },
                      { name: "Keeta", color: "#FACC15" },
                      { name: "Deliveroo", color: "#00CCBC" },
                    ].map((app) => (
                      <button
                        key={app.name}
                        className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-full text-sm font-semibold border-2 transition-all hover:scale-105 bg-card leading-none"
                        style={{ borderColor: app.color, color: app.color }}
                      >
                        {app.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <button className="flex flex-col items-center gap-2 p-4 bg-primary/10 rounded-2xl hover:bg-primary/15 transition-colors">
                    <Phone className="w-6 h-6 text-primary" />
                    <span className="text-sm font-medium text-primary">اتصال</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-4 bg-primary/10 rounded-2xl hover:bg-primary/15 transition-colors">
                    <Navigation className="w-6 h-6 text-primary" />
                    <span className="text-sm font-medium text-primary">الاتجاهات</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-4 bg-primary/10 rounded-2xl hover:bg-primary/15 transition-colors">
                    <ExternalLink className="w-6 h-6 text-primary" />
                    <span className="text-sm font-medium text-primary">الموقع</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SavedRestaurantDetail;
