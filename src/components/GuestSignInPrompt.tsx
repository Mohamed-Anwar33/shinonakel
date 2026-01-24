import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GuestSignInPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuestSignInPrompt = ({ isOpen, onClose }: GuestSignInPromptProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSignIn = () => {
    onClose();
    navigate("/welcome");
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-sm mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-lg">
            {t("سجّل / أنشئ حساب عشان تكمّل", "Sign in / Create account to continue")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground">
            {t(
              "هذه الميزة متاحة للمستخدمين المسجّلين فقط",
              "This feature is available for registered users only"
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={handleSignIn}
            className="w-full"
          >
            {t("تسجيل الدخول", "Sign In")}
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={onClose}
            className="w-full mt-0"
          >
            {t("لاحقاً", "Later")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default GuestSignInPrompt;
