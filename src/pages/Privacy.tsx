import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Calendar, Lock, Eye, Database, ChevronDown, ChevronUp } from "lucide-react";
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

const Privacy = () => {
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
                .eq("page_type", "privacy")
                .single();

            if (error) throw error;
            setPage(data as any);
        } catch (error) {
            console.error("Error fetching privacy policy:", error);
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

        return sections.length > 0 ? sections : [{ title: t("سياسة الخصوصية", "Privacy Policy"), content }];
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

    const privacyIcons = [Shield, Lock, Eye, Database];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-500/5 to-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-500/5 via-background to-background pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
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
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 rounded-full flex items-center justify-center">
                                <Shield className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h1 className="text-xl font-bold">{t("سياسة الخصوصية", "Privacy Policy")}</h1>
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
                    <div className="inline-block p-4 bg-emerald-500/10 rounded-2xl mb-4">
                        <Lock className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-bold mb-3">
                        {t("نحن نحترم خصوصيتك", "We Respect Your Privacy")}
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        {t(
                            "نوضح كيفية جمع واستخدام وحماية بياناتك الشخصية",
                            "We explain how we collect, use, and protect your personal data"
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

                {/* Trust Badges */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
                >
                    {[
                        { icon: Shield, label: t("حماية البيانات", "Data Protection") },
                        { icon: Lock, label: t("تشفير آمن", "Secure Encryption") },
                        { icon: Eye, label: t("شفافية كاملة", "Full Transparency") },
                        { icon: Database, label: t("خوادم آمنة", "Secure Servers") }
                    ].map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={index}
                                className="p-4 bg-card rounded-xl border border-border text-center"
                            >
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <Icon className="w-5 h-5 text-emerald-500" />
                                </div>
                                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                            </div>
                        );
                    })}
                </motion.div>

                {/* Sections Accordion */}
                <div className="space-y-4">
                    {sections.map((section, index) => {
                        const Icon = privacyIcons[index % privacyIcons.length];
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                                className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
                            >
                                <button
                                    onClick={() => toggleSection(index)}
                                    className="w-full p-6 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
                                            <Icon className="w-5 h-5 text-emerald-500" />
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
                        );
                    })}
                </div>

                {/* Footer CTA */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 p-8 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl border border-emerald-500/20 text-center"
                >
                    <h3 className="font-bold text-xl mb-2">
                        {t("مخاوف بشأن الخصوصية؟", "Privacy Concerns?")}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        {t("نحن هنا للمساعدة والإجابة على أسئلتك", "We're here to help and answer your questions")}
                    </p>
                    <button
                        onClick={() => navigate("/contact")}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors font-medium"
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

export default Privacy;
