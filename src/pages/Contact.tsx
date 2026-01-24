import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Store, Megaphone, Send, CheckCircle, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DELIVERY_APPS } from "@/lib/deliveryApps";

type ContactType = "restaurant" | "advertise" | null;

const Contact = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { toast } = useToast();
  
  const [selectedType, setSelectedType] = useState<ContactType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantPhone, setRestaurantPhone] = useState("");
  const [message, setMessage] = useState("");
  
  // Delivery apps for restaurant form
  const [selectedDeliveryApps, setSelectedDeliveryApps] = useState<{ name: string; url: string }[]>([]);

  const toggleDeliveryApp = (appName: string) => {
    const existing = selectedDeliveryApps.find((a) => a.name === appName);
    if (existing) {
      setSelectedDeliveryApps(selectedDeliveryApps.filter((a) => a.name !== appName));
    } else {
      setSelectedDeliveryApps([...selectedDeliveryApps, { name: appName, url: "" }]);
    }
  };

  const handleDeliveryAppUrlChange = (appName: string, url: string) => {
    setSelectedDeliveryApps(
      selectedDeliveryApps.map((a) => (a.name === appName ? { ...a, url } : a))
    );
  };

  const buildRestaurantMessage = () => {
    let msg = "";
    if (restaurantPhone) {
      msg += `رقم المطعم: ${restaurantPhone}\n`;
    }
    if (selectedDeliveryApps.length > 0) {
      msg += "\nروابط التوصيل:\n";
      selectedDeliveryApps.forEach((app) => {
        msg += `- ${app.name}: ${app.url || "غير محدد"}\n`;
      });
    }
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalMessage = selectedType === "restaurant" ? buildRestaurantMessage() : message;
    
    if (!name || !email || !phone) {
      toast({
        title: t("خطأ", "Error"),
        description: t("يرجى ملء جميع الحقول المطلوبة", "Please fill all required fields"),
        variant: "destructive",
      });
      return;
    }

    if (selectedType === "advertise" && !message) {
      toast({
        title: t("خطأ", "Error"),
        description: t("يرجى كتابة رسالتك", "Please write your message"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("contact_requests").insert({
        name,
        email,
        phone,
        restaurant_name: selectedType === "restaurant" ? restaurantName : null,
        message: finalMessage,
        request_type: selectedType,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: t("تم الإرسال بنجاح", "Submitted Successfully"),
        description: t("سنتواصل معك قريباً", "We'll contact you soon"),
      });
    } catch (error: any) {
      console.error("Error submitting contact request:", error);
      toast({
        title: t("خطأ", "Error"),
        description: t("حدث خطأ أثناء إرسال الطلب", "An error occurred while submitting"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedType(null);
    setIsSubmitted(false);
    setName("");
    setEmail("");
    setPhone("");
    setRestaurantName("");
    setRestaurantPhone("");
    setMessage("");
    setSelectedDeliveryApps([]);
  };

  const contactOptions = [
    {
      type: "restaurant" as ContactType,
      icon: <Store className="w-8 h-8" />,
      title: t("أضف مطعمك", "Add Your Restaurant"),
      description: t("انضم لمنصتنا واحصل على عملاء جدد", "Join our platform and get new customers"),
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      type: "advertise" as ContactType,
      icon: <Megaphone className="w-8 h-8" />,
      title: t("أعلن معنا", "Advertise With Us"),
      description: t("روّج لمطعمك واوصل لجمهور أكبر", "Promote your restaurant and reach more audience"),
      gradient: "from-primary to-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowRight className={`w-6 h-6 ${language === "en" ? "rotate-180" : ""}`} />
        </button>
        <h1 className="text-lg font-bold">{t("تواصل معنا", "Contact Us")}</h1>
        <div className="w-10" />
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {isSubmitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">{t("شكراً لتواصلك!", "Thank You!")}</h2>
              <p className="text-muted-foreground mb-8">
                {t("تم استلام طلبك وسنتواصل معك قريباً", "Your request has been received and we'll contact you soon")}
              </p>
              <Button onClick={resetForm} variant="outline">
                {t("إرسال طلب آخر", "Submit Another Request")}
              </Button>
            </motion.div>
          ) : !selectedType ? (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">{t("كيف نقدر نساعدك؟", "How can we help you?")}</h2>
                <p className="text-muted-foreground">
                  {t("اختر نوع الطلب للمتابعة", "Select request type to continue")}
                </p>
              </div>

              <div className="grid gap-4">
                {contactOptions.map((option) => (
                  <motion.button
                    key={option.type}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedType(option.type)}
                    className="w-full text-right"
                  >
                    <Card className="overflow-hidden border-2 hover:border-primary/50 transition-colors">
                      <CardContent className="p-6">
                        <div className={`flex items-center gap-4 ${language === "en" ? "flex-row-reverse text-left" : ""}`}>
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center text-white shrink-0`}>
                            {option.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold mb-1">{option.title}</h3>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <button
                onClick={() => setSelectedType(null)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowRight className={`w-4 h-4 ${language === "en" ? "rotate-180" : ""}`} />
                <span>{t("رجوع", "Back")}</span>
              </button>

              <Card>
                <CardHeader>
                  <CardTitle className="text-center">
                    {selectedType === "restaurant" 
                      ? t("أضف مطعمك", "Add Your Restaurant")
                      : t("أعلن معنا", "Advertise With Us")
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t("الاسم", "Name")} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("أدخل اسمك", "Enter your name")}
                        className="text-right"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t("البريد الإلكتروني", "Email")} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("example@email.com", "example@email.com")}
                        className="text-right"
                        dir="ltr"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t("رقم الهاتف", "Phone Number")} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t("+965 XXXX XXXX", "+965 XXXX XXXX")}
                        className="text-right"
                        dir="ltr"
                        required
                      />
                    </div>

                    {selectedType === "restaurant" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            {t("اسم المطعم", "Restaurant Name")} <span className="text-destructive">*</span>
                          </label>
                          <Input
                            value={restaurantName}
                            onChange={(e) => setRestaurantName(e.target.value)}
                            placeholder={t("أدخل اسم المطعم", "Enter restaurant name")}
                            className="text-right"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            {t("رقم المطعم", "Restaurant Phone")}
                          </label>
                          <Input
                            type="tel"
                            value={restaurantPhone}
                            onChange={(e) => setRestaurantPhone(e.target.value)}
                            placeholder={t("+965 XXXX XXXX", "+965 XXXX XXXX")}
                            className="text-right"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            {t("تطبيقات التوصيل", "Delivery Apps")}
                          </label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {DELIVERY_APPS.map((app) => {
                              const isSelected = selectedDeliveryApps.some((a) => a.name === app.name);
                              return (
                                <button
                                  key={app.name}
                                  type="button"
                                  onClick={() => toggleDeliveryApp(app.name)}
                                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border-2 ${
                                    isSelected
                                      ? "text-white"
                                      : "bg-background text-foreground hover:opacity-80"
                                  }`}
                                  style={{
                                    borderColor: app.color,
                                    backgroundColor: isSelected ? app.color : "transparent",
                                  }}
                                >
                                  {app.name}
                                </button>
                              );
                            })}
                          </div>
                          {selectedDeliveryApps.length > 0 && (
                            <div className="space-y-2">
                              {selectedDeliveryApps.map((app) => (
                                <div key={app.name} className="flex items-center gap-2">
                                  <span 
                                    className="text-sm font-medium min-w-[80px] text-right"
                                    style={{ color: DELIVERY_APPS.find(a => a.name === app.name)?.color }}
                                  >
                                    {app.name}:
                                  </span>
                                  <Input
                                    value={app.url}
                                    onChange={(e) => handleDeliveryAppUrlChange(app.name, e.target.value)}
                                    placeholder={t("رابط التطبيق", "App URL")}
                                    className="flex-1"
                                    dir="ltr"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {selectedType === "advertise" && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {t("رسالتك", "Your Message")} <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder={t("أخبرنا عن احتياجاتك الإعلانية...", "Tell us about your advertising needs...")}
                          className="text-right min-h-[120px]"
                          required
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {t("إرسال", "Submit")}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Contact;
