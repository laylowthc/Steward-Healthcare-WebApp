import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let url = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const applicantId = '11111111-2222-3333-4444-555555555555';
  
  const { error: e1 } = await supabase.from('users').upsert({
    id: applicantId, full_name: 'Test', email: 'test@test.com', status: 'Pending', role: 'Applicant'
  });
  if (e1) console.log(e1);

  const { data: docs } = await supabase.from('documents').select('*').eq('user_id', applicantId);
  console.log('Docs before:', docs?.length);

  const { error: e2 } = await supabase.from('documents').insert({
    user_id: applicantId, document_name: 'Application Form Data', category: 'Application Form', notes: JSON.stringify({ hello: 'world' })
  });
  if (e2) console.log(e2);

  const { data: docsAfter } = await supabase.from('documents').select('*').eq('user_id', applicantId);
  console.log('Docs after:', docsAfter?.length);

  await supabase.from('users').delete().eq('id', applicantId);
  await supabase.from('documents').delete().eq('user_id', applicantId);
}
run();
