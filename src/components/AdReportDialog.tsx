import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Printer, Download, Eye, MousePointer, TrendingUp, Clock, Calendar, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import logo from "@/assets/logo.png";

interface AdReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ad: {
    id: string;
    restaurant_id: string;
    placement: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    views_count: number;
    clicks_count: number;
    restaurant?: {
      name: string;
      name_en?: string | null;
      image_url?: string | null;
    };
  } | null;
}

interface HourlyData {
  hour: string;
  views: number;
  clicks: number;
}

interface DailyData {
  date: string;
  views: number;
  clicks: number;
}

interface PlacementData {
  all_views: number;
  cuisine_views: number;
}

const AdReportDialog = ({ open, onOpenChange, ad }: AdReportDialogProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [placementData, setPlacementData] = useState<PlacementData>({ all_views: 0, cuisine_views: 0 });
  const [totalViews, setTotalViews] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && ad) {
      fetchReportData();
    }
  }, [open, ad]);

  const fetchReportData = async () => {
    if (!ad) return;

    setIsLoading(true);
    try {
      // Use the counts from the ad itself (same as displayed on cards)
      setTotalViews(ad.views_count);
      setTotalClicks(ad.clicks_count);

      // Fetch all interactions for time-based analytics (hourly/daily distribution)
      const { data: interactions, error } = await supabase
        .from("ad_interactions")
        .select("*")
        .eq("ad_id", ad.id);

      if (error) throw error;

      const views = interactions?.filter(i => i.interaction_type === "view") || [];
      const clicks = interactions?.filter(i => i.interaction_type === "click") || [];

      // Process hourly data
      const hourlyMap: { [key: string]: { views: number; clicks: number } } = {};
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        hourlyMap[hour] = { views: 0, clicks: 0 };
      }

      views.forEach(v => {
        const hour = new Date(v.created_at).getHours().toString().padStart(2, '0');
        if (hourlyMap[hour]) hourlyMap[hour].views++;
      });

      clicks.forEach(c => {
        const hour = new Date(c.created_at).getHours().toString().padStart(2, '0');
        if (hourlyMap[hour]) hourlyMap[hour].clicks++;
      });

      const hourlyArr: HourlyData[] = Object.entries(hourlyMap).map(([hour, data]) => ({
        hour: `${hour}:00`,
        views: data.views,
        clicks: data.clicks,
      }));

      setHourlyData(hourlyArr);

      // Process daily data
      const dailyMap: { [key: string]: { views: number; clicks: number } } = {};

      interactions?.forEach(interaction => {
        const date = format(new Date(interaction.created_at), "yyyy-MM-dd");
        if (!dailyMap[date]) {
          dailyMap[date] = { views: 0, clicks: 0 };
        }
        if (interaction.interaction_type === "view") {
          dailyMap[date].views++;
        } else if (interaction.interaction_type === "click") {
          dailyMap[date].clicks++;
        }
      });

      const dailyArr: DailyData[] = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date: format(new Date(date), "MM/dd", { locale: ar }),
          views: data.views,
          clicks: data.clicks,
        }));

      setDailyData(dailyArr);

      // Placement data - check if it's "all" or cuisine-specific based on placement
      const isAllPlacement = ad.placement === "pinned_ad_all" || ad.placement === "most_popular";
      const isCuisinePlacement = ad.placement.startsWith("pinned_ad_cuisine_");

      setPlacementData({
        all_views: isAllPlacement ? views.length : 0,
        cuisine_views: isCuisinePlacement ? views.length : 0,
      });

    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : "0.00";

  const getPlacementLabel = (placement: string) => {
    if (placement === "most_popular") return "الأكثر رواجاً";
    if (placement === "pinned_ad_all") return "إعلان مثبت (الكل)";
    if (placement.startsWith("pinned_ad_cuisine_")) {
      return `إعلان مثبت (${placement.replace("pinned_ad_cuisine_", "")})`;
    }
    if (placement === "pinned_ad") return "إعلان مثبت";
    return placement;
  };

  if (!ad) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible" dir="rtl">
        <DialogHeader className="print:mb-4">
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            تقرير أداء الإعلان
          </DialogTitle>
        </DialogHeader>

        {/* Print/Export Buttons - Hide on print */}
        <div className="flex gap-2 justify-center mb-4 print:hidden">
          <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            طباعة التقرير
          </Button>
        </div>

        {/* Report Content */}
        <div ref={reportRef} className="space-y-6 print:space-y-4">
          {/* Header with Logo */}
          <div className="flex items-center justify-between border-b pb-4 print:pb-2">
            <div className="text-right">
              <h2 className="text-2xl font-bold text-primary">{ad.restaurant?.name || "مطعم"}</h2>
              {ad.restaurant?.name_en && (
                <p className="text-muted-foreground">{ad.restaurant.name_en}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {getPlacementLabel(ad.placement)}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(ad.start_date), "PPP", { locale: ar })} - {" "}
                {new Date(ad.end_date).getFullYear() >= new Date().getFullYear() + 5
                  ? "حتى انتهاء المشاهدات"
                  : format(new Date(ad.end_date), "PPP", { locale: ar })}
              </p>
            </div>
            <img src={logo} alt="شنو ناكل" className="w-20 h-20 object-contain" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Main Counters */}
              <div className="grid grid-cols-3 gap-4 print:gap-2">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <Eye className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalViews}</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">إجمالي المشاهدات</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Impressions</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
                  <CardContent className="p-4 text-center">
                    <MousePointer className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <p className="text-3xl font-bold text-green-700 dark:text-green-300">{totalClicks}</p>
                    <p className="text-sm text-green-600 dark:text-green-400">إجمالي النقرات</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Clicks</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{ctr}%</p>
                    <p className="text-sm text-purple-600 dark:text-purple-400">معدل النقر</p>
                    <p className="text-xs text-muted-foreground mt-1">Click-Through Rate</p>
                  </CardContent>
                </Card>
              </div>

              {/* Placement Analytics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                    تفصيل أماكن الظهور
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold">{placementData.all_views}</p>
                      <p className="text-sm text-muted-foreground">ظهور في "الكل"</p>
                      <p className="text-xs text-muted-foreground">General Search (All)</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold">{placementData.cuisine_views}</p>
                      <p className="text-sm text-muted-foreground">ظهور في المطبخ المحدد</p>
                      <p className="text-xs text-muted-foreground">Cuisine Specific</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hourly Distribution */}
              <Card className="print:break-inside-avoid">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                    توزيع المشاهدات خلال اليوم
                  </CardTitle>
                  <p className="text-xs text-muted-foreground text-center">Hourly Distribution</p>
                </CardHeader>
                <CardContent>
                  <div className="h-64 print:h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis
                          dataKey="hour"
                          tick={{ fontSize: 10 }}
                          interval={2}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            direction: 'rtl'
                          }}
                          labelFormatter={(label) => `الساعة ${label}`}
                          formatter={(value: number, name: string) => [
                            value,
                            name === 'views' ? 'مشاهدات' : 'نقرات'
                          ]}
                        />
                        <Bar dataKey="views" fill="hsl(var(--primary))" name="views" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="clicks" fill="hsl(142 76% 45%)" name="clicks" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-primary"></div>
                      <span>مشاهدات</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-500"></div>
                      <span>نقرات</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Stats */}
              {dailyData.length > 0 && (
                <Card className="print:break-inside-avoid">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                      الإحصائيات اليومية
                    </CardTitle>
                    <p className="text-xs text-muted-foreground text-center">Daily Stats</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 print:h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              direction: 'rtl'
                            }}
                            labelFormatter={(label) => `التاريخ: ${label}`}
                            formatter={(value: number, name: string) => [
                              value,
                              name === 'views' ? 'مشاهدات' : 'نقرات'
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="views"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                            name="views"
                          />
                          <Line
                            type="monotone"
                            dataKey="clicks"
                            stroke="hsl(142 76% 45%)"
                            strokeWidth={2}
                            dot={{ fill: 'hsl(142 76% 45%)' }}
                            name="clicks"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-primary"></div>
                        <span>مشاهدات</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span>نقرات</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Footer */}
              <div className="text-center pt-4 border-t text-sm text-muted-foreground print:mt-4">
                <p>تم إنشاء هذا التقرير بواسطة منصة "شنو ناكل"</p>
                <p className="text-xs mt-1">
                  تاريخ التقرير: {format(new Date(), "PPP - HH:mm", { locale: ar })}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdReportDialog;
