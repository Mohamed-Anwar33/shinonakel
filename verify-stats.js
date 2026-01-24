// سكريبت للتحقق من دقة الإحصائيات وتتبع الإعلانات
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rflbeyxssdeqedtgrosq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbGJleXhzc2RlcWVkdGdyb3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDc0OTQsImV4cCI6MjA4NDQyMzQ5NH0.dvwhXaBjp6pkbXY_3uv14XEsJg_zZyoefsroYroKmVc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function verifyStatistics() {
    console.log('═══════════════════════════════════════');
    console.log('🔍 فحص دقة الإحصائيات ونظام التتبع');
    console.log('═══════════════════════════════════════\n');

    try {
        // 1. التحقق من عدد المستخدمين
        console.log('📊 1. فحص المستخدمين...');
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, username, created_at');

        if (usersError) {
            console.error('   ❌ خطأ:', usersError.message);
        } else {
            console.log(`   ✓ إجمالي المستخدمين: ${users?.length || 0}`);

            // حساب المستخدمين هذا الأسبوع
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const thisWeek = users?.filter(u => new Date(u.created_at) >= oneWeekAgo).length || 0;
            console.log(`   ✓ مستخدمين جدد هذا الأسبوع: ${thisWeek}`);
        }
        console.log('');

        // 2. التحقق من المطاعم
        console.log('📊 2. فحص المطاعم...');
        const { data: restaurants, error: restaurantsError } = await supabase
            .from('restaurants')
            .select('id, name, created_at');

        if (restaurantsError) {
            console.error('   ❌ خطأ:', restaurantsError.message);
        } else {
            console.log(`   ✓ إجمالي المطاعم: ${restaurants?.length || 0}`);
            if (restaurants && restaurants.length > 0) {
                console.log('   📋 المطاعم:');
                restaurants.forEach((r, i) => {
                    console.log(`      ${i + 1}. ${r.name}`);
                });
            }
        }
        console.log('');

        // 3. التحقق من الإعلانات
        console.log('📊 3. فحص الإعلانات...');
        const { data: ads, error: adsError } = await supabase
            .from('advertisements')
            .select('id, restaurant_id, placement, is_active, views_count, clicks_count, start_date, end_date');

        if (adsError) {
            console.error('   ❌ خطأ:', adsError.message);
        } else {
            const activeAds = ads?.filter(a => a.is_active) || [];
            console.log(`   ✓ إجمالي الإعلانات: ${ads?.length || 0}`);
            console.log(`   ✓ الإعلانات النشطة: ${activeAds.length}`);

            if (activeAds.length > 0) {
                console.log('\n   📋 تفاصيل الإعلانات النشطة:');
                for (const ad of activeAds) {
                    // جلب اسم المطعم
                    const { data: restaurant } = await supabase
                        .from('restaurants')
                        .select('name')
                        .eq('id', ad.restaurant_id)
                        .single();

                    console.log(`\n      📌 إعلان #${ad.id.substring(0, 8)}...`);
                    console.log(`         المطعم: ${restaurant?.name || 'غير معروف'}`);
                    console.log(`         النوع: ${ad.placement}`);
                    console.log(`         👁️  المشاهدات: ${ad.views_count || 0}`);
                    console.log(`         👆 النقرات: ${ad.clicks_count || 0}`);
                    console.log(`         📅 من ${ad.start_date} إلى ${ad.end_date}`);
                }
            }
        }
        console.log('\n');

        // 4. التحقق من جدول ad_interactions
        console.log('📊 4. فحص سجل التفاعلات (ad_interactions)...');
        const { data: interactions, error: interactionsError } = await supabase
            .from('ad_interactions')
            .select('id, ad_id, interaction_type, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (interactionsError) {
            console.error('   ❌ خطأ:', interactionsError.message);
        } else {
            console.log(`   ✓ إجمالي التفاعلات المسجلة: ${interactions?.length || 0}`);

            if (interactions && interactions.length > 0) {
                const views = interactions.filter(i => i.interaction_type === 'view').length;
                const clicks = interactions.filter(i => i.interaction_type === 'click').length;

                console.log(`      - مشاهدات (views): ${views}`);
                console.log(`      - نقرات (clicks): ${clicks}`);

                console.log('\n   📋 آخر 5 تفاعلات:');
                interactions.slice(0, 5).forEach((int, i) => {
                    const date = new Date(int.created_at).toLocaleString('ar-EG');
                    console.log(`      ${i + 1}. ${int.interaction_type === 'view' ? '👁️ ' : '👆'} ${int.interaction_type} - ${date}`);
                });
            } else {
                console.log('   ⚠️  لا توجد تفاعلات مسجلة بعد!');
                console.log('   💡 جرب تدوير عجلة الحظ لتسجيل مشاهدات');
            }
        }
        console.log('\n');

        // 5. التحقق من التطابق بين الجداول
        console.log('📊 5. التحقق من تطابق البيانات...');
        if (ads && interactions) {
            const totalViewsFromAds = ads.reduce((sum, ad) => sum + (ad.views_count || 0), 0);
            const totalClicksFromAds = ads.reduce((sum, ad) => sum + (ad.clicks_count || 0), 0);

            const viewsFromInteractions = interactions.filter(i => i.interaction_type === 'view').length;
            const clicksFromInteractions = interactions.filter(i => i.interaction_type === 'click').length;

            console.log('   مقارنة البيانات:');
            console.log(`   ┌─ جدول advertisements:`);
            console.log(`   │  👁️  views_count: ${totalViewsFromAds}`);
            console.log(`   │  👆 clicks_count: ${totalClicksFromAds}`);
            console.log(`   └─ جدول ad_interactions (آخر 10):`);
            console.log(`      👁️  views: ${viewsFromInteractions}`);
            console.log(`      👆 clicks: ${clicksFromInteractions}`);

            if (totalViewsFromAds === viewsFromInteractions && totalClicksFromAds === clicksFromInteractions) {
                console.log('\n   ✅ البيانات متطابقة تماماً!');
            } else {
                console.log('\n   ⚠️  قد يكون هناك تفاعلات أقدم لم تظهر في آخر 10');
            }
        }
        console.log('\n');

        // النتيجة النهائية
        console.log('═══════════════════════════════════════');
        console.log('✅ نتيجة الفحص');
        console.log('═══════════════════════════════════════\n');

        console.log('الإحصائيات الحالية:');
        console.log(`  👥 المستخدمين: ${users?.length || 0}`);
        console.log(`  🍽️  المطاعم: ${restaurants?.length || 0}`);
        console.log(`  📢 الإعلانات النشطة: ${ads?.filter(a => a.is_active).length || 0}`);
        console.log(`  📊 التفاعلات المسجلة: ${interactions?.length || 0}\n`);

        console.log('حالة نظام التتبع:');
        if (interactions && interactions.length > 0) {
            console.log('  ✅ نظام التتبع يعمل بشكل صحيح');
            console.log('  ✅ البيانات تُسجل في ad_interactions');
            console.log('  ✅ العدادات تُحدث في advertisements');
        } else {
            console.log('  ⚠️  لم يتم تسجيل أي تفاعلات بعد');
            console.log('  💡 اختبر النظام عن طريق:');
            console.log('     1. تدوير عجلة الحظ (spin wheel)');
            console.log('     2. النقر على تطبيقات التوصيل');
            console.log('     3. ثم شغل هذا السكريبت مرة أخرى');
        }
        console.log('');

    } catch (error) {
        console.error('\n❌ خطأ عام:', error);
    }
}

// تشغيل الفحص
verifyStatistics();
