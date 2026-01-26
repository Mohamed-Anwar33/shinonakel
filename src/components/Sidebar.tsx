import { useState } from "react";
import { X, Globe, Mail, LogOut, FileText, Shield, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();
    const { user, isGuest, signOut } = useAuth();

    const handleLanguageToggle = () => {
        setLanguage(language === "ar" ? "en" : "ar");
        toast({
            title: language === "ar" ? "Language Changed" : "تم تغيير اللغة",
            description: language === "ar" ? "Language changed to English" : "تم تغيير اللغة إلى العربية"
        });
    };

    const handleLogout = async () => {
        await signOut();
        navigate("/welcome");
        onClose();
        toast({
            title: t("تم تسجيل الخروج", "Logged Out"),
            description: t("تم تسجيل الخروج بنجاح", "You have been logged out successfully")
        });
    };

    const menuItems = [
        {
            icon: Globe,
            label: language === "ar" ? "English" : "عربي",
            onClick: handleLanguageToggle,
            show: true
        },
        {
            icon: Mail,
            label: t("تواصل معنا", "Contact Us"),
            onClick: () => {
                navigate("/contact");
                onClose();
            },
            show: true
        },

        {
            icon: LogOut,
            label: t("تسجيل الخروج", "Logout"),
            onClick: handleLogout,
            show: user && !isGuest,
            danger: true
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: language === "ar" ? "100%" : "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: language === "ar" ? "100%" : "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={`fixed top-0 ${language === "ar" ? "right-0" : "left-0"} h-full w-80 max-w-[85vw] bg-card border-${language === "ar" ? "l" : "r"} border-border shadow-2xl z-50`}
                        dir={language === "ar" ? "rtl" : "ltr"}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-border">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold">{t("القائمة", "Menu")}</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-muted rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {user && !isGuest && (
                                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                                    <p className="text-sm font-medium">{user.email || user.user_metadata?.phone}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t("مرحباً بك", "Welcome back")}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Menu Items */}
                        <div className="p-4 space-y-2">
                            {menuItems.filter(item => item.show).map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <motion.button
                                        key={index}
                                        initial={{ opacity: 0, x: language === "ar" ? 20 : -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        onClick={item.onClick}
                                        className={`w-full flex items-center gap-3 p-4 rounded-xl hover:bg-muted transition-colors ${item.danger ? "text-destructive hover:bg-destructive/10" : ""
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.danger ? "bg-destructive/10" : "bg-primary/10"
                                            }`}>
                                            <Icon className={`w-5 h-5 ${item.danger ? "text-destructive" : "text-primary"}`} />
                                        </div>
                                        <span className="font-medium flex-1 text-left">{item.label}</span>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
                            <p className="text-xs text-center text-muted-foreground">
                                {t("شنو ناكل © 2025", "Shino Nakel © 2025")}
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Sidebar;
