import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient((process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, ''), process.env.SUPABASE_SERVICE_ROLE_KEY || '');
async function test() {
  const { data, error } = await supabase.from('applications').select('*');
  console.log('applications', error?.message);
}
test();
