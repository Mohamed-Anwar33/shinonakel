-- =====================================================
-- سكريبت إنشاء حساب Admin كامل
-- نفذ هذا السكريبت في Supabase SQL Editor
-- =====================================================

-- الخطوة 1: تعطيل RLS مؤقتاً على user_roles
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- الخطوة 2: البحث عن حساب admin@shinonakel.com
-- إذا كان موجود، سنستخدمه. إذا لم يكن موجود، سنحتاج إنشاؤه من الواجهة أولاً

-- الخطوة 3: الحصول على User ID للحساب admin@shinonakel.com
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- البحث عن User ID من جدول auth.users
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'admin@shinonakel.com'
    LIMIT 1;

    -- إذا وجدنا المستخدم
    IF admin_user_id IS NOT NULL THEN
        RAISE NOTICE 'تم العثور على المستخدم، User ID: %', admin_user_id;
        
        -- التحقق من وجود Profile
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_user_id) THEN
            -- إنشاء Profile إذا لم يكن موجود
            INSERT INTO profiles (id, username, full_name)
            VALUES (admin_user_id, 'admin', 'Administrator')
            ON CONFLICT (id) DO NOTHING;
            RAISE NOTICE 'تم إنشاء Profile';
        ELSE
            RAISE NOTICE 'Profile موجود بالفعل';
        END IF;

        -- إضافة دور Admin
        INSERT INTO user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'تم إضافة دور Admin بنجاح!';
        
    ELSE
        RAISE NOTICE 'لم يتم العثور على المستخدم admin@shinonakel.com';
        RAISE NOTICE 'يرجى إنشاء الحساب أولاً من صفحة التسجيل';
    END IF;
END $$;

-- الخطوة 4: إعادة تفعيل RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- الخطوة 5: التحقق من النتيجة
SELECT 
    u.email,
    p.username,
    ur.role,
    ur.created_at as admin_since
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'admin@shinonakel.com';

-- =====================================================
-- انتهى السكريبت
-- =====================================================
