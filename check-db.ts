
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env from root (process.cwd() is sufficient when running from root)
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runCheck() {
    console.log("🔍 Starting Database Diagnostic (Type Check)...");

    // Directly query branches table (restaurant_branches)
    // We want to see the RAW data types coming from Supabase
    const { data: branches, error } = await supabase
        .from("restaurant_branches")
        .select(`
      id,
      branch_name,
      google_maps_url,
      latitude,
      longitude
    `)
        .not("google_maps_url", "is", null)
        .order("id", { ascending: false })
        .limit(20);

    if (error) {
        console.error("❌ Error fetching branches:", error.message);
        return;
    }

    console.log(`📊 Checked top ${branches.length} branches with Google Maps URLs.\n`);
    console.log("----------------------------------------------------------------");
    console.log("ID | Lat Value (Type) | Lng Value (Type) | URL");
    console.log("----------------------------------------------------------------");

    branches.forEach((b: any) => {
        const latType = b.latitude === null ? "NULL" : typeof b.latitude;
        const lngType = b.longitude === null ? "NULL" : typeof b.longitude;

        // Print raw values and types
        console.log(
            `${b.id.substring(0, 8)}... | ` +
            `${b.latitude} (${latType}) | ` +
            `${b.longitude} (${lngType}) | ` +
            `${(b.google_maps_url || "").substring(0, 30)}...`
        );
    });
    console.log("----------------------------------------------------------------");
    console.log("\nIf types are 'string', the 'Type Mismatch' hypothesis is confirmed.");
    console.log("If values are 'null', the data is missing.");
}

runCheck();
