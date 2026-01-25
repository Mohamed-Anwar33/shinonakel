import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { FileText, Shield, Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LegalPage {
    id: string;
    page_type: string;
    content: string;
    content_en: string;
    updated_at: string;
}

const LegalPagesEditor = () => {
    const [terms, setTerms] = useState<LegalPage | null>(null);
    const [privacy, setPrivacy] = useState<LegalPage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const { data, error } = await supabase
                .from("legal_pages")
                .select("*")
                .in("page_type", ["terms", "privacy"]);

            if (error) throw error;

            const termsPage = data?.find(p => p.page_type === "terms");
            const privacyPage = data?.find(p => p.page_type === "privacy");

            setTerms(termsPage || null);
            setPrivacy(privacyPage || null);
        } catch (error) {
            console.error("Error fetching pages:", error);
            toast({
                title: "خطأ",
                description: "فشل في تحميل الصفحات",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (pageType: "terms" | "privacy") => {
        setIsSaving(true);
        try {
            const page = pageType === "terms" ? terms : privacy;
            if (!page) return;

            const { error } = await supabase
                .from("legal_pages")
                .update({
                    content: page.content,
                    content_en: page.content_en,
                    updated_at: new Date().toISOString()
                })
                .eq("page_type", pageType);

            if (error) throw error;

            toast({
                title: "✅ تم الحفظ",
                description: `تم تحديث ${pageType === "terms" ? "شروط الاستخدام" : "سياسة الخصوصية"} بنجاح`
            });

            fetchPages(); // Refresh
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

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-center">
                    <FileText className="w-5 h-5" />
                    تحرير الصفحات القانونية
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="terms" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="terms" className="gap-2">
                            <FileText className="w-4 h-4" />
                            شروط الاستخدام
                        </TabsTrigger>
                        <TabsTrigger value="privacy" className="gap-2">
                            <Shield className="w-4 h-4" />
                            سياسة الخصوص ية
                        </TabsTrigger>
                    </TabsList>

                    {/* Terms Tab */}
                    <TabsContent value="terms" className="space-y-4">
                        {terms ? (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-right block">المحتوى بالعربي</Label>
                                    <Textarea
                                        value={terms.content}
                                        onChange={(e) => setTerms({ ...terms, content: e.target.value })}
                                        className="min-h-[300px] text-right font-mono text-sm"
                                        dir="rtl"
                                        placeholder="أدخل محتوى شروط الاستخدام بالعربي..."
                                    />
                                    <p className="text-xs text-muted-foreground text-right">
                                        💡 يمكنك استخدام Markdown للتنسيق (# للعناوين، ** للخط العريض)
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-right block">المحتوى بالإنجليزي</Label>
                                    <Textarea
                                        value={terms.content_en}
                                        onChange={(e) => setTerms({ ...terms, content_en: e.target.value })}
                                        className="min-h-[300px] font-mono text-sm"
                                        dir="ltr"
                                        placeholder="Enter Terms of Service content in English..."
                                    />
                                </div>

                                <Button
                                    onClick={() => handleSave("terms")}
                                    disabled={isSaving}
                                    className="w-full gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            جاري الحفظ...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            حفظ التغييرات
                                        </>
                                    )}
                                </Button>

                                {terms.updated_at && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        آخر تحديث: {new Date(terms.updated_at).toLocaleString("ar-SA")}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                لا توجد بيانات لشروط الاستخدام
                            </p>
                        )}
                    </TabsContent>

                    {/* Privacy Tab */}
                    <TabsContent value="privacy" className="space-y-4">
                        {privacy ? (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-right block">المحتوى بالعربي</Label>
                                    <Textarea
                                        value={privacy.content}
                                        onChange={(e) => setPrivacy({ ...privacy, content: e.target.value })}
                                        className="min-h-[300px] text-right font-mono text-sm"
                                        dir="rtl"
                                        placeholder="أدخل محتوى سياسة الخصوصية بالعربي..."
                                    />
                                    <p className="text-xs text-muted-foreground text-right">
                                        💡 يمكنك استخدام Markdown للتنسيق (# للعناوين، ** للخط العريض)
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-right block">المحتوى بالإنجليزي</Label>
                                    <Textarea
                                        value={privacy.content_en}
                                        onChange={(e) => setPrivacy({ ...privacy, content_en: e.target.value })}
                                        className="min-h-[300px] font-mono text-sm"
                                        dir="ltr"
                                        placeholder="Enter Privacy Policy content in English..."
                                    />
                                </div>

                                <Button
                                    onClick={() => handleSave("privacy")}
                                    disabled={isSaving}
                                    className="w-full gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            جاري الحفظ...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            حفظ التغييرات
                                        </>
                                    )}
                                </Button>

                                {privacy.updated_at && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        آخر تحديث: {new Date(privacy.updated_at).toLocaleString("ar-SA")}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                لا توجد بيانات لسياسة الخصوصية
                            </p>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default LegalPagesEditor;
