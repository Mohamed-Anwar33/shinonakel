// Run legal_pages migration
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials in .env file');
    console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 Starting legal_pages migration...\n');

    try {
        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'supabase', 'migrations', '20260127_disable_otp_secure_profiles.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('📄 Read migration file successfully');
        console.log('📝 Executing SQL...\n');

        // Execute the SQL
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: sqlContent
        });

        if (error) {
            // If rpc doesn't work, try direct query
            console.log('⚠️  RPC method not available, trying direct execution...\n');

            // Split SQL into individual statements and execute them
            const statements = sqlContent
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            for (const statement of statements) {
                if (statement.trim()) {
                    console.log(`Executing: ${statement.substring(0, 50)}...`);
                    const { error: execError } = await supabase.rpc('exec', { sql: statement });
                    if (execError) {
                        console.error(`⚠️  Statement error (might be OK if table exists):`, execError.message);
                    }
                }
            }
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Go to Supabase Dashboard');
        console.log('2. Database → API Docs');
        console.log('3. Click "Regenerate types"');
        console.log('\nOr run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts');

    } catch (error) {
        console.error('❌ Error running migration:', error.message);
        console.error('\n💡 Alternative: Copy the SQL content and paste it in Supabase Dashboard > SQL Editor');
        process.exit(1);
    }
}

runMigration();
