import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, UserPlus, Check, X, Users, Search, UserMinus, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

interface FriendProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: FriendProfile;
  receiver?: FriendProfile;
}

interface Friendship {
  id: string;
  user_id_1: string;
  user_id_2: string;
  created_at: string;
  friend?: FriendProfile;
}

const Friends = () => {
  const navigate = useNavigate();
  const { user, profile, isGuest } = useAuth();
  const { language, t } = useLanguage();
  const { toast } = useToast();
  
  const [followers, setFollowers] = useState<Friendship[]>([]); // من يتابعونني
  const [following, setFollowing] = useState<Friendship[]>([]); // من أتابعهم
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFollowers();
      fetchFollowing();
      fetchPendingRequests();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch followers (people who follow me - they sent request, I'm user_id_2)
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
    } catch (error: any) {
      console.error("Error fetching followers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch following (people I follow - I sent request, I'm user_id_1)
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

        const followingWithProfiles = data?.map(f => ({
          ...f,
          friend: profiles?.find(p => p.id === f.user_id_2)
        })) || [];

        setFollowing(followingWithProfiles);
      } else {
        setFollowing([]);
      }
    } catch (error: any) {
      console.error("Error fetching following:", error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("receiver_id", user!.id)
        .eq("status", "pending");

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = data?.map(r => r.sender_id) || [];

      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", senderIds);

        const requestsWithProfiles = data?.map(r => ({
          ...r,
          sender: profiles?.find(p => p.id === r.sender_id)
        })) || [];

        setPendingRequests(requestsWithProfiles);
      } else {
        setPendingRequests([]);
      }
    } catch (error: any) {
      console.error("Error fetching requests:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
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

  const sendFriendRequest = async (receiverId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .insert({
          sender_id: user!.id,
          receiver_id: receiverId,
          status: "pending"
        });

      if (error) throw error;

      toast({
        title: t("تم إرسال الطلب", "Request Sent"),
        description: t("تم إرسال طلب الصداقة بنجاح", "Friend request sent successfully")
      });

      // Remove from search results
      setSearchResults(prev => prev.filter(p => p.id !== receiverId));
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRequestAction = async (requestId: string, action: "accepted" | "rejected") => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: action })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: action === "accepted" ? t("تم قبول الطلب", "Request Accepted") : t("تم رفض الطلب", "Request Rejected"),
        description: action === "accepted" ? t("تمت إضافة الصديق بنجاح", "Friend added successfully") : t("تم رفض طلب الصداقة", "Friend request rejected")
      });

      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      
      if (action === "accepted") {
        fetchFollowers();
      }
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
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
            {t("قم بتسجيل الدخول لإضافة أصدقاء", "Sign in to add friends")}
          </p>
          <Button onClick={() => navigate("/welcome")} className="gap-2">
            {t("تسجيل الدخول", "Sign in")}
          </Button>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            {language === "ar" ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </button>
          <h1 className="text-lg font-bold">{t("الأصدقاء", "Friends")}</h1>
          {pendingRequests.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <Tabs defaultValue="followers" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="followers">
              {t("متابعين", "Followers")} ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              {t("أتابعهم", "Following")} ({following.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              {t("الطلبات", "Requests")} ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="search">
              {t("بحث", "Search")}
            </TabsTrigger>
          </TabsList>

          {/* Followers Tab - من يتابعونني */}
          <TabsContent value="followers">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : followers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-bold mb-2">{t("لا يوجد متابعين بعد", "No followers yet")}</h2>
                <p className="text-muted-foreground">
                  {t("شارك رابط بروفايلك ليتابعك الآخرون", "Share your profile link for others to follow you")}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {followers.map((friendship, index) => (
                  <motion.div
                    key={friendship.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3"
                    onClick={() => navigate(`/user/${friendship.friend?.username}`)}
                  >
                    <Avatar>
                      <AvatarImage src={friendship.friend?.avatar_url || undefined} />
                      <AvatarFallback>
                        {friendship.friend?.username?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold">{friendship.friend?.username}</h3>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Following Tab - من أتابعهم */}
          <TabsContent value="following">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : following.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-bold mb-2">{t("لا تتابع أحداً بعد", "You're not following anyone yet")}</h2>
                <p className="text-muted-foreground">
                  {t("ابحث عن أشخاص لمتابعتهم", "Search for people to follow")}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {following.map((friendship, index) => (
                  <motion.div
                    key={friendship.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3"
                    onClick={() => navigate(`/user/${friendship.friend?.username}`)}
                  >
                    <Avatar>
                      <AvatarImage src={friendship.friend?.avatar_url || undefined} />
                      <AvatarFallback>
                        {friendship.friend?.username?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold">{friendship.friend?.username}</h3>
                    </div>
                    <Button
                      onClick={(e) => handleUnfollow(friendship.id, e)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests">
            {pendingRequests.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <UserPlus className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-bold mb-2">{t("لا توجد طلبات", "No requests")}</h2>
                <p className="text-muted-foreground">
                  {t("ستظهر طلبات الصداقة هنا", "Friend requests will appear here")}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card rounded-2xl p-4 shadow-card"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar>
                        <AvatarImage src={request.sender?.avatar_url || undefined} />
                        <AvatarFallback>
                          {request.sender?.username?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-bold">{request.sender?.username}</h3>
                      </div>
                    </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleRequestAction(request.id, "accepted")}
                          className="flex-1 gap-2"
                        >
                          <Check className="w-4 h-4" />
                          {t("قبول", "Accept")}
                        </Button>
                        <Button
                          onClick={() => handleRequestAction(request.id, "rejected")}
                          variant="outline"
                          className="flex-1 gap-2"
                        >
                          <X className="w-4 h-4" />
                          {t("رفض", "Reject")}
                        </Button>
                      </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder={t("ابحث باسم المستخدم...", "Search by username...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3"
                    >
                      <Avatar>
                        <AvatarImage src={result.avatar_url || undefined} />
                        <AvatarFallback>
                          {result.username?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-bold">{result.username}</h3>
                      </div>
                        <Button
                          onClick={() => sendFriendRequest(result.id)}
                          size="sm"
                          className="gap-1"
                        >
                          <UserPlus className="w-4 h-4" />
                          {t("إضافة", "Add")}
                        </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Friends;
