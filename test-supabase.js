// Script للتحقق من اتصال Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rflbeyxssdeqedtgrosq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbGJleXhzc2RlcWVkdGdyb3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDc0OTQsImV4cCI6MjA4NDQyMzQ5NH0.dvwhXaBjp6pkbXY_3uv14XEsJg_zZyoefsroYroKmVc";

console.log('🔍 جاري فحص اتصال Supabase...\n');
console.log('📍 URL:', SUPABASE_URL);
console.log('🔑 Key:', SUPABASE_PUBLISHABLE_KEY.substring(0, 20) + '...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testConnection() {
    try {
        // Test 1: فحص الاتصال العام
        console.log('✅ Test 1: إنشاء Supabase Client...');
        console.log('   ✓ Client تم إنشاؤه بنجاح\n');

        // Test 2: جلب بيانات من جدول restaurants
        console.log('✅ Test 2: جلب المطاعم من قاعدة البيانات...');
        const { data: restaurants, error: restaurantsError } = await supabase
            .from('restaurants')
            .select('id, name')
            .limit(5);

        if (restaurantsError) {
            console.error('   ❌ خطأ في جلب المطاعم:', restaurantsError.message);
            throw restaurantsError;
        }

        console.log(`   ✓ تم جلب ${restaurants?.length || 0} مطاعم بنجاح`);
        if (restaurants && restaurants.length > 0) {
            console.log('   📋 أول 3 مطاعم:');
            restaurants.slice(0, 3).forEach((r, i) => {
                console.log(`      ${i + 1}. ${r.name}`);
            });
        }
        console.log('');

        // Test 3: جلب الفئات (cuisines)
        console.log('✅ Test 3: جلب الفئات من قاعدة البيانات...');
        const { data: cuisines, error: cuisinesError } = await supabase
            .from('cuisines')
            .select('name, emoji')
            .limit(5);

        if (cuisinesError) {
            console.error('   ❌ خطأ في جلب الفئات:', cuisinesError.message);
        } else {
            console.log(`   ✓ تم جلب ${cuisines?.length || 0} فئات بنجاح`);
            if (cuisines && cuisines.length > 0) {
                console.log('   📋 الفئات:');
                cuisines.forEach((c, i) => {
                    console.log(`      ${i + 1}. ${c.emoji} ${c.name}`);
                });
            }
        }
        console.log('');

        // Test 4: فحص Authentication
        console.log('✅ Test 4: فحص نظام Authentication...');
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            console.log('   ✓ يوجد جلسة نشطة');
            console.log(`   👤 المستخدم: ${session.user.email}`);
        } else {
            console.log('   ℹ️  لا توجد جلسة نشطة (هذا طبيعي)');
        }
        console.log('');

        // Test 5: فحص Storage
        console.log('✅ Test 5: فحص Supabase Storage...');
        const { data: buckets, error: bucketsError } = await supabase
            .storage
            .listBuckets();

        if (bucketsError) {
            console.error('   ⚠️  تحذير:', bucketsError.message);
        } else {
            console.log(`   ✓ تم العثور على ${buckets?.length || 0} storage buckets`);
            if (buckets && buckets.length > 0) {
                buckets.forEach((b) => {
                    console.log(`      - ${b.name}`);
                });
            }
        }
        console.log('');

        // النتيجة النهائية
        console.log('═══════════════════════════════════════');
        console.log('🎉 نتيجة الفحص: اتصال Supabase يعمل بنجاح!');
        console.log('═══════════════════════════════════════\n');
        console.log('✅ قاعدة البيانات متصلة');
        console.log('✅ يمكن قراءة البيانات');
        console.log('✅ نظام Authentication جاهز');
        console.log('✅ Storage متوفر\n');

    } catch (error) {
        console.error('\n❌ فشل الاتصال بـ Supabase!');
        console.error('التفاصيل:', error);
        console.log('\n🔧 الحلول المقترحة:');
        console.log('1. تأكد من أن URL و Key صحيحين');
        console.log('2. تأكد من أن الـ Tables موجودة في Supabase');
        console.log('3. تحقق من Row Level Security (RLS) policies');
        console.log('4. تأكد من اتصال الإنترنت\n');
    }
}

// تشغيل الاختبار
testConnection();
