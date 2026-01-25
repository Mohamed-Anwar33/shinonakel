-- Create legal_pages table for Terms of Service and Privacy Policy
-- This allows admin to edit these pages from the admin panel

CREATE TABLE IF NOT EXISTS legal_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_type TEXT NOT NULL CHECK (page_type IN ('terms', 'privacy')),
  content TEXT NOT NULL DEFAULT '',
  content_en TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(page_type)
);

-- Enable RLS
ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;

-- Allow all users (including unauthenticated) to read legal pages
CREATE POLICY "Allow public read access to legal pages" ON legal_pages
  FOR SELECT USING (true);

-- Only admins can insert, update, or delete legal pages
CREATE POLICY "Admin full access to legal pages" ON legal_pages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert default content for terms and privacy
INSERT INTO legal_pages (page_type, content, content_en)
VALUES 
  ('terms', '# شروط الاستخدام

## مرحباً بكم في شنو ناكل

يرجى قراءة هذه الشروط بعناية قبل استخدام التطبيق.

### 1. القبول بالشروط
باستخدام هذا التطبيق، أنت توافق على الالتزام بهذه الشروط.

### 2. استخدام التطبيق
- التطبيق مخصص لاكتشاف المطاعم والحصول على توصيات
- يجب استخدام التطبيق بطريقة قانونية ومسؤولة
- يُمنع نشر محتوى مسيء أو غير قانوني

### 3. الإعلانات
- قد يحتوي التطبيق على إعلانات مدفوعة
- نحن لسنا مسؤولين عن محتوى المطاعم المعلنة

### 4. التعديلات
نحتفظ بالحق في تعديل هذه الشروط في أي وقت.

---
*آخر تحديث: ' || now() || '*', 
    '# Terms of Service

## Welcome to Shino Nakel

Please read these terms carefully before using the app.

### 1. Acceptance of Terms
By using this app, you agree to comply with these terms.

### 2. Use of the App
- The app is designed to discover restaurants and get recommendations
- You must use the app legally and responsibly
- Posting offensive or illegal content is prohibited

### 3. Advertisements
- The app may contain paid advertisements
- We are not responsible for the content of advertised restaurants

### 4. Modifications
We reserve the right to modify these terms at any time.

---
*Last updated: ' || now() || '*'),
  
  ('privacy', '# سياسة الخصوصية

## التزامنا بخصوصيتك

نحن في "شنو ناكل" نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.

### البيانات التي نجمعها

#### 1. معلومات الحساب
- الاسم واسم المستخدم
- البريد الإلكتروني
- رقم الهاتف (اختياري)

#### 2. بيانات الاستخدام
- المطاعم المفضلة
- التقييمات والملاحظات الشخصية
- سجل البحث

### كيف نستخدم بياناتك

- لتوفير خدمة أفضل وتوصيات مخصصة
- لتحسين التطبيق
- للتواصل معك عند الضرورة

### حماية البيانات

- نستخدم تشفيراً قوياً لحماية بياناتك
- لا نشارك بياناتك مع أطراف ثالثة بدون موافقتك
- يمكنك حذف حسابك وبياناتك في أي وقت

### حقوقك

- الوصول إلى بياناتك
- تعديل بياناتك
- حذف بياناتك
- إلغاء الاشتراك

---
*آخر تحديث: ' || now() || '*', 
    '# Privacy Policy

## Our Commitment to Your Privacy

At "Shino Nakel", we respect your privacy and are committed to protecting your personal data.

### Data We Collect

#### 1. Account Information
- Name and username
- Email address
- Phone number (optional)

#### 2. Usage Data
- Favorite restaurants
- Ratings and personal notes
- Search history

### How We Use Your Data

- To provide better service and personalized recommendations
- To improve the app
- To communicate with you when necessary

### Data Protection

- We use strong encryption to protect your data
- We do not share your data with third parties without your consent
- You can delete your account and data at any time

### Your Rights

- Access your data
- Modify your data
- Delete your data
- Unsubscribe

---
*Last updated: ' || now() || '*')
ON CONFLICT (page_type) DO NOTHING;

-- Add trigger to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_legal_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legal_pages_updated_at
  BEFORE UPDATE ON legal_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_pages_updated_at();
