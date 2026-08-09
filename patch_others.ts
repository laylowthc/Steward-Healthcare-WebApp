import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /const saveTimesheetToSupabase = async \(t: Timesheet\) => \{[\s\S]*?console\.error\("Exception in saveTimesheetToSupabase:", e\);\s*\}\s*\};/,
  `const saveTimesheetToSupabase = async (t: Timesheet) => {
    try {
      const adminUser = supabaseUserId || currentUserId || '310d20c5-3b9a-4519-bf58-a52fd0c04ecb';
      // Do not use the custom local ID which might not be a valid UUID. Instead let Supabase insert new ones.
      // Timesheets are usually append-only in this demo.
      const { error } = await supabase.from('documents').insert({
        user_id: adminUser,
        document_name: \`Timesheet for \${t.staffName}\`,
        category: 'Timesheet',
        file_path: t.fileUrl || '#',
        verification_status: t.approvalStatus,
        notes: JSON.stringify(t)
      });
      if (error) console.error("Error saving timesheet to Supabase:", error);
    } catch (e) {
      console.error("Exception in saveTimesheetToSupabase:", e);
    }
  };`
);

content = content.replace(
  /const saveFamilyFeedbackToSupabase = async \(f: FamilyFeedback\) => \{[\s\S]*?console\.error\("Exception in saveFamilyFeedbackToSupabase:", e\);\s*\}\s*\};/,
  `const saveFamilyFeedbackToSupabase = async (f: FamilyFeedback) => {
    try {
      const adminUser = supabaseUserId || currentUserId || '310d20c5-3b9a-4519-bf58-a52fd0c04ecb';
      const { error } = await supabase.from('documents').insert({
        user_id: adminUser,
        document_name: \`Feedback from \${f.familyRepresentative}\`,
        category: 'FamilyFeedback',
        file_path: '#',
        notes: JSON.stringify(f)
      });
      if (error) console.error("Error saving feedback to Supabase:", error);
    } catch (e) {
      console.error("Exception in saveFamilyFeedbackToSupabase:", e);
    }
  };`
);

content = content.replace(
  /const saveRoleTemplateToSupabase = async \(rt: RoleTemplate\) => \{[\s\S]*?console\.error\("Exception in saveRoleTemplateToSupabase:", e\);\s*\}\s*\};/,
  `const saveRoleTemplateToSupabase = async (rt: RoleTemplate) => {
    try {
      const adminUser = supabaseUserId || currentUserId || '310d20c5-3b9a-4519-bf58-a52fd0c04ecb';
      const { data: existingTemplate } = await supabase.from('documents').select('id').eq('category', 'RoleTemplate').eq('document_name', \`Template: \${rt.role}\`).maybeSingle();
      
      if (existingTemplate) {
        await supabase.from('documents').update({ notes: JSON.stringify(rt) }).eq('id', existingTemplate.id);
      } else {
        await supabase.from('documents').insert({
          user_id: adminUser,
          document_name: \`Template: \${rt.role}\`,
          category: 'RoleTemplate',
          file_path: '#',
          notes: JSON.stringify(rt)
        });
      }
    } catch (e) {
      console.error("Exception in saveRoleTemplateToSupabase:", e);
    }
  };`
);

fs.writeFileSync('src/App.tsx', content);
