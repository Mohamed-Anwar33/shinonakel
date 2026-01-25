import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Search, ArrowRight, Compass, MapPin, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const quickLinks = [
    {
      icon: Home,
      label: t("الرئيسية", "Home"),
      path: "/",
      color: "from-primary to-orange-500"
    },
    {
      icon: Compass,
      label: t("اختر وجبتك", "Pick Your Meal"),
      path: "/categories",
      color: "from-emerald-500 to-teal-500"
    },
    {
      icon: Utensils,
      label: t("تصفح المطاعم", "Browse Restaurants"),
      path: "/my-list",
      color: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center px-4"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="max-w-2xl w-full text-center">
        {/* Animated 404 */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="relative inline-block">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-orange-500/20 blur-3xl" />

            {/* Main 404 text */}
            <h1 className="relative text-9xl md:text-[12rem] font-black bg-gradient-to-r from-primary via-orange-500 to-primary bg-clip-text text-transparent">
              404
            </h1>
          </div>

          {/* Floating food emojis */}
          <div className="relative h-20">
            <motion.div
              animate={{
                y: [0, -20, 0],
                rotate: [0, 10, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute left-1/4 top-0 text-6xl"
            >
              🍕
            </motion.div>
            <motion.div
              animate={{
                y: [0, -15, 0],
                rotate: [0, -10, 0]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
              className="absolute right-1/4 top-0 text-6xl"
            >
              🍔
            </motion.div>
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("😕 الصفحة غير موجودة", "😕 Page Not Found")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            {t(
              "يبدو أن الصفحة اللي تدور عليها مش موجودة أو تم نقلها",
              "Looks like the page you're looking for doesn't exist or has been moved"
            )}
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mb-8"
        >
          <p className="text-sm font-medium text-muted-foreground mb-4">
            {t("جرب واحد من هذي:", "Try one of these:")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <button
                    onClick={() => navigate(link.path)}
                    className="w-full p-6 bg-card rounded-2xl border-2 border-border hover:border-primary/50 transition-all group"
                  >
                    <div className={`w-14 h-14 mx-auto mb-3 bg-gradient-to-br ${link.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <p className="font-semibold">{link.label}</p>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            size="lg"
            className="gap-2 border-2"
          >
            <ArrowRight className={`w-5 h-5 ${language === "en" ? "rotate-180" : ""}`} />
            {t("رجوع للصفحة السابقة", "Go Back")}
          </Button>
        </motion.div>

        {/* Fun fact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12 p-6 bg-primary/5 rounded-2xl border border-primary/20"
        >
          <p className="text-sm text-muted-foreground">
            💡 {t(
              "هل تعلم؟ شنو ناكل يساعدك تكتشف أفضل المطاعم بكل سهولة!",
              "Did you know? Shino Nakel helps you discover the best restaurants easily!"
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
