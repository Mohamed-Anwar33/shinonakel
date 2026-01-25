import { Home, List, User, FileText, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t } = useLanguage();

  const navItems = [
    { icon: <List className="w-6 h-6" />, label: t("ذوقي", "My Taste"), path: "/my-list" },
    { icon: <Home className="w-6 h-6" />, label: t("الرئيسية", "Home"), path: "/" },
    { icon: <User className="w-6 h-6" />, label: t("ملفي", "Profile"), path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated">
      <div className={`max-w-md mx-auto ${language === "ar" ? "" : ""}`.trim()}>
        {/* Main Navigation */}
        <div className={`flex items-center justify-around py-2 ${language === "ar" ? "flex-row" : "flex-row-reverse"}`}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-colors ${isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {isActive ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg" />
                    {item.icon}
                  </div>
                ) : (
                  item.icon
                )}
                <span className="text-xs font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Legal Links */}
        <div className="border-t border-border/50 py-2 px-4">
          <div className="flex items-center justify-center gap-4 text-xs">
            <button
              onClick={() => navigate("/terms")}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <FileText className="w-3 h-3" />
              {t("الشروط", "Terms")}
            </button>
            <span className="text-muted-foreground">•</span>
            <button
              onClick={() => navigate("/privacy")}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <Shield className="w-3 h-3" />
              {t("الخصوصية", "Privacy")}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
