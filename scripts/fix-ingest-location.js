import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = "https://rflbeyxssdeqedtgrosq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbGJleXhzc2RlcWVkdGdyb3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDc0OTQsImV4cCI6MjA4NDQyMzQ5NH0.dvwhXaBjp6pkbXY_3uv14XEsJg_zZyoefsroYroKmVc";
const GOOGLE_MAPS_API_KEY = "AIzaSyAiraMZ9B382QkBr1Mn0GNORk8_J1Sd1lc";
const RESTAURANT_NAME = "Ingest";

// Known branches to ensure exist
const KNOWN_BRANCHES = [
    { name: 'Kuwait City', query: 'Ingest Restaurant Jaber Al-Mubarak St Kuwait' },
    { name: 'Ardiya', query: 'Ingest Restaurant Ardiya Kuwait' }
];

// Common implementation for geocoding a single query
async function geocodeAddress(query) {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
    try {
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
            return {
                lat: data.results[0].geometry.location.lat,
                lng: data.results[0].geometry.location.lng,
                address: data.results[0].formatted_address,
                place_id: data.results[0].place_id
            };
        }
    } catch (e) {
        console.error('Error fetching geocode:', e);
    }
    return null;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('🌍 Starting Ingest Location Fix (Multi-Branch)...');

    // 0. Sign in as Admin to bypass RLS
    console.log('🔑 Signing in as Admin...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@shinonakel.com',
        password: 'Admin@123456'
    });

    if (authError) {
        console.error('❌ Admin login failed:', authError.message);
        return;
    }
    console.log('✅ Admin login successful!');

    // 1. Find the restaurant
    console.log(`🔍 Searching for restaurant: ${RESTAURANT_NAME}...`);
    const { data: restaurants, error: findError } = await supabase
        .from('restaurants')
        .select('*')
        .ilike('name_en', `%${RESTAURANT_NAME}%`);

    if (findError) {
        console.error('❌ Error searching for restaurant:', findError);
        return;
    }

    if (!restaurants || restaurants.length === 0) {
        console.error('❌ Restaurant not found in database.');
        return;
    }

    const restaurant = restaurants[0];
    console.log(`✅ Found restaurant: ${restaurant.name} (${restaurant.name_en}) [ID: ${restaurant.id}]`);

    // 2. Ensure Known Branches Exist
    console.log('📋 Verifying known branches exist...');

    for (const knownBranch of KNOWN_BRANCHES) {
        const { data: existingBranches } = await supabase
            .from('restaurant_branches')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .ilike('branch_name', `%${knownBranch.name}%`);

        if (!existingBranches || existingBranches.length === 0) {
            console.log(`   ⚠️  Branch "${knownBranch.name}" missing. Creating it...`);
            // Create placeholders, will be updated by geocoding loop
            await supabase.from('restaurant_branches').insert({
                restaurant_id: restaurant.id,
                branch_name: knownBranch.name,
                address: 'Pending...'
            });
        }
    }

    // 3. Fetch All Branches (now including newly created ones)
    console.log(`📋 Fetching all branches...`);
    const { data: branches, error: branchError } = await supabase
        .from('restaurant_branches')
        .select('*')
        .eq('restaurant_id', restaurant.id);

    if (branchError) {
        console.error('❌ Error fetching branches:', branchError);
        return;
    }

    console.log(`✅ Found ${branches.length} branches. Processing each...`);

    // 4. Iterate and Update Each Branch
    for (const branch of branches) {
        // Determine the best query for this branch
        let query = `${restaurant.name_en || restaurant.name} Kuwait`;

        // Match against known branches for more specific queries
        const knownMatch = KNOWN_BRANCHES.find(kb =>
            branch.branch_name && branch.branch_name.toLowerCase().includes(kb.name.toLowerCase())
        );

        if (knownMatch) {
            query = knownMatch.query;
        } else if (branch.address && branch.address.length > 5 && !branch.address.includes('Pending')) {
            query = `${branch.address} Kuwait`;
        } else if (branch.branch_name && branch.branch_name.toLowerCase() !== 'main') {
            query = `${restaurant.name_en || restaurant.name} ${branch.branch_name} Kuwait`;
        }

        console.log(`\n📍 Processing Branch: "${branch.branch_name || 'Unnamed'}"`);
        console.log(`   Query: "${query}"`);

        const result = await geocodeAddress(query);

        if (!result) {
            console.error(`   ❌ Geocoding failed or no results.`);
            continue;
        }

        console.log(`   ✅ Found: ${result.address}`);
        console.log(`   New Coords: ${result.lat}, ${result.lng}`);

        // Update Branch
        const { error: updateError } = await supabase
            .from('restaurant_branches')
            .update({
                latitude: result.lat,
                longitude: result.lng,
                address: result.address,
                google_maps_url: `https://www.google.com/maps/search/?api=1&query=${result.lat},${result.lng}&query_place_id=${result.place_id}`
            })
            .eq('id', branch.id);

        if (updateError) {
            console.error(`   ❌ Update failed:`, updateError.message);
        } else {
            console.log(`   💾 Database updated successfully.`);
        }
    }

    console.log('\n🎉 All branches processed!');
}

main();
