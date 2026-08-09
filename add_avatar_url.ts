import { createClient } from '@supabase/supabase-js';
const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAvatar() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_statement: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;' });
  console.log("Add column:", error ? error.message : "Success");
}
addAvatar();
