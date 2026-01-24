// سكريبت لفحص Admin users الموجودين وإنشاء واحد جديد
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rflbeyxssdeqedtgrosq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbGJleXhzc2RlcWVkdGdyb3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDc0OTQsImV4cCI6MjA4NDQyMzQ5NH0.dvwhXaBjp6pkbXY_3uv14XEsJg_zZyoefsroYroKmVc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkAdminUsers() {
    console.log('🔍 فحص مستخدمي Admin الموجودين...\n');

    try {
        // جلب جميع Admin users من جدول user_roles
        const { data: adminRoles, error } = await supabase
            .from('user_roles')
            .select(`
        id,
        user_id,
        role,
        created_at,
        profile:profiles(username, full_name)
      `)
            .eq('role', 'admin');

        if (error) {
            console.error('❌ خطأ في جلب Admin users:', error.message);
            return;
        }

        console.log('═══════════════════════════════════════');
        console.log(`📊 عدد Admin Users الموجودين: ${adminRoles?.length || 0}`);
        console.log('═══════════════════════════════════════\n');

        if (adminRoles && adminRoles.length > 0) {
            console.log('👥 قائمة Admin Users:\n');
            adminRoles.forEach((admin, index) => {
                console.log(`${index + 1}. User ID: ${admin.user_id}`);
                console.log(`   Username: ${admin.profile?.username || 'غير متوفر'}`);
                console.log(`   Full Name: ${admin.profile?.full_name || 'غير متوفر'}`);
                console.log(`   تاريخ الإنشاء: ${new Date(admin.created_at).toLocaleDateString('ar-EG')}`);
                console.log('');
            });
        } else {
            console.log('⚠️  لا يوجد أي Admin users في النظام!\n');
            console.log('💡 ستحتاج إلى إنشاء حساب Admin يدوياً.\n');
        }

        // فحص إذا كان هناك users عاديين
        const { data: allProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, created_at')
            .limit(10);

        if (!profilesError && allProfiles) {
            console.log('═══════════════════════════════════════');
            console.log(`📋 المستخدمين العاديين (أول 10):`);
            console.log('═══════════════════════════════════════\n');

            if (allProfiles.length > 0) {
                allProfiles.forEach((profile, index) => {
                    console.log(`${index + 1}. ${profile.username || 'No username'} (ID: ${profile.id.substring(0, 8)}...)`);
                });
                console.log('');
            } else {
                console.log('⚠️  لا يوجد مستخدمين مسجلين!\n');
            }
        }

    } catch (error) {
        console.error('❌ خطأ:', error);
    }
}

checkAdminUsers();
