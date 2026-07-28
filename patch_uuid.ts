import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /await supabase\.from\('documents'\)\.upsert\(\{\s*id: \`app_form_\$\{applicant\.id\}\`,[\s\S]*?\}\);/g,
  `const { data: existingAppDoc } = await supabase.from('documents').select('id').eq('user_id', applicant.id).eq('category', 'Application Form').maybeSingle();
        if (existingAppDoc) {
          await supabase.from('documents').update({ notes: JSON.stringify(applicant.cvData) }).eq('id', existingAppDoc.id);
        } else {
          await supabase.from('documents').insert({
            user_id: applicant.id,
            document_name: 'Application Form Data',
            category: 'Application Form',
            file_path: '#',
            notes: JSON.stringify(applicant.cvData)
          });
        }`
);

content = content.replace(
  /await supabase\.from\('documents'\)\.upsert\(\{\s*id: \`comp_data_\$\{applicant\.id\}\`,[\s\S]*?\}\);/g,
  `const { data: existingCompDoc } = await supabase.from('documents').select('id').eq('user_id', applicant.id).eq('category', 'Compliance Data').maybeSingle();
        if (existingCompDoc) {
          await supabase.from('documents').update({ notes: JSON.stringify(applicant.complianceChecked) }).eq('id', existingCompDoc.id);
        } else {
          await supabase.from('documents').insert({
            user_id: applicant.id,
            document_name: 'Compliance Checklist',
            category: 'Compliance Data',
            file_path: '#',
            notes: JSON.stringify(applicant.complianceChecked)
          });
        }`
);

content = content.replace(
  /await supabase\.from\('documents'\)\.upsert\(\{\s*id: \`staff_meta_\$\{s\.id\}\`,[\s\S]*?\}\);/g,
  `const { data: existingMetaDoc } = await supabase.from('documents').select('id').eq('user_id', s.id).eq('category', 'Staff Metadata').maybeSingle();
      if (existingMetaDoc) {
        await supabase.from('documents').update({ notes: JSON.stringify(metadata) }).eq('id', existingMetaDoc.id);
      } else {
        await supabase.from('documents').insert({
          user_id: s.id,
          document_name: 'Staff Metadata',
          category: 'Staff Metadata',
          file_path: '#',
          notes: JSON.stringify(metadata)
        });
      }`
);

fs.writeFileSync('src/App.tsx', content);
