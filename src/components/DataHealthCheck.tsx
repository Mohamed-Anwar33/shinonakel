import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, RefreshCw, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const DataHealthCheck = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<any>(null);
    const { toast } = useToast();

    const runDiagnosis = async () => {
        setIsLoading(true);
        setReport(null);
        try {
            // Fetch ALL restaurants with their branches
            const { data: restaurants, error } = await supabase
                .from("restaurants")
                .select(`
          id,
          name,
          name_en,
          maps_url, 
          latitude, 
          longitude,
          branches:restaurant_branches(id, branch_name, google_maps_url, latitude, longitude)
        `)
                .eq("is_deleted", false);

            if (error) throw error;

            let totalRestaurants = 0;
            let validLocations = 0;
            let partialIssues = 0;
            let criticalMissing = 0; // Has URL but NO coords
            const problematicRestaurants: any[] = [];

            restaurants?.forEach((r: any) => {
                totalRestaurants++;
                const branches = r.branches || [];

                let hasValidBranch = false;
                let hasBrokenBranch = false;

                // Check branches
                if (branches.length > 0) {
                    branches.forEach((b: any) => {
                        const hasUrl = !!b.google_maps_url;
                        const hasCoords = b.latitude != null && b.longitude != null;

                        if (hasUrl && !hasCoords) {
                            hasBrokenBranch = true;
                        }
                        if (hasCoords) {
                            hasValidBranch = true;
                        }
                    });
                }

                // Legacy fallback check (if no branches or legacy data exists)
                // If restaurant has top-level legacy fields
                /* 
                   Note: The user wants "Strict Admin". 
                   If there are NO branches, we check the legacy fields if they exist in your DB schema.
                   Assuming they might be used if branches are empty.
                */
                const legacyUrl = r.maps_url; // Check your exact column name for legacy URL if strictly needed
                // But per new requirement, we focus on branches. 

                if (hasValidBranch) {
                    validLocations++;
                } else if (hasBrokenBranch) {
                    criticalMissing++;
                    problematicRestaurants.push({
                        id: r.id,
                        name: r.name,
                        en: r.name_en,
                        issue: "يوجد رابط ولكن لا توجد إحداثيات (Missing Coords)"
                    });
                } else {
                    // No data at all
                    partialIssues++; // Not necessarily "broken", just empty
                }
            });

            setReport({
                total: totalRestaurants,
                valid: validLocations,
                broken: criticalMissing,
                empty: partialIssues,
                items: problematicRestaurants
            });

            toast({
                title: "تم الفحص بنجاح",
                description: `تم العثور على ${criticalMissing} مطعم يحتاج لإصلاح`,
            });

        } catch (error: any) {
            console.error("Diagnosis error:", error);
            toast({
                title: "خطأ في الفحص",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    فحص صحة البيانات (Data Health Check)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
                    <p>هذه الأداة تقوم بفحص قاعدة البيانات للتأكد من وجود الإحداثيات (Latitude/Longitude).</p>
                    <p className="font-bold text-primary">المشكلة الشائعة: وجود "رابط Google Maps" ولكن "الإحداثيات فارغة".</p>
                </div>

                {!report && (
                    <Button onClick={runDiagnosis} disabled={isLoading} className="w-full sm:w-auto">
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                جاري الفحص...
                            </>
                        ) : (
                            "بدء الفحص الآن"
                        )}
                    </Button>
                )}

                {report && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-bold">بيانات صحيحة</p>
                                    <p className="text-2xl font-bold text-green-700">{report.valid}</p>
                                </div>
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>

                            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-600 font-bold">يحتاج إصلاح (Missing Coords)</p>
                                    <p className="text-2xl font-bold text-red-700">{report.broken}</p>
                                </div>
                                <XCircle className="w-8 h-8 text-red-500" />
                            </div>

                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 font-bold">بدون موقع (Empty)</p>
                                    <p className="text-2xl font-bold text-slate-700">{report.empty}</p>
                                </div>
                                <MapPin className="w-8 h-8 text-slate-400" />
                            </div>
                        </div>

                        {report.items.length > 0 && (
                            <div className="border rounded-xl overflow-hidden">
                                <div className="bg-red-50 p-3 border-b border-red-100 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    <h3 className="font-bold text-red-700">المطاعم التي تحتاج لتحديث (إعادة حفظ)</h3>
                                </div>
                                <div className="divide-y max-h-[400px] overflow-y-auto">
                                    {report.items.map((item: any) => (
                                        <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                            <div>
                                                <p className="font-bold">{item.name}</p>
                                                {item.en && <p className="text-xs text-muted-foreground">{item.en}</p>}
                                            </div>
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                                إحداثيات مفقودة
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button variant="outline" onClick={runDiagnosis}>إعادة الفحص</Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
