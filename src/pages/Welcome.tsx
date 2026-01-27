import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, User, Eye, EyeOff, Phone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const Welcome = () => {
  const navigate = useNavigate();
  const { signInWithEmail, continueAsGuest } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();

  const [mode, setMode] = useState<"welcome" | "login" | "signup" | "verify" | "forgot">("welcome");
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("email"); // New: signup method toggle
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // New: phone number
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingUsername, setPendingUsername] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    const savedRememberMe = localStorage.getItem('rememberMe');

    if (savedRememberMe === 'true' && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const validateUsername = (value: string): boolean => {
    const englishOnlyRegex = /^[a-zA-Z0-9_.]+$/;
    if (!value.trim()) {
      setUsernameError(t("الرجاء إدخال اسم المستخدم", "Please enter a username"));
      return false;
    }
    if (!englishOnlyRegex.test(value)) {
      setUsernameError(t("اسم المستخدم يجب أن يكون بالإنجليزية فقط", "Username must be in English only"));
      return false;
    }
    if (value.length < 3) {
      setUsernameError(t("اسم المستخدم يجب أن يكون 3 أحرف على الأقل", "Username must be at least 3 characters"));
      return false;
    }
    setUsernameError("");
    return true;
  };

  const validatePassword = (value: string): boolean => {
    const hasUppercase = /[A-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const hasMinLength = value.length >= 8;

    if (!hasMinLength) {
      setPasswordError(t("كلمة المرور يجب أن تكون 8 أحرف على الأقل", "Password must be at least 8 characters"));
      return false;
    }
    if (!hasUppercase) {
      setPasswordError(t("كلمة المرور يجب أن تحتوي على حرف كبير", "Password must contain an uppercase letter"));
      return false;
    }
    if (!hasNumber) {
      setPasswordError(t("كلمة المرور يجب أن تحتوي على رقم", "Password must contain a number"));
      return false;
    }
    if (!hasSymbol) {
      setPasswordError(t("كلمة المرور يجب أن تحتوي على رمز (!@#$%...)", "Password must contain a symbol (!@#$%...)"));
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const sanitized = value.replace(/[^a-zA-Z0-9_.]/g, '');
    setUsername(sanitized);
    if (sanitized) validateUsername(sanitized);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (mode === "signup" && value) validatePassword(value);
  };

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup") {
      const isUsernameValid = validateUsername(username);
      const isPasswordValid = validatePassword(password);

      if (!isUsernameValid || !isPasswordValid) {
        return;
      }

      // Validate phone if using phone signup
      if (signupMethod === "phone" && !phone.trim()) {
        toast({
          title: t("خطأ", "Error"),
          description: t("يرجى إدخال رقم الهاتف", "Please enter phone number"),
          variant: "destructive"
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmail(email, password, rememberMe);
        navigate("/");
      } else {
        // Phone signup without OTP - direct registration
        if (signupMethod === "phone") {
          // Check if phone number already exists
          const { data: existingPhone, error: checkError } = await supabase
            .from("profiles")
            .select("id")
            .eq("full_name", phone)
            .maybeSingle();

          if (checkError) {
            console.error("Error checking phone:", checkError);
          }

          if (existingPhone) {
            toast({
              title: t("رقم الهاتف مسجل", "Phone already registered"),
              description: t("هذا الرقم مستخدم بالفعل", "This number is already in use"),
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // Create account with email format from phone
          const phoneEmail = `${phone.replace(/[^0-9]/g, '')}@phone.local`;

          const { data, error } = await supabase.auth.signUp({
            email: phoneEmail,
            password: password,
            options: {
              data: {
                username: username,
                phone: phone
              }
            }
          });

          if (error) throw error;

          if (data.user) {
            // Create profile
            const { error: profileError } = await supabase
              .from("profiles")
              .insert({
                id: data.user.id,
                username: username,
                full_name: phone,
                is_private: true
              });

            if (profileError && !profileError.message.includes('duplicate')) {
              throw profileError;
            }

            // Auto login
            await signInWithEmail(phoneEmail, password, true);

            toast({
              title: t("تم إنشاء الحساب", "Account created"),
              description: t("مرحباً بك!", "Welcome!")
            });
            navigate("/");
          }
        } else {
          // Email signup with OTP (existing flow)
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              data: {
                username
              }
            }
          });

          if (error) throw error;

          sessionStorage.setItem('_temp_signup_password', password);

          setPendingUsername(username);
          setMode("verify");
          toast({
            title: t("تم إرسال رمز التحقق", "Verification code sent"),
            description: t("تفقد بريدك الإلكتروني", "Check your email")
          });
        }
      }
    } catch (error: any) {
      toast({
        title: mode === "login" ? t("خطأ في تسجيل الدخول", "Login error") : t("خطأ في التسجيل", "Registration error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: t("خطأ", "Error"),
        description: t("الرجاء إدخال رمز التحقق كاملاً", "Please enter the complete verification code"),
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });

      if (error) throw error;

      if (data.user) {
        const storedPassword = sessionStorage.getItem('_temp_signup_password') || password;

        const { error: updateError } = await supabase.auth.updateUser({
          password: storedPassword
        });

        if (updateError) throw updateError;

        sessionStorage.removeItem('_temp_signup_password');

        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            username: pendingUsername,
            full_name: email.split("@")[0],
            is_private: true
          });

        if (profileError && !profileError.message.includes('duplicate')) {
          throw profileError;
        }

        toast({
          title: t("تم التحقق بنجاح", "Verification successful"),
          description: t("مرحباً بك!", "Welcome!")
        });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: t("خطأ في التحقق", "Verification error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            username: pendingUsername
          }
        }
      });

      if (error) throw error;
      toast({
        title: t("تم إعادة الإرسال", "Resent"),
        description: t("تفقد بريدك الإلكتروني", "Check your email")
      });
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: t("خطأ", "Error"),
        description: t("الرجاء إدخال البريد الإلكتروني", "Please enter your email"),
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast({
        title: t("تم الإرسال", "Sent"),
        description: t("تفقد بريدك الإلكتروني لإعادة تعيين كلمة المرور", "Check your email to reset your password")
      });
      setMode("welcome");
    } catch (error: any) {
      toast({
        title: t("خطأ", "Error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestMode = () => {
    continueAsGuest();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Language Toggle - Top Right */}
      <button
        onClick={toggleLanguage}
        className="absolute top-4 right-4 text-primary font-medium hover:underline"
      >
        {language === "ar" ? "English" : "العربية"}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.img
            src={logo}
            alt={t("شنو ناكل", "What to eat")}
            className="w-24 h-24 mx-auto mb-4 rounded-2xl"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          />
          <h1 className="text-3xl font-extrabold">
            <span className="text-foreground">{t("شنو", "What")}</span>{" "}
            <span className="text-primary">{t("ناكل؟", "to eat?")}</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("اكتشف أفضل المطاعم حولك", "Discover the best restaurants around you")}
          </p>
        </div>

        {mode === "welcome" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Sign In */}
            <Button
              onClick={() => setMode("login")}
              variant="outline"
              className="w-full h-12 text-base border-2"
            >
              <Mail className="w-5 h-5" />
              {t("تسجيل الدخول", "Sign in")}
            </Button>

            {/* Login Options Hint */}
            <p className="text-center text-xs text-muted-foreground mt-2">
              {t("بالإيميل أو رقم الهاتف", "With email or phone")}
            </p>

            {/* Sign Up */}
            <Button
              onClick={() => setMode("signup")}
              size="lg"
              className="w-full h-14 text-lg font-bold shadow-button hover:shadow-button-hover"
            >
              {t("إنشاء حساب جديد", "Create new account")}
            </Button>

            {/* Registration Options Hint */}
            <p className="text-center text-xs text-muted-foreground mt-2 flex items-center justify-center gap-2">
              <Mail className="w-3 h-3" />
              {t("سجّل بالإيميل أو رقم الهاتف", "Sign up with email or phone")}
              <Phone className="w-3 h-3" />
            </p>

            {/* Guest Mode */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t("أو", "or")}</span>
              </div>
            </div>

            <Button
              onClick={handleGuestMode}
              variant="ghost"
              className="w-full h-12 text-base gap-3"
            >
              <User className="w-5 h-5" />
              {t("الدخول كزائر", "Continue as guest")}
            </Button>
          </motion.div>
        )}

        {(mode === "login" || mode === "signup") && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleAuth}
            className="space-y-2"
          >
            {mode === "signup" && (
              <>
                {/* Signup Method Toggle */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSignupMethod("email")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${signupMethod === "email"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {t("بريد إلكتروني", "Email")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupMethod("phone")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${signupMethod === "phone"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {t("رقم الهاتف", "Phone")}
                  </button>
                </div>

                <div>
                  <Input
                    type="text"
                    placeholder={t("اسم المستخدم (بالإنجليزية)", "Username (English only)")}
                    value={username}
                    onChange={handleUsernameChange}
                    className="h-12 text-base"
                    dir="ltr"
                    required
                  />
                  {usernameError && (
                    <p className="text-destructive text-sm mt-1">{usernameError}</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-1">
                    {t("أحرف إنجليزية وأرقام و . _ فقط", "English letters, numbers, . and _ only")}
                  </p>
                </div>
              </>
            )}

            {/* Email or Phone based on signup method */}
            {mode === "signup" && signupMethod === "phone" ? (
              <Input
                type="tel"
                placeholder={t("رقم الهاتف (05XXXXXXXX)", "Phone (05XXXXXXXX)")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 text-base"
                dir="ltr"
                required
              />
            ) : (
              <Input
                type="email"
                placeholder={mode === "login"
                  ? t("البريد الإلكتروني أو رقم الهاتف", "Email or Phone Number")
                  : t("البريد الإلكتروني", "Email")
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base"
                required
              />
            )}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t("كلمة المرور", "Password")}
                value={password}
                onChange={handlePasswordChange}
                className="h-12 text-base [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10 ${language === "ar" ? "left-3" : "right-3"}`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {mode === "signup" && (
              <>
                {passwordError && (
                  <p className="text-destructive text-sm mt-1">{passwordError}</p>
                )}
                <p className="text-muted-foreground text-xs mt-1">
                  {t("8 أحرف على الأقل، حرف كبير، رقم، ورمز", "At least 8 characters, uppercase, number, and symbol")}
                </p>
              </>
            )}

            {mode === "login" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  {t("تذكرني", "Remember me")}
                </label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={isLoading}
            >
              {isLoading ? t("جاري التحميل...", "Loading...") : mode === "login" ? t("تسجيل الدخول", "Sign in") : t("إنشاء الحساب", "Create account")}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode("welcome");
                setUsernameError("");
                setPasswordError("");
              }}
              className="w-full h-12 text-base"
            >
              {t("رجوع", "Back")}
            </Button>

            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="w-full text-center text-sm text-primary hover:underline"
                >
                  {t("نسيت كلمة المرور؟", "Forgot password?")}
                </button>
                <p className="text-center text-sm text-muted-foreground">
                  {t("ليس لديك حساب؟", "Don't have an account?")}{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary hover:underline"
                  >
                    {t("إنشاء حساب", "Create account")}
                  </button>
                </p>
              </>
            )}

            {mode === "signup" && (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  {t("لديك حساب بالفعل؟", "Already have an account?")}{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline"
                  >
                    {t("تسجيل الدخول", "Sign in")}
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground text-center">
                {t("بالتسجيل، أنت توافق على", "By signing up, you agree to our")}{" "}
                <Link to="/legal?tab=terms" className="text-primary hover:underline">
                  {t("شروط الاستخدام", "Terms of Service")}
                </Link>{" "}
                {t("و", "and")}{" "}
                <Link to="/legal?tab=privacy" className="text-primary hover:underline">
                  {t("سياسة الخصوصية", "Privacy Policy")}
                </Link>
              </p>
            )}
          </motion.form>
        )}

        {mode === "verify" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Mail className="w-16 h-16 mx-auto text-primary mb-4" />
              <h2 className="text-xl font-bold mb-2">{t("تحقق من بريدك", "Check your email")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("أدخل رمز التحقق المرسل إلى", "Enter the verification code sent to")}
              </p>
              <p className="text-primary font-medium" dir="ltr">{email}</p>
            </div>

            <div className="flex justify-center" dir="ltr">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              onClick={handleVerifyOtp}
              className="w-full h-12 text-base"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? t("جاري التحقق...", "Verifying...") : t("تأكيد", "Confirm")}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading}
                className="text-primary hover:underline text-sm"
              >
                {t("إعادة إرسال الرمز", "Resend code")}
              </button>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode("signup");
                setOtp("");
              }}
              className="w-full h-12 text-base"
            >
              {t("رجوع", "Back")}
            </Button>
          </motion.div>
        )}

        {mode === "forgot" && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleForgotPassword}
            className="space-y-6"
          >
            <div className="text-center">
              <Mail className="w-16 h-16 mx-auto text-primary mb-4" />
              <h2 className="text-xl font-bold mb-2">{t("نسيت كلمة المرور؟", "Forgot password?")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين", "Enter your email and we'll send you a reset link")}
              </p>
            </div>

            <Input
              type="email"
              placeholder={t("البريد الإلكتروني", "Email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-base"
              required
            />

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={isLoading}
            >
              {isLoading ? t("جاري الإرسال...", "Sending...") : t("إرسال رابط إعادة التعيين", "Send reset link")}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode("login");
                setEmail("");
              }}
              className="w-full h-12 text-base"
            >
              {t("رجوع", "Back")}
            </Button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
};

export default Welcome;
