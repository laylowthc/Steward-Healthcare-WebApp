import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const tables = ['profiles', 'user_profiles'];
  for (const t of tables) {
      const { error } = await supabase.from(t).select('id').limit(1);
      if (!error) {
          console.log(`Found table: ${t}`);
      }
  }
  console.log("Done");
}

inspect();
