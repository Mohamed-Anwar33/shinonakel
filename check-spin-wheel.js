// سكريبت فحص المطاعم وعلاقتها بعجلة اللف
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rflbeyxssdeqedtgrosq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbGJleXhzc2RlcWVkdGdyb3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDc0OTQsImV4cCI6MjA4NDQyMzQ5NH0.dvwhXaBjp6pkbXY_3uv14XEsJg_zZyoefsroYroKmVc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkSpinWheelData() {
    console.log('═══════════════════════════════════════');
    console.log('🔍 فحص بيانات عجلة اللف');
    console.log('═══════════════════════════════════════\n');

    try {
        // 1. فحص المطاعم الموجودة
        console.log('📊 1. فحص المطاعم...');
        const { data: allRestaurants, error: restaurantsError } = await supabase
            .from('restaurants')
            .select('id, name, cuisine, cuisines, created_at');

        if (restaurantsError) {
            console.error('   ❌ خطأ:', restaurantsError.message);
            return;
        }

        console.log(`   ✓ إجمالي المطاعم: ${allRestaurants?.length || 0}\n`);

        if (allRestaurants && allRestaurants.length > 0) {
            console.log('   📋 قائمة المطاعم:\n');

            // تصنيف المطاعم حسب الفئة
            const restaurantsByCuisine = {};

            allRestaurants.forEach((restaurant) => {
                const mainCuisine = restaurant.cuisine;
                const allCuisines = restaurant.cuisines || [mainCuisine];

                console.log(`   ${restaurant.name}:`);
                console.log(`      - الفئة الرئيسية: ${mainCuisine}`);
                console.log(`      - جميع الفئات: ${allCuisines.join(', ')}`);
                console.log('');

                // تصنيف حسب كل فئة
                allCuisines.forEach((cuisine) => {
                    if (!restaurantsByCuisine[cuisine]) {
                        restaurantsByCuisine[cuisine] = [];
                    }
                    restaurantsByCuisine[cuisine].push(restaurant.name);
                });
            });

            console.log('\n   📊 التصنيف حسب الفئة:\n');
            Object.entries(restaurantsByCuisine).forEach(([cuisine, restaurants]) => {
                console.log(`   ${cuisine}: ${restaurants.length} مطعم`);
                restaurants.forEach((name) => {
                    console.log(`      - ${name}`);
                });
                console.log('');
            });
        }

        // 2. فحص الفئات المتاحة
        console.log('\n📊 2. فحص الفئات (Cuisines)...');
        const { data: cuisines, error: cuisinesError } = await supabase
            .from('cuisines')
            .select('id, name, emoji, is_active, sort_order')
            .order('sort_order', { ascending: true });

        if (cuisinesError) {
            console.error('   ❌ خطأ:', cuisinesError.message);
        } else {
            const activeCuisines = cuisines?.filter(c => c.is_active) || [];
            const inactiveCuisines = cuisines?.filter(c => !c.is_active) || [];

            console.log(`   ✓ إجمالي الفئات: ${cuisines?.length || 0}`);
            console.log(`   ✓ الفئات النشطة: ${activeCuisines.length}`);
            console.log(`   ✓ الفئات غير النشطة: ${inactiveCuisines.length}\n`);

            if (activeCuisines.length > 0) {
                console.log('   📋 الفئات النشطة:\n');
                activeCuisines.forEach((c) => {
                    console.log(`   ${c.emoji} ${c.name} (order: ${c.sort_order})`);
                });
                console.log('');
            }
        }

        // 3. محاكاة عجلة اللف - اختيار "الكل"
        console.log('\n📊 3. محاكاة عجلة اللف (فئة: الكل)...');

        // هذا هو المنطق المستخدم في SpinWheel.tsx
        const activeCuisinesForWheel = cuisines?.filter(c => c.is_active && c.name !== 'الكل') || [];

        console.log(`   ✓ الفئات في العجلة: ${activeCuisinesForWheel.length}`);
        activeCuisinesForWheel.forEach((c) => {
            console.log(`      - ${c.emoji} ${c.name}`);
        });

        // اختيار عشوائي (محاكاة الدوران)
        if (activeCuisinesForWheel.length > 0) {
            const randomIndex = Math.floor(Math.random() * activeCuisinesForWheel.length);
            const selectedCuisine = activeCuisinesForWheel[randomIndex];

            console.log(`\n   🎯 نتيجة الدوران: ${selectedCuisine.emoji} ${selectedCuisine.name}`);

            // 4. البحث عن مطاعم في هذه الفئة
            console.log(`\n📊 4. البحث عن مطاعم في فئة "${selectedCuisine.name}"...`);

            const { data: matchingRestaurants, error: matchError } = await supabase
                .from('restaurants')
                .select('id, name, cuisine, cuisines')
                .or(`cuisine.eq.${selectedCuisine.name},cuisines.cs.{${selectedCuisine.name}}`);

            if (matchError) {
                console.error('   ❌ خطأ في البحث:', matchError.message);
            } else {
                console.log(`   ✓ عدد المطاعم الموجودة: ${matchingRestaurants?.length || 0}\n`);

                if (matchingRestaurants && matchingRestaurants.length > 0) {
                    console.log('   📋 المطاعم المطابقة:\n');
                    matchingRestaurants.forEach((r) => {
                        console.log(`   - ${r.name}`);
                        console.log(`     الفئة الرئيسية: ${r.cuisine}`);
                        console.log(`     جميع الفئات: ${r.cuisines?.join(', ') || r.cuisine}`);
                        console.log('');
                    });
                } else {
                    console.log('   ⚠️  لا توجد مطاعم في هذه الفئة!');
                    console.log('   💡 هذا قد يكون سبب عدم ظهور المطاعم!\n');
                }
            }
        }

        // 5. التحقق من الفروع
        console.log('\n📊 5. فحص الفروع (Branches)...');
        const { data: branches, error: branchesError } = await supabase
            .from('restaurant_branches')
            .select('restaurant_id, latitude, longitude, google_maps_url');

        if (branchesError) {
            console.error('   ❌ خطأ:', branchesError.message);
        } else {
            console.log(`   ✓ إجمالي الفروع: ${branches?.length || 0}`);

            const branchesWithCoords = branches?.filter(b => b.latitude && b.longitude) || [];
            const branchesWithMaps = branches?.filter(b => b.google_maps_url) || [];

            console.log(`   ✓ فروع بها إحداثيات: ${branchesWithCoords.length}`);
            console.log(`   ✓ فروع بها روابط Maps: ${branchesWithMaps.length}\n`);
        }

        // النتيجة النهائية
        console.log('\n═══════════════════════════════════════');
        console.log('✅ نتيجة الفحص');
        console.log('═══════════════════════════════════════\n');

        const totalRestaurants = allRestaurants?.length || 0;
        const totalCuisines = cuisines?.filter(c => c.is_active && c.name !== 'الكل').length || 0;

        console.log(`📊 الإحصائيات:`);
        console.log(`   - إجمالي المطاعم: ${totalRestaurants}`);
        console.log(`   - الفئات النشطة: ${totalCuisines}`);
        console.log(`   - الفروع: ${branches?.length || 0}\n`);

        // تحذيرات
        const warnings = [];

        if (totalRestaurants === 0) {
            warnings.push('⚠️  لا توجد مطاعم في قاعدة البيانات!');
        }

        if (totalCuisines === 0) {
            warnings.push('⚠️  لا توجد فئات نشطة!');
        }

        // فحص إذا كانت جميع المطاعم في فئة واحدة فقط
        const cuisineNames = Object.keys(restaurantsByCuisine);
        if (cuisineNames.length === 1) {
            warnings.push(`⚠️  جميع المطاعم في فئة واحدة: "${cuisineNames[0]}"`);
        }

        if (warnings.length > 0) {
            console.log('⚠️  تحذيرات:\n');
            warnings.forEach(w => console.log(`   ${w}`));
            console.log('');
        } else {
            console.log('✅ كل شيء يبدو على ما يرام!\n');
        }

    } catch (error) {
        console.error('\n❌ خطأ عام:', error);
    }
}

// تشغيل الفحص
checkSpinWheelData();
