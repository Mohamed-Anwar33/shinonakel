import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { FileText, Shield, Save, Loader2, Eye, Edit3, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface LegalPage {
    id: string;
    page_type: string;
    content: string;
    content_en: string;
    updated_at: string;
}

const DEFAULT_TERMS = `1. شروط الاستخدام (Terms of Use)

طبيعة المحتوى: الموقع يقدم معلومات حول المطاعم، الوجبات، أو الوصفات. هذه المعلومات هي لأغراض ترفيهية وإرشادية فقط، ولا يتحمل الموقع مسؤولية أي تغيير في أسعار المطاعم أو جودة خدماتها.

حدود المسؤولية: الموقع غير مسؤول عن أي حالات حساسية غذائية أو أضرار ناتجة عن تجربة وصفة أو مطعم تم ذكره، فالمسؤولية تقع على عاتق المستخدم والمطعم المزود للخدمة.

السلوك المقبول: يُمنع نشر تعليقات مسيئة، عنصرية، أو ترويجية غير مصرح بها في قسم التقييمات.

الملكية الفكرية: جميع الصور والنصوص والشعارات الخاصة بموقع "شنو ناكل" هي ملك للموقع ولا يجوز استخدامها تجارياً دون إذن.

التعديلات: يحق للموقع تغيير هذه الشروط في أي وقت، واستمرارك في الاستخدام يعني موافقتك عليها.`;

const DEFAULT_PRIVACY = `2. سياسة الخصوصية (Privacy Policy)

البيانات التي نجمعها:

بيانات اختيارية: مثل الاسم، البريد الإلكتروني، أو الصور عند التسجيل أو كتابة تقييم.

بيانات تقنية: مثل ملفات تعريف الارتباط (Cookies)، وعنوان الـ IP لتحسين تجربة المستخدم وتحليل الزيارات.

كيفية استخدام البيانات: نستخدم بياناتك لتحسين اقتراحات الطعام.

مشاركة البيانات: نؤكد أننا لا نبيع بياناتك الشخصية لأطراف ثالثة. قد نشارك بيانات مجهولة الهوية لأغراض إحصائية فقط.

روابط الطرف الثالث: قد يحتوي الموقع على روابط لمطاعم أو تطبيقات توصيل؛ نحن غير مسؤولين عن سياسة الخصوصية لتلك المواقع الخارجية.`;

const LegalPagesEditor = () => {
    const { t } = useLanguage();
    const [terms, setTerms] = useState<LegalPage | null>(null);
    const [privacy, setPrivacy] = useState<LegalPage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState<string | null>(null);

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

            // Use fetched data or fallback to defaults (as new objects ready to insert/update)
            setTerms(termsPage as any || { id: "new_terms", page_type: "terms", content: DEFAULT_TERMS, content_en: "", updated_at: new Date().toISOString() });
            setPrivacy(privacyPage as any || { id: "new_privacy", page_type: "privacy", content: DEFAULT_PRIVACY, content_en: "", updated_at: new Date().toISOString() });

        } catch (error) {
            console.error("Error fetching pages:", error);
            // Fallback on error too
            setTerms({ id: "new_terms", page_type: "terms", content: DEFAULT_TERMS, content_en: "", updated_at: new Date().toISOString() });
            setPrivacy({ id: "new_privacy", page_type: "privacy", content: DEFAULT_PRIVACY, content_en: "", updated_at: new Date().toISOString() });

            toast({
                title: t("تنبيه", "Notice"),
                description: t("تم تحميل المحتوى الافتراضي", "Loaded default content"),
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

            // Check if it exists first to decide Insert vs Update
            const { data: existing } = await supabase
                .from("legal_pages")
                .select("id")
                .eq("page_type", pageType)
                .single();

            let error;

            if (existing) {
                const { error: updateError } = await supabase
                    .from("legal_pages")
                    .update({
                        content: page.content,
                        content_en: page.content_en,
                        updated_at: new Date().toISOString()
                    })
                    .eq("page_type", pageType);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from("legal_pages")
                    .insert([{
                        page_type: pageType,
                        content: page.content,
                        content_en: page.content_en,
                        updated_at: new Date().toISOString()
                    }]);
                error = insertError;
            }

            if (error) throw error;

            toast({
                title: t("✅ تم الحفظ بنجاح", "✅ Saved Successfully"),
                description: t(
                    `تم تحديث ${pageType === "terms" ? "شروط الاستخدام" : "سياسة الخصوصية"}`,
                    `Updated ${pageType === "terms" ? "Terms of Service" : "Privacy Policy"}`
                )
            });

            fetchPages();
        } catch (error: any) {
            toast({
                title: t("خطأ", "Error"),
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const renderPreview = (content: string) => {
        return content.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (trimmed.match(/^#+\s/)) {
                return (
                    <h3 key={i} className="font-bold text-lg mt-4 mb-2">
                        {trimmed.replace(/^#+\s/, '')}
                    </h3>
                );
            }
            if (trimmed.match(/^\d+\.\s/)) {
                return (
                    <h4 key={i} className="font-semibold mt-3 mb-1">
                        {trimmed}
                    </h4>
                );
            }
            if (trimmed) {
                return (
                    <p key={i} className="text-muted-foreground mb-2 leading-relaxed">
                        {trimmed}
                    </p>
                );
            }
            return null;
        });
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
        <Card className="border-2">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/0">
                <CardTitle className="flex items-center gap-3 justify-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <span>{t("تحرير الصفحات القانونية", "Edit Legal Pages")}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <Tabs defaultValue="terms" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
                        <TabsTrigger value="terms" className="gap-2 text-base">
                            <FileText className="w-4 h-4" />
                            {t("شروط الاستخدام", "Terms")}
                        </TabsTrigger>
                        <TabsTrigger value="privacy" className="gap-2 text-base">
                            <Shield className="w-4 h-4" />
                            {t("سياسة الخصوصية", "Privacy")}
                        </TabsTrigger>
                    </TabsList>

                    {/* Terms Tab */}
                    <TabsContent value="terms" className="space-y-6">
                        {terms ? (
                            <>
                                {/* Formatting Guide */}
                                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                                    <p className="text-sm font-medium mb-2">{t("💡 دليل التنسيق:", "💡 Formatting Guide:")}</p>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <p>• <code className="bg-background px-1 rounded"># عنوان رئيسي</code> للعناوين الكبيرة</p>
                                        <p>• <code className="bg-background px-1 rounded">1. عنوان فرعي</code> للعناوين المرقمة</p>
                                        <p>• اترك سطر فارغ بين الفقرات</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Arabic Content */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base font-semibold">{t("المحتوى بالعربي", "Arabic Content")}</Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setPreviewMode(previewMode === "terms-ar" ? null : "terms-ar")}
                                            >
                                                {previewMode === "terms-ar" ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                {previewMode === "terms-ar" ? t("تعديل", "Edit") : t("معاينة", "Preview")}
                                            </Button>
                                        </div>

                                        {previewMode === "terms-ar" ? (
                                            <div className="border rounded-lg p-4 bg-card min-h-[400px] max-h-[600px] overflow-y-auto">
                                                {renderPreview(terms.content)}
                                            </div>
                                        ) : (
                                            <Textarea
                                                value={terms.content}
                                                onChange={(e) => setTerms({ ...terms, content: e.target.value })}
                                                className="min-h-[400px] max-h-[600px] text-sm font-mono"
                                                dir="rtl"
                                                placeholder={t("أدخل محتوى شروط الاستخدام بالعربي...", "Enter Terms content in Arabic...")}
                                            />
                                        )}
                                    </div>

                                    {/* English Content */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base font-semibold">{t("المحتوى بالإنجليزي", "English Content")}</Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setPreviewMode(previewMode === "terms-en" ? null : "terms-en")}
                                            >
                                                {previewMode === "terms-en" ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                {previewMode === "terms-en" ? "Edit" : "Preview"}
                                            </Button>
                                        </div>

                                        {previewMode === "terms-en" ? (
                                            <div className="border rounded-lg p-4 bg-card min-h-[400px] max-h-[600px] overflow-y-auto">
                                                {renderPreview(terms.content_en)}
                                            </div>
                                        ) : (
                                            <Textarea
                                                value={terms.content_en}
                                                onChange={(e) => setTerms({ ...terms, content_en: e.target.value })}
                                                className="min-h-[400px] max-h-[600px] text-sm font-mono"
                                                dir="ltr"
                                                placeholder="Enter Terms content in English..."
                                            />
                                        )}
                                    </div>
                                </div>

                                <Button
                                    onClick={() => handleSave("terms")}
                                    disabled={isSaving}
                                    className="w-full h-12 text-base gap-2"
                                    size="lg"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {t("جاري الحفظ...", "Saving...")}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h5" />
                                            {t("حفظ التغييرات", "Save Changes")}
                                        </>
                                    )}
                                </Button>

                                {terms.updated_at && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        {t("آخر تحديث:", "Last updated:")} {new Date(terms.updated_at).toLocaleString()}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                {t("لا توجد بيانات", "No data available")}
                            </p>
                        )}
                    </TabsContent>

                    {/* Privacy Tab */}
                    <TabsContent value="privacy" className="space-y-6">
                        {privacy ? (
                            <>
                                {/* Formatting Guide */}
                                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                                    <p className="text-sm font-medium mb-2">{t("💡 دليل التنسيق:", "💡 Formatting Guide:")}</p>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <p>• <code className="bg-background px-1 rounded"># عنوان رئيسي</code> للعناوين الكبيرة</p>
                                        <p>• <code className="bg-background px-1 rounded">1. عنوان فرعي</code> للعناوين المرقمة</p>
                                        <p>• اترك سطر فارغ بين الفقرات</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Arabic Content */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base font-semibold">{t("المحتوى بالعربي", "Arabic Content")}</Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setPreviewMode(previewMode === "privacy-ar" ? null : "privacy-ar")}
                                            >
                                                {previewMode === "privacy-ar" ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                {previewMode === "privacy-ar" ? t("تعديل", "Edit") : t("معاينة", "Preview")}
                                            </Button>
                                        </div>

                                        {previewMode === "privacy-ar" ? (
                                            <div className="border rounded-lg p-4 bg-card min-h-[400px] max-h-[600px] overflow-y-auto">
                                                {renderPreview(privacy.content)}
                                            </div>
                                        ) : (
                                            <Textarea
                                                value={privacy.content}
                                                onChange={(e) => setPrivacy({ ...privacy, content: e.target.value })}
                                                className="min-h-[400px] max-h-[600px] text-sm font-mono"
                                                dir="rtl"
                                                placeholder={t("أدخل محتوى سياسة الخصوصية بالعربي...", "Enter Privacy Policy content in Arabic...")}
                                            />
                                        )}
                                    </div>

                                    {/* English Content */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base font-semibold">{t("المحتوى بالإنجليزي", "English Content")}</Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setPreviewMode(previewMode === "privacy-en" ? null : "privacy-en")}
                                            >
                                                {previewMode === "privacy-en" ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                {previewMode === "privacy-en" ? "Edit" : "Preview"}
                                            </Button>
                                        </div>

                                        {previewMode === "privacy-en" ? (
                                            <div className="border rounded-lg p-4 bg-card min-h-[400px] max-h-[600px] overflow-y-auto">
                                                {renderPreview(privacy.content_en)}
                                            </div>
                                        ) : (
                                            <Textarea
                                                value={privacy.content_en}
                                                onChange={(e) => setPrivacy({ ...privacy, content_en: e.target.value })}
                                                className="min-h-[400px] max-h-[600px] text-sm font-mono"
                                                dir="ltr"
                                                placeholder="Enter Privacy Policy content in English..."
                                            />
                                        )}
                                    </div>
                                </div>

                                <Button
                                    onClick={() => handleSave("privacy")}
                                    disabled={isSaving}
                                    className="w-full h-12 text-base gap-2"
                                    size="lg"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {t("جاري الحفظ...", "Saving...")}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            {t("حفظ التغييرات", "Save Changes")}
                                        </>
                                    )}
                                </Button>

                                {privacy.updated_at && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        {t("آخر تحديث:", "Last updated:")} {new Date(privacy.updated_at).toLocaleString()}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                {t("لا توجد بيانات", "No data available")}
                            </p>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default LegalPagesEditor;
