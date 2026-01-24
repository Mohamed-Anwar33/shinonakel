import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, X, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const CompleteProfilePrompt = () => {
  const navigate = useNavigate();
  const { user, profile, isGuest, isLoading } = useAuth();
  const { t } = useLanguage();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isLoading && user && !isGuest && profile) {
      const hasNoUsername = !profile.username || profile.username.trim() === "";
      
      const dismissedKey = `profile_prompt_dismissed_${user.id}`;
      const wasDismissed = sessionStorage.getItem(dismissedKey);
      
      if (hasNoUsername && !wasDismissed && !dismissed) {
        const timer = setTimeout(() => setShowPrompt(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, profile, isGuest, isLoading, dismissed]);

  const handleDismiss = () => {
    if (user) {
      sessionStorage.setItem(`profile_prompt_dismissed_${user.id}`, "true");
    }
    setDismissed(true);
    setShowPrompt(false);
  };

  const handleGoToProfile = () => {
    handleDismiss();
    navigate("/profile");
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-sm"
            dir="rtl"
          >
            <div className="bg-card rounded-3xl p-6 shadow-elevated">
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 left-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>

              {/* Content */}
              <h2 className="text-xl font-bold text-center mb-2">
                {t("أهلاً بك! 👋", "Welcome! 👋")}
              </h2>
              <p className="text-muted-foreground text-center mb-6">
                {t(
                  "أكمل ملفك الشخصي بإضافة اسم مستخدم لتتمكن من حفظ المطاعم المفضلة وإضافة التقييمات",
                  "Complete your profile by adding a username to save favorite restaurants and add reviews"
                )}
              </p>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={handleGoToProfile}
                  className="w-full gap-2"
                >
                  {t("إكمال الملف الشخصي", "Complete Profile")}
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  className="w-full text-muted-foreground"
                >
                  {t("لاحقاً", "Later")}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CompleteProfilePrompt;
