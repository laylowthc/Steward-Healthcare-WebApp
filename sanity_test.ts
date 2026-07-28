import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let url = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const applicantId = 'test_applicant_id_1';
  
  // 1. insert user
  await supabase.from('users').upsert({
    id: applicantId, full_name: 'Test', email: 'test@test.com', status: 'Pending', role: 'Applicant'
  });

  // 2. check docs
  const { data: docs } = await supabase.from('documents').select('*').eq('user_id', applicantId);
  console.log('Docs before:', docs);

  // 3. insert doc
  await supabase.from('documents').insert({
    user_id: applicantId, document_name: 'Application Form Data', category: 'Application Form', notes: JSON.stringify({ hello: 'world' })
  });

  // 4. check docs
  const { data: docsAfter } = await supabase.from('documents').select('*').eq('user_id', applicantId);
  console.log('Docs after:', docsAfter);

  // 5. cleanup
  await supabase.from('users').delete().eq('id', applicantId);
  await supabase.from('documents').delete().eq('user_id', applicantId);
}
run();
