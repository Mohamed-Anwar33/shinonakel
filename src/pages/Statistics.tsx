import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Users, Store, Megaphone, Heart, TrendingUp, Eye, MousePointer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface Stats {
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalRestaurants: number;
  restaurantsByCategory: { name: string; value: number }[];
  topSavedRestaurants: { name: string; count: number }[];
  totalAds: number;
  activeAds: number;
  totalAdViews: number;
  totalAdClicks: number;
  adsByPlacement: { name: string; value: number }[];
  dailyActivity: { date: string; saves: number; users: number }[];
}

const COLORS = ["hsl(354, 76%, 60%)", "hsl(45, 100%, 51%)", "hsl(142, 76%, 45%)", "hsl(200, 80%, 50%)", "hsl(280, 70%, 50%)"];

const Statistics = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminRole();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // تحسين: تنفيذ جميع الاستعلامات الأساسية بالتوازي
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const [
        totalUsersResult,
        newUsersThisWeekResult,
        newUsersThisMonthResult,
        restaurantsResult,
        savedRestaurantsResult,
        adsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString()),
        supabase.from("restaurants").select("cuisine", { count: "exact" }),
        supabase.from("saved_restaurants").select("name"),
        supabase.from("advertisements").select("*", { count: "exact" }),
      ]);

      const totalUsers = totalUsersResult.count;
      const newUsersThisWeek = newUsersThisWeekResult.count;
      const newUsersThisMonth = newUsersThisMonthResult.count;
      const restaurants = restaurantsResult.data;
      const totalRestaurants = restaurantsResult.count;
      const savedRestaurants = savedRestaurantsResult.data;
      const ads = adsResult.data;
      const totalAds = adsResult.count;

      // Restaurants by category
      const categoryCount: Record<string, number> = {};
      restaurants?.forEach((r) => {
        categoryCount[r.cuisine] = (categoryCount[r.cuisine] || 0) + 1;
      });
      const restaurantsByCategory = Object.entries(categoryCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Top saved restaurants
      const savedCount: Record<string, number> = {};
      savedRestaurants?.forEach((r) => {
        savedCount[r.name] = (savedCount[r.name] || 0) + 1;
      });
      const topSavedRestaurants = Object.entries(savedCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Ads calculations
      const activeAds = ads?.filter((a) => a.is_active).length || 0;
      const totalAdViews = ads?.reduce((sum, a) => sum + (a.views_count || 0), 0) || 0;
      const totalAdClicks = ads?.reduce((sum, a) => sum + (a.clicks_count || 0), 0) || 0;

      // Ads by placement
      const pinnedAds = ads?.filter((a) => a.placement === "pinned_ad" || a.placement === "pinned_ad_all" || a.placement.startsWith("pinned_ad_cuisine_")).length || 0;
      const mostPopularAds = ads?.filter((a) => a.placement === "most_popular").length || 0;
      const adsByPlacement = [
        { name: "إعلان مثبت", value: pinnedAds },
        { name: "الأكثر رواجاً", value: mostPopularAds },
      ];

      // تحسين: Daily activity - تنفيذ جميع استعلامات الأيام بالتوازي
      const dailyActivityPromises = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        dailyActivityPromises.push(
          Promise.all([
            supabase
              .from("saved_restaurants")
              .select("*", { count: "exact", head: true })
              .gte("created_at", dateStr + "T00:00:00")
              .lt("created_at", dateStr + "T23:59:59"),
            supabase
              .from("profiles")
              .select("*", { count: "exact", head: true })
              .gte("created_at", dateStr + "T00:00:00")
              .lt("created_at", dateStr + "T23:59:59"),
            Promise.resolve(dateStr)
          ])
        );
      }

      const dailyActivityResults = await Promise.all(dailyActivityPromises);
      const dailyActivity = dailyActivityResults.map(([savesResult, usersResult, dateStr]) => ({
        date: new Date(dateStr).toLocaleDateString("ar-SA", { weekday: "short" }),
        saves: savesResult.count || 0,
        users: usersResult.count || 0,
      }));

      setStats({
        totalUsers: totalUsers || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        totalRestaurants: totalRestaurants || 0,
        restaurantsByCategory,
        topSavedRestaurants,
        totalAds: totalAds || 0,
        activeAds,
        totalAdViews,
        totalAdClicks,
        adsByPlacement,
        dailyActivity,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الإحصائيات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">الإحصائيات</h1>
        </div>
        <p className="text-sm text-white/80">نظرة شاملة على أداء التطبيق</p>
      </div>

      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : stats ? (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalUsers}</p>
                      <p className="text-xs text-muted-foreground">إجمالي المستخدمين</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Store className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalRestaurants}</p>
                      <p className="text-xs text-muted-foreground">المطاعم</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Megaphone className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.activeAds}</p>
                      <p className="text-xs text-muted-foreground">إعلان نشط</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">+{stats.newUsersThisWeek}</p>
                      <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="users">المستخدمين</TabsTrigger>
                <TabsTrigger value="restaurants">المطاعم</TabsTrigger>
                <TabsTrigger value="ads">الإعلانات</TabsTrigger>
              </TabsList>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">نمو المستخدمين</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary">{stats.totalUsers}</p>
                        <p className="text-xs text-muted-foreground">إجمالي</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">+{stats.newUsersThisWeek}</p>
                        <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">+{stats.newUsersThisMonth}</p>
                        <p className="text-xs text-muted-foreground">هذا الشهر</p>
                      </div>
                    </div>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.dailyActivity}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="users"
                            stroke="hsl(354, 76%, 60%)"
                            strokeWidth={2}
                            name="مستخدمين جدد"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Restaurants Tab */}
              <TabsContent value="restaurants" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">المطاعم حسب الفئة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.restaurantsByCategory}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {stats.restaurantsByCategory.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Heart className="w-5 h-5 text-primary" />
                        الأكثر حفظاً
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stats.topSavedRestaurants.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
                      ) : (
                        <div className="space-y-3">
                          {stats.topSavedRestaurants.map((restaurant, index) => (
                            <div key={restaurant.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                >
                                  {index + 1}
                                </span>
                                <span className="font-medium text-sm">{restaurant.name}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">{restaurant.count} حفظ</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">نشاط الحفظ اليومي</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.dailyActivity}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Bar dataKey="saves" fill="hsl(354, 76%, 60%)" name="مطاعم محفوظة" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Ads Tab */}
              <TabsContent value="ads" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Megaphone className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{stats.totalAds}</p>
                      <p className="text-xs text-muted-foreground">إجمالي الإعلانات</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold">{stats.activeAds}</p>
                      <p className="text-xs text-muted-foreground">إعلانات نشطة</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Eye className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">{stats.totalAdViews}</p>
                      <p className="text-xs text-muted-foreground">إجمالي المشاهدات</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <MousePointer className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                      <p className="text-2xl font-bold">{stats.totalAdClicks}</p>
                      <p className="text-xs text-muted-foreground">إجمالي النقرات</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">الإعلانات حسب الموقع</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.adsByPlacement}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name} (${value})`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {stats.adsByPlacement.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">معدل التفاعل</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-3xl font-bold text-primary">
                          {stats.totalAdViews > 0
                            ? ((stats.totalAdClicks / stats.totalAdViews) * 100).toFixed(1)
                            : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">معدل النقر (CTR)</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-3xl font-bold text-green-600">
                          {stats.activeAds > 0
                            ? (stats.totalAdViews / stats.activeAds).toFixed(0)
                            : 0}
                        </p>
                        <p className="text-sm text-muted-foreground">متوسط المشاهدات لكل إعلان</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-12">لا توجد بيانات</p>
        )}
      </div>
    </div>
  );
};

export default Statistics;
