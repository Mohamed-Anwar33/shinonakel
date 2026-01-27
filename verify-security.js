import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rflbeyxssdeqedtgrosq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbGJleXhzc2RlcWVkdGdyb3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDc0OTQsImV4cCI6MjA4NDQyMzQ5NH0.dvwhXaBjp6pkbXY_3uv14XEsJg_zZyoefsroYroKmVc";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function verifySecurity() {
    console.log('🔒 Verifying Security for Profiles Table...');

    // Attempt to fetch profiles as anonymous user
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);

    if (error) {
        console.log('✅ Access Denied or Error (Good):', error.message);
    } else {
        if (profiles && profiles.length > 0) {
            console.error('❌ SECURITY RISK: Profiles data is accessible to public/anon users!');
            console.log('   Exposed Count:', profiles.length);
            console.log('   Sample:', profiles[0]);
        } else {
            console.log('✅ SECURE: No profiles returned to anonymous user.');
        }
    }
}

verifySecurity();
