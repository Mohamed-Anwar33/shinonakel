import { useNavigate } from "react-router-dom";
import { MapPin, LogOut, ChevronDown, User, UserCircle, Languages, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";

const Header = () => {
  const navigate = useNavigate();
  const { user, profile, isGuest, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const handleSignOut = async () => {
    await signOut();
    navigate("/welcome");
  };

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  return (
    <header className={`flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b border-border ${language === "ar" ? "flex-row" : "flex-row-reverse"}`}>
      <div className="flex items-center gap-2">
        {user && !isGuest ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 focus:outline-none">
              <User className="w-6 h-6 text-foreground" />
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align={language === "ar" ? "start" : "end"} className="w-48">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 cursor-pointer">
                <UserCircle className="w-4 h-4" />
                <span>{t("الملف الشخصي", "Profile")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleLanguage} className="gap-2 cursor-pointer">
                <Languages className="w-4 h-4" />
                <span>{language === "ar" ? "English" : "العربية"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4" />
                <span>{t("تسجيل الخروج", "Logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => navigate(isGuest ? "/welcome" : "/profile")}
            className="p-2"
          >
            <User className="w-6 h-6 text-foreground" />
          </button>
        )}
      </div>
      
      <div className={`flex items-center gap-4 text-primary ${language === "ar" ? "flex-row" : "flex-row-reverse"}`}>
        <button
          onClick={() => navigate("/contact")}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
        >
          <span className="font-medium text-sm">{t("تواصل", "Contact")}</span>
          <MessageCircle className="w-4 h-4" />
        </button>
        <div className={`flex items-center gap-2 ${language === "ar" ? "flex-row" : "flex-row-reverse"}`}>
          <span className="font-medium text-sm">{t("الكويت", "Kuwait")}</span>
          <MapPin className="w-5 h-5" />
        </div>
      </div>
    </header>
  );
};

export default Header;
