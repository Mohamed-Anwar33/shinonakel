import { Home, List, User } from "lucide-react";
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
      <div className={`max-w-md mx-auto flex items-center justify-around py-2 ${language === "ar" ? "flex-row" : "flex-row-reverse"}`}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.button
              key={item.path}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-colors ${
                isActive
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
    </nav>
  );
};

export default BottomNav;
