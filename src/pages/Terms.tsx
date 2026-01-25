import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface LegalPage {
    id: string;
    page_type: string;
    content: string;
    content_en: string;
    updated_at: string;
}

const Terms = () => {
    const navigate = useNavigate();
    const { language, t } = useLanguage();
    const [page, setPage] = useState<LegalPage | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTerms();
    }, []);

    const fetchTerms = async () => {
        try {
            const { data, error } = await supabase
                .from("legal_pages")
                .select("*")
                .eq("page_type", "terms")
                .single();

            if (error) throw error;
            setPage(data);
        } catch (error) {
            console.error("Error fetching terms:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const content = language === "ar" ? page?.content : page?.content_en;

    return (
        <div className="min-h-screen bg-background" dir={language === "ar" ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="bg-card border-b sticky top-0 z-10">
                <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="gap-2"
                    >
                        <ArrowRight className="w-5 h-5" />
                        {t("رجوع", "Back")}
                    </Button>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="w-6 h-6 text-primary" />
                        {t("شروط الاستخدام", "Terms of Service")}
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="container max-w-4xl mx-auto px-4 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-center text-2xl">
                            {t("شروط الاستخدام", "Terms of Service")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm md:prose-base max-w-none">
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-8 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-8 w-2/3 mt-6" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ) : content ? (
                            <div
                                className="whitespace-pre-wrap text-right"
                                style={{ direction: language === "ar" ? "rtl" : "ltr" }}
                                dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, "<br>") }}
                            />
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                {t("لم يتم العثور على شروط الاستخدام", "Terms of Service not found")}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {page?.updated_at && (
                    <p className="text-center text-sm text-muted-foreground mt-4">
                        {t("آخر تحديث", "Last updated")}:{" "}
                        {new Date(page.updated_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                )}
            </div>
        </div>
    );
};

export default Terms;
