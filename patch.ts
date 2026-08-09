import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /const metadata = \{\s*notes: applicant\.notes[\s\S]*?staff_number: JSON\.stringify\(metadata\)\s*\}/,
  `const { error: profileErr } = await supabase.from('staff_profiles').upsert({
        user_id: applicant.id,
        job_title: applicant.position,
        department: 'Applied'
        // staff_number and other fields should be explicit columns, not JSON
      });
      
      // Upsert into applications table (requires DB migration)
      const { error: appErr } = await supabase.from('applications').upsert({
        user_id: applicant.id,
        title: applicant.cvData?.personalDetails?.title || null,
        full_name: applicant.name,
        address: applicant.cvData?.personalDetails?.address || null,
        dob: applicant.cvData?.personalDetails?.dob ? new Date(applicant.cvData.personalDetails.dob) : null,
        nationality: applicant.cvData?.personalDetails?.nationality || null,
        gender: applicant.cvData?.personalDetails?.gender || null,
        ni_number: applicant.cvData?.personalDetails?.niNumber || null,
        right_to_work_status: applicant.cvData?.personalDetails?.rightToWorkStatus || null,
        emergency_name: applicant.cvData?.personalDetails?.emergencyName || null,
        emergency_relation: applicant.cvData?.personalDetails?.emergencyRelation || null,
        emergency_phone: applicant.cvData?.personalDetails?.emergencyPhone || null,
        employment_history: applicant.cvData?.employmentHistory || null,
        qualifications: applicant.cvData?.qualifications || null,
        mandatory_training: applicant.cvData?.mandatoryTraining || null,
        skills: applicant.cvData?.skills || null,
        references: applicant.cvData?.references || null,
        status: applicant.status || 'Applied'
      });
      if (appErr) console.error("Error upserting into applications table:", appErr);`
);

fs.writeFileSync('src/App.tsx', content);
