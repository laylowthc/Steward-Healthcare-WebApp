import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
let url = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || '');
async function test() {
  const { data } = await supabase.from('documents').select('id').limit(1);
  console.log(data);
}
test();
