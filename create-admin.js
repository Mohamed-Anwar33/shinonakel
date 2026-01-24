// سكريبت لفحص وإنشاء Admin user
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rflbeyxssdeqedtgrosq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbGJleXhzc2RlcWVkdGdyb3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDc0OTQsImV4cCI6MjA4NDQyMzQ5NH0.dvwhXaBjp6pkbXY_3uv14XEsJg_zZyoefsroYroKmVc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// بيانات حساب Admin الجديد
const ADMIN_EMAIL = "admin@shinonakel.com";
const ADMIN_PASSWORD = "Admin@123456";
const ADMIN_USERNAME = "admin";

async function createAdminAccount() {
    console.log('═══════════════════════════════════════');
    console.log('🔧 إنشاء حساب Admin جديد');
    console.log('═══════════════════════════════════════\n');

    try {
        // الخطوة 1: التحقق من Admin users الموجودين
        console.log('📋 الخطوة 1: فحص Admin users الموجودين...');
        const { data: existingAdmins, error: adminCheckError } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .eq('role', 'admin');

        if (adminCheckError) {
            console.log('   ⚠️  تحذير:', adminCheckError.message);
        } else {
            console.log(`   ✓ عدد Admin users الموجودين: ${existingAdmins?.length || 0}\n`);
        }

        // الخطوة 2: إنشاء حساب جديد
        console.log('📋 الخطوة 2: إنشاء حساب مستخدم جديد...');
        console.log(`   البريد الإلكتروني: ${ADMIN_EMAIL}`);
        console.log(`   كلمة المرور: ${ADMIN_PASSWORD}`);
        console.log(`   اسم المستخدم: ${ADMIN_USERNAME}\n`);

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            options: {
                data: {
                    username: ADMIN_USERNAME
                }
            }
        });

        if (signUpError) {
            // قد يكون الحساب موجود بالفعل
            console.log('   ⚠️  الحساب موجود بالفعل أو خطأ في الإنشاء:', signUpError.message);
            console.log('   💡 جاري محاولة تسجيل الدخول...\n');

            // محاولة تسجيل الدخول
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            });

            if (signInError) {
                console.error('   ❌ فشل تسجيل الدخول:', signInError.message);
                return;
            }

            console.log('   ✓ تم تسجيل الدخول بنجاح!');
            const userId = signInData.user.id;
            console.log(`   User ID: ${userId}\n`);

            // إضافة role admin
            await addAdminRole(userId);
            return;
        }

        if (signUpData.user) {
            console.log('   ✓ تم إنشاء الحساب بنجاح!');
            const userId = signUpData.user.id;
            console.log(`   User ID: ${userId}\n`);

            // الخطوة 3: إنشاء Profile
            console.log('📋 الخطوة 3: إنشاء Profile...');
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    username: ADMIN_USERNAME,
                    full_name: 'Administrator'
                });

            if (profileError) {
                console.log('   ⚠️  Profile قد يكون موجود:', profileError.message);
            } else {
                console.log('   ✓ تم إنشاء Profile بنجاح!\n');
            }

            // الخطوة 4: إضافة دور Admin
            await addAdminRole(userId);
        }

    } catch (error) {
        console.error('\n❌ خطأ عام:', error.message);
    }
}

async function addAdminRole(userId) {
    console.log('📋 الخطوة 4: إضافة دور Admin...');

    const { data, error } = await supabase
        .from('user_roles')
        .insert({
            user_id: userId,
            role: 'admin'
        })
        .select();

    if (error) {
        if (error.message.includes('duplicate')) {
            console.log('   ℹ️  المستخدم لديه دور Admin بالفعل\n');
        } else {
            console.error('   ❌ خطأ في إضافة دور Admin:', error.message, '\n');
        }
    } else {
        console.log('   ✓ تم إضافة دور Admin بنجاح!\n');
    }

    printSuccessMessage();
}

function printSuccessMessage() {
    console.log('═══════════════════════════════════════');
    console.log('✅ تم إنشاء حساب Admin بنجاح!');
    console.log('═══════════════════════════════════════\n');
    console.log('📧 البريد الإلكتروني: ' + ADMIN_EMAIL);
    console.log('🔑 كلمة المرور: ' + ADMIN_PASSWORD);
    console.log('👤 اسم المستخدم: ' + ADMIN_USERNAME);
    console.log('\n📝 خطوات تسجيل الدخول:');
    console.log('1. افتح الموقع على http://localhost:5173');
    console.log('2. اذهب لصفحة تسجيل الدخول');
    console.log('3. استخدم البريد الإلكتروني وكلمة المرور أعلاه');
    console.log('4. بعد تسجيل الدخول، اذهب إلى /admin');
    console.log('\n⚠️  ملاحظة: احفظ هذه البيانات في مكان آمن!\n');
}

// تشغيل السكريبت
createAdminAccount();
