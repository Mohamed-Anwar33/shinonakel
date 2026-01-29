import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Check for token in URL
  useEffect(() => {
    const urlToken = searchParams.get("token");
    
    if (urlToken) {
      // Custom Resend-based flow
      setToken(urlToken);
      setIsCheckingToken(false);
      setTokenError(null);
    } else {
      // Legacy Supabase flow - check for session
      const checkSession = async () => {
        try {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event) => {
              if (event === "PASSWORD_RECOVERY") {
                setIsCheckingToken(false);
                setTokenError(null);
              }
            }
          );

          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            setTokenError("حدث خطأ في التحقق من الجلسة");
          } else if (!session) {
            setTokenError("رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.");
          } else {
            setTokenError(null);
          }

          setIsCheckingToken(false);

          return () => subscription.unsubscribe();
        } catch {
          setTokenError("حدث خطأ غير متوقع");
          setIsCheckingToken(false);
        }
      };

      checkSession();
    }
  }, [searchParams]);

  // Validate password - must have uppercase, symbol, numbers, min 8 chars
  const validatePassword = (value: string): boolean => {
    const hasUppercase = /[A-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const hasMinLength = value.length >= 8;

    if (!hasMinLength) {
      setPasswordError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return false;
    }
    if (!hasUppercase) {
      setPasswordError("كلمة المرور يجب أن تحتوي على حرف كبير");
      return false;
    }
    if (!hasNumber) {
      setPasswordError("كلمة المرور يجب أن تحتوي على رقم");
      return false;
    }
    if (!hasSymbol) {
      setPasswordError("كلمة المرور يجب أن تحتوي على رمز (!@#$%...)");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value) validatePassword(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword(password)) {
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمتا المرور غير متطابقتين",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      if (token) {
        // Custom Resend-based flow
        const response = await supabase.functions.invoke("confirm-password-reset", {
          body: { token, newPassword: password }
        });

        if (response.error) throw response.error;
        
        const data = response.data;
        if (data?.error) throw new Error(data.error);
      } else {
        // Legacy Supabase flow
        const { error } = await supabase.auth.updateUser({
          password
        });

        if (error) throw error;
      }

      setIsSuccess(true);
      toast({
        title: "تم بنجاح",
        description: "تم تغيير كلمة المرور"
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/welcome");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message === "Auth session missing!"
          ? "انتهت صلاحية الجلسة. يرجى طلب رابط جديد لإعادة تعيين كلمة المرور."
          : error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking token
  if (isCheckingToken) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">جاري التحقق...</p>
        </motion.div>
      </div>
    );
  }

  // Show error if token is invalid (only for legacy flow without token param)
  if (tokenError && !token) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <motion.img
            src={logo}
            alt="شنو ناكل"
            className="w-24 h-24 mx-auto mb-4 rounded-2xl"
          />
          <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">رابط غير صالح</h2>
          <p className="text-muted-foreground mb-6">
            {tokenError}
          </p>
          <Button
            onClick={() => navigate("/welcome")}
            className="w-full h-12"
          >
            طلب رابط جديد
          </Button>
        </motion.div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">تم بنجاح!</h2>
          <p className="text-muted-foreground">
            تم تغيير كلمة المرور، جاري تحويلك...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-card p-6 rounded-3xl shadow-card border border-border/50"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <motion.img
            src={logo}
            alt="شنو ناكل"
            className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-sm"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          />
          <h1 className="text-2xl font-bold mb-2">إعادة تعيين كلمة المرور</h1>
          <p className="text-muted-foreground text-sm">
            أدخل كلمة المرور الجديدة
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="كلمة المرور الجديدة"
                value={password}
                onChange={handlePasswordChange}
                className="h-12 text-base pr-4 pl-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-destructive text-sm mt-1">{passwordError}</p>
            )}
          </div>

          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="تأكيد كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 text-base pr-4 pl-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <ul className="text-xs text-muted-foreground space-y-1 pr-2 list-disc list-inside">
            <li className={password.length >= 8 ? "text-green-500" : ""}>8 أحرف على الأقل</li>
            <li className={/[A-Z]/.test(password) ? "text-green-500" : ""}>حرف كبير (A-Z)</li>
            <li className={/[0-9]/.test(password) ? "text-green-500" : ""}>رقم (0-9)</li>
            <li className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "text-green-500" : ""}>رمز (!@#$)</li>
          </ul>

          <Button
            type="submit"
            className="w-full h-12 text-base font-bold shadow-button hover:shadow-button-hover transition-all"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ كلمة المرور"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/welcome")}
            className="w-full h-12 text-base"
          >
            إلغاء
          </Button>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
