import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
let url = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || '');
async function test() {
  const { error } = await supabase.from('documents').insert({ id: 'invalid_uuid_test' });
  console.log(error?.message);
}
test();
