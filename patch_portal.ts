import fs from 'fs';
let content = fs.readFileSync('src/components/ApplicantPortal.tsx', 'utf8');

// Replace handleSaveApplicationForm
content = content.replace(
  /const handleSaveApplicationForm = async \([\s\S]*?\/\/ 2\. Persist Application Form document into Supabase documents table[\s\S]*?\} catch \(e\) \{\s*console\.error\("Exception in handleSaveApplicationForm:", e\);\s*\}\s*\};/,
  `const handleSaveApplicationForm = async (applicantId: string, formData: Record<string, any>) => {
    // Save to the dedicated applications table via App's handler
    if (onSaveCVData) {
      onSaveCVData(applicantId, {
        personalDetails: {
          address: formData.address,
          dob: formData.dob,
          nationality: formData.nationality,
          title: formData.title,
          gender: formData.gender,
          niNumber: formData.niNumber,
          rightToWorkStatus: formData.rightToWorkStatus,
          emergencyName: formData.emergencyName,
          emergencyRelation: formData.emergencyRelation,
          emergencyPhone: formData.emergencyPhone,
          avatarUrl: avatarUrl
        },
        employmentHistory: formData.employmentHistory,
        qualifications: formData.educationHistory,
        mandatoryTraining: formData.mandatoryTrainings,
        skills: formData.skills,
        references: formData.references
      });
    }
  };`
);

fs.writeFileSync('src/components/ApplicantPortal.tsx', content);
