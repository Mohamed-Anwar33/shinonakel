import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Camera, Lock, UserPlus, Check, X, UserMinus, Loader2, Settings, BarChart3, Users, Search, ChevronUp, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

interface FriendProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  restaurant_count?: number;
}


interface Friendship {
  id: string;
  user_id_1: string;
  user_id_2: string;
  created_at: string;
  friend?: FriendProfile;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, isGuest, updateProfile } = useAuth();
  const { language, t } = useLanguage();
  const { isAdmin } = useAdminRole();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(profile?.username || "");
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  // Following state
  const [followers, setFollowers] = useState<Friendship[]>([]);
  const [following, setFollowing] = useState<Friendship[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setNewUsername(profile.username);
    }
  }, [profile]);

  // Fetch followers (people who follow me - they sent request to me)
  const fetchFollowers = async () => {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("user_id_2", user!.id);

      if (error) throw error;

      const followerIds = data?.map(f => f.user_id_1) || [];

      if (followerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", followerIds);

        const followersWithProfiles = data?.map(f => ({
          ...f,
          friend: profiles?.find(p => p.id === f.user_id_1)
        })) || [];

        setFollowers(followersWithProfiles);
      } else {
        setFollowers([]);
      }
    } catch (error) {
      console.error("Error fetching followers:", error);
    } finally {
      setIsLoadingFollowers(false);
    }
  };

  // Fetch following (people I follow - I sent request to them)
  const fetchFollowing = async () => {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("user_id_1", user!.id);

      if (error) throw error;

      const followingIds = data?.map(f => f.user_id_2) || [];

      if (followingIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", followingIds);

        // Fetch restaurant counts for each user
        const restaurantCounts: Record<string, number> = {};
        for (const id of followingIds) {
          const { count } = await supabase
            .from("saved_restaurants")
            .select("*", { count: "exact", head: true })
            .eq("user_id", id);
          restaurantCounts[id] = count || 0;
        }

        const followingWithProfiles = data?.map(f => ({
          ...f,
          friend: profiles?.find(p => p.id === f.user_id_2)
            ? { ...profiles?.find(p => p.id === f.user_id_2)!, restaurant_count: restaurantCounts[f.user_id_2] || 0 }
            : undefined
        })) || [];

        setFollowing(followingWithProfiles);
      } else {
        setFollowing([]);
      }
    } catch (error) {
      console.error("Error fetching following:", error);
    }
  };

  const handleUnfollow = async (friendshipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;

      setFollowing(prev => prev.filter(f => f.id !== friendshipId));
      toast({
        title: t("تم إلغاء المتابعة", "Unfollowed"),
        description: t("تم إلغاء متابعة هذا الشخص", "You unfollowed this person")
      });
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Search functions
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .ilike("username", `%${searchQuery}%`)
        .neq("id", user!.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      toast({
        title: t("خطأ في البحث", "Search Error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const addToFavorites = async (receiverId: string) => {
    try {
      // Direct add to friendships (user_id_1 = sender, user_id_2 = receiver)
      const { error } = await supabase
        .from("friendships")
        .insert({
          user_id_1: user!.id,
          user_id_2: receiverId
        });

      if (error) throw error;

      toast({
        title: t("تمت الإضافة", "Added"),
        description: t("تمت إضافة القائمة للمفضلة", "List added to favorites")
      });

      // Remove from search results and refresh following
      setSearchResults(prev => prev.filter(p => p.id !== receiverId));
      fetchFollowing();
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t("خطأ", "Error"),
        description: t("الرجاء اختيار صورة", "Please select an image"),
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("خطأ", "Error"),
        description: t("حجم الصورة يجب أن يكون أقل من 5 ميجابايت", "Image size must be less than 5MB"),
        variant: "destructive"
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      await updateProfile({ avatar_url: publicUrl });

      toast({
        title: t("تم التحديث", "Updated"),
        description: t("تم تغيير صورة البروفايل بنجاح", "Profile picture updated successfully")
      });
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Check if username is available
  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (username === profile?.username) {
      setIsUsernameAvailable(true);
      return true;
    }

    setIsCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (error) throw error;

      const available = !data;
      setIsUsernameAvailable(available);
      if (!available) {
        setUsernameError(t("اسم المستخدم مستخدم بالفعل", "Username is already taken"));
      }
      return available;
    } catch (error) {
      console.error("Error checking username:", error);
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Validate username - English letters, numbers, dots and underscores only
  const validateUsername = (value: string): boolean => {
    const englishOnlyRegex = /^[a-zA-Z0-9_.]+$/;
    if (!value.trim()) {
      setUsernameError(t("الرجاء إدخال اسم المستخدم", "Please enter a username"));
      setIsUsernameAvailable(null);
      return false;
    }
    if (!englishOnlyRegex.test(value)) {
      setUsernameError(t("اسم المستخدم يجب أن يكون بالإنجليزية فقط", "Username must be in English only"));
      setIsUsernameAvailable(null);
      return false;
    }
    if (value.length < 3) {
      setUsernameError(t("اسم المستخدم يجب أن يكون 3 أحرف على الأقل", "Username must be at least 3 characters"));
      setIsUsernameAvailable(null);
      return false;
    }
    setUsernameError("");
    return true;
  };

  // Debounce username check
  useEffect(() => {
    if (!newUsername || newUsername === profile?.username) {
      setIsUsernameAvailable(null);
      return;
    }

    if (!validateUsername(newUsername)) return;

    const timer = setTimeout(() => {
      checkUsernameAvailability(newUsername);
    }, 500);

    return () => clearTimeout(timer);
  }, [newUsername, profile?.username]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const sanitized = value.replace(/[^a-zA-Z0-9_.]/g, '');
    setNewUsername(sanitized);
    setIsEditing(true);
    setIsUsernameAvailable(null);
  };

  if (isGuest || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">{t("سجّل دخولك", "Sign in")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("قم بتسجيل الدخول للوصول إلى بروفايلك", "Sign in to access your profile")}
          </p>
          <Button onClick={() => navigate("/welcome")} className="gap-2">
            {t("تسجيل الدخول", "Sign in")}
          </Button>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

  const handleSave = async () => {
    if (!validateUsername(newUsername)) {
      return;
    }

    // Check availability before saving if username changed
    if (newUsername !== profile?.username) {
      const available = await checkUsernameAvailability(newUsername);
      if (!available) {
        toast({
          title: t("خطأ", "Error"),
          description: t("اسم المستخدم مستخدم بالفعل", "Username is already taken"),
          variant: "destructive"
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      await updateProfile({
        username: newUsername
      });
      toast({
        title: t("تم الحفظ", "Saved"),
        description: t("تم تحديث بروفايلك بنجاح", "Your profile was updated successfully")
      });
      setIsEditing(false);
      setIsUsernameAvailable(null);
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const profileLink = `${window.location.origin}/user/${profile?.username}`;

  const copyProfileLink = () => {
    navigator.clipboard.writeText(profileLink);
    toast({
      title: t("تم النسخ", "Copied"),
      description: t("تم نسخ رابط البروفايل", "Profile link copied")
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            {language === "ar" ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </button>
          <h1 className="text-lg font-bold">{t("الملف الشخصي", "Profile")}</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {profile?.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>
          <h2 className="text-xl font-bold mt-4">{profile?.username}</h2>

          {/* Admin Links */}
          {isAdmin && (
            <div className="flex justify-center gap-3 mt-4">
              <Button onClick={() => navigate("/admin")} variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                {t("لوحة التحكم", "Dashboard")}
              </Button>
              <Button onClick={() => navigate("/statistics")} variant="outline" size="sm" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                {t("الإحصائيات", "Statistics")}
              </Button>
            </div>
          )}
        </motion.div>

        {/* Profile Link - Always visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-4 mb-4 shadow-card"
        >
          <h3 className="font-bold mb-2">{t("رابط البروفايل", "Profile Link")}</h3>
          <div className="flex gap-2">
            <Input
              value={profileLink}
              readOnly
              className="text-sm"
              dir="ltr"
            />
            <Button onClick={copyProfileLink} variant="outline">
              {t("نسخ", "Copy")}
            </Button>
          </div>
        </motion.div>

        {/* Edit Username */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl p-4 mb-4 shadow-card"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold block mb-2">{t("اسم المستخدم (بالإنجليزية)", "Username (English only)")}</label>
              <div className="relative">
                <Input
                  type="text"
                  value={newUsername}
                  onChange={handleUsernameChange}
                  placeholder="username"
                  dir="ltr"
                  className={isUsernameAvailable === true ? "border-green-500 pr-10" : isUsernameAvailable === false ? "border-destructive pr-10" : ""}
                />
                {isCheckingUsername && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!isCheckingUsername && isUsernameAvailable === true && newUsername !== profile?.username && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                )}
                {!isCheckingUsername && isUsernameAvailable === false && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-destructive" />
                  </div>
                )}
              </div>
              {usernameError && (
                <p className="text-destructive text-sm mt-1">{usernameError}</p>
              )}
              {!usernameError && isUsernameAvailable === true && newUsername !== profile?.username && (
                <p className="text-green-500 text-sm mt-1">{t("اسم المستخدم متاح ✓", "Username is available ✓")}</p>
              )}
              <p className="text-muted-foreground text-xs mt-1">
                {t("أحرف إنجليزية وأرقام و . _ فقط", "English letters, numbers, . and _ only")}
              </p>
            </div>
            {isEditing && (
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  className="flex-1"
                  disabled={isLoading || isCheckingUsername || isUsernameAvailable === false}
                >
                  {isLoading ? t("جاري الحفظ...", "Saving...") : isCheckingUsername ? t("جاري التحقق...", "Checking...") : t("حفظ التغييرات", "Save Changes")}
                </Button>
                <Button
                  onClick={() => {
                    setNewUsername(profile?.username || "");
                    setIsEditing(false);
                    setIsUsernameAvailable(null);
                    setUsernameError("");
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {t("إلغاء", "Cancel")}
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Followers Count */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-4 mb-4 shadow-card"
        >
          <div className="flex items-center justify-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">{followers.length}</span>
            <span className="text-muted-foreground">{t("متابعين", "followers")}</span>
          </div>
        </motion.div>

        {/* Search Users Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl shadow-card overflow-hidden mb-4"
        >
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">{t("البحث عن مستخدمين", "Search for users")}</span>
            </div>
            {showSearch ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {showSearch && (
            <div className="p-4 border-t border-border">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder={t("ابحث باسم المستخدم...", "Search by username...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  dir="ltr"
                />
                <Button onClick={handleSearch} disabled={isSearching} size="icon">
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                    >
                      <Avatar
                        className="w-10 h-10 cursor-pointer"
                        onClick={() => navigate(`/user/${result.username}`)}
                      >
                        <AvatarImage src={result.avatar_url || undefined} />
                        <AvatarFallback>
                          {result.username?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => navigate(`/user/${result.username}`)}
                      >
                        <h4 className="font-medium">{result.username}</h4>
                      </div>
                      <Button
                        onClick={() => addToFavorites(result.id)}
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !isSearching && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  {t("لا توجد نتائج للبحث", "No results found")}
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Favorite Lists Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl shadow-card overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-border">
            <h3 className="font-bold">{t("القوائم المفضلة", "Favorite Lists")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("الأشخاص اللي تعجبني قوائمهم", "People whose lists I like")}</p>
          </div>

          {/* Following List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoadingFollowers ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : following.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t("لم تضف أي قوائم مفضلة بعد", "You haven't added any favorite lists yet")}</p>
                <p className="text-xs mt-1">{t("ابحث عن مستخدمين وأضفهم من الأعلى", "Search for users and add them from above")}</p>
              </div>
            ) : (
              following.map((friendship) => (
                <div
                  key={friendship.id}
                  className="p-4 flex items-center gap-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/user/${friendship.friend?.username}`)}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friendship.friend?.avatar_url || undefined} />
                    <AvatarFallback>
                      {friendship.friend?.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium">{friendship.friend?.username}</h4>
                    <span className="text-xs text-muted-foreground">
                      {friendship.friend?.restaurant_count || 0} {t("مطعم", "restaurants")}
                    </span>
                  </div>
                  <Button
                    onClick={(e) => handleUnfollow(friendship.id, e)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Legal Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-center py-4"
        >
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <button
              onClick={() => navigate("/terms")}
              className="hover:text-primary hover:underline"
            >
              {t("شروط الاستخدام", "Terms")}
            </button>
            <span>•</span>
            <button
              onClick={() => navigate("/privacy")}
              className="hover:text-primary hover:underline"
            >
              {t("الخصوصية", "Privacy")}
            </button>
          </div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
