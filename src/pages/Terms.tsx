import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FileText, Calendar, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import BottomNav from "@/components/BottomNav";

interface LegalPage {
    id: string;
    page_type: string;
    content: string;
    content_en: string;
    updated_at: string;
}

interface Section {
    title: string;
    content: string;
}

const Terms = () => {
    const navigate = useNavigate();
    const { language, t } = useLanguage();
    const [page, setPage] = useState<LegalPage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState<number[]>([0]);

    useEffect(() => {
        fetchPage();
    }, []);

    const fetchPage = async () => {
        try {
            const { data, error } = await supabase
                .from("legal_pages")
                .select("*")
                .eq("page_type", "terms")
                .single();

            if (error) throw error;
            setPage(data as any);
        } catch (error) {
            console.error("Error fetching terms:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const parseContent = (content: string): Section[] => {
        if (!content) return [];

        const lines = content.split('\n');
        const sections: Section[] = [];
        let currentSection: Section | null = null;

        lines.forEach(line => {
            const trimmed = line.trim();

            // Check if it's a header (starts with # or numbered)
            if (trimmed.match(/^#+\s/) || trimmed.match(/^\d+\.\s/)) {
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    title: trimmed.replace(/^#+\s/, '').replace(/^\d+\.\s/, ''),
                    content: ''
                };
            } else if (currentSection && trimmed) {
                currentSection.content += trimmed + '\n';
            }
        });

        if (currentSection) {
            sections.push(currentSection);
        }

        return sections.length > 0 ? sections : [{ title: t("شروط الاستخدام", "Terms of Service"), content }];
    };

    const toggleSection = (index: number) => {
        setExpandedSections(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const content = language === "en" && page?.content_en ? page.content_en : page?.content || "";
    const sections = parseContent(content);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
            {/* Elegant Header */}
            <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <ArrowRight className={`w-6 h-6 ${language === "en" ? "rotate-180" : ""}`} />
                        </button>

                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                                <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <h1 className="text-xl font-bold">{t("شروط الاستخدام", "Terms of Service")}</h1>
                        </div>

                        <div className="w-10" />
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-block p-4 bg-primary/10 rounded-2xl mb-4">
                        <Shield className="w-12 h-12 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold mb-3">
                        {t("شروط استخدام منصة شنو ناكل", "Shino Nakel Platform Terms")}
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        {t(
                            "يرجى قراءة هذه الشروط بعناية قبل استخدام خدماتنا",
                            "Please read these terms carefully before using our services"
                        )}
                    </p>

                    {page?.updated_at && (
                        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                                {t("آخر تحديث:", "Last updated:")} {new Date(page.updated_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                            </span>
                        </div>
                    )}
                </motion.div>

                {/* Sections Accordion */}
                <div className="space-y-4">
                    {sections.map((section, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
                        >
                            <button
                                onClick={() => toggleSection(index)}
                                className="w-full p-6 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                        <span className="text-primary font-bold text-sm">{index + 1}</span>
                                    </div>
                                    <h3 className="font-bold text-lg">{section.title}</h3>
                                </div>
                                {expandedSections.includes(index) ? (
                                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                )}
                            </button>

                            <AnimatePresence>
                                {expandedSections.includes(index) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-6 pb-6 pt-2">
                                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                                {section.content.split('\n').map((line, i) => (
                                                    line.trim() && (
                                                        <p key={i} className="text-muted-foreground leading-relaxed mb-3">
                                                            {line.trim()}
                                                        </p>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>

                {/* Footer CTA */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 text-center"
                >
                    <h3 className="font-bold text-xl mb-2">
                        {t("هل لديك أسئلة؟", "Have Questions?")}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        {t("تواصل معنا للمساعدة", "Contact us for assistance")}
                    </p>
                    <button
                        onClick={() => navigate("/contact")}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-medium"
                    >
                        {t("تواصل معنا", "Contact Us")}
                        <ArrowRight className={`w-4 h-4 ${language === "en" ? "rotate-180" : ""}`} />
                    </button>
                </motion.div>
            </main>

            <BottomNav />
        </div>
    );
};

export default Terms;
