import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const tables = ['users', 'staff_profiles', 'documents'];
  for (const t of tables) {
      const { data, error } = await supabase.from(t).select('id').limit(1);
      if (!error) {
          console.log(`Found table: ${t}`);
      } else {
          console.log(`Error table ${t}:`, error.message);
      }
  }
}
test();
