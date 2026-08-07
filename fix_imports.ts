import fs from 'fs';
let content = fs.readFileSync('src/components/EmploymentApplicationForm.tsx', 'utf8');
content = content.replace(/..\/supabaseClient/g, '../lib/supabase');
fs.writeFileSync('src/components/EmploymentApplicationForm.tsx', content);
