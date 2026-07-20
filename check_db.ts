import { createClient } from '@supabase/supabase-js';
const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log("Users:", error ? error.message : "Success");
  
  const { data: aData, error: aError } = await supabase.from('applicants').select('*').limit(1);
  console.log("Applicants:", aError ? aError.message : "Success");
  
  const { data: sData, error: sError } = await supabase.from('staff').select('*').limit(1);
  console.log("Staff:", sError ? sError.message : "Success");
}
checkDb();
