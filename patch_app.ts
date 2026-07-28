import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace fetchApplicants section
content = content.replace(
  /const loadedApplicants: Applicant\[\] = \[\];[\s\S]*?setApplicants\(loadedApplicants\);/,
  `const loadedApplicants: Applicant[] = [];
          const loadedStaff: Staff[] = [];

          usersData.forEach(u => {
            const uRole = (u.role || 'Applicant').toLowerCase();
            const profile = profilesMap.get(u.id);
            
            if (uRole === 'applicant') {
              // Extract CV Data from documents if it exists
              const appDoc = docsData.find(d => d.user_id === u.id && d.category === 'Application Form');
              let parsedCvData = undefined;
              if (appDoc && appDoc.notes) {
                try {
                  parsedCvData = JSON.parse(appDoc.notes);
                } catch(e) {}
              }
              
              // Extract compliance from another document or just set it to default since we are moving away from staff_number json
              const complianceDoc = docsData.find(d => d.user_id === u.id && d.category === 'Compliance Data');
              let complianceChecked = {};
              if (complianceDoc && complianceDoc.notes) {
                try { complianceChecked = JSON.parse(complianceDoc.notes); } catch(e) {}
              }

              loadedApplicants.push({
                id: u.id,
                name: u.full_name || 'Applicant User',
                email: u.email,
                phone: u.phone || '',
                position: profile?.job_title || 'Care Assistant',
                status: u.status as ApplicantStatus || 'Applied',
                dateCreated: u.created_at || new Date().toISOString(),
                notes: '',
                complianceChecked: complianceChecked,
                cvData: parsedCvData
              });
            } else if (uRole === 'staff' || uRole === 'admin') {
              // Parse staff metadata from a 'Staff Metadata' document instead of staff_number
              const metaDoc = docsData.find(d => d.user_id === u.id && d.category === 'Staff Metadata');
              let metadata: any = {};
              if (metaDoc && metaDoc.notes) {
                try { metadata = JSON.parse(metaDoc.notes); } catch(e) {}
              }
              
              loadedStaff.push({
                id: u.id,
                name: u.full_name || 'Staff Member',
                email: u.email,
                phone: u.phone || '',
                address: metadata.address || 'Registered Caregiver Address',
                role: profile?.job_title || (uRole === 'admin' ? 'Administrator' : 'Care Assistant'),
                status: u.status || 'Active',
                avatarUrl: metadata.avatarUrl,
                nmcPin: metadata.nmcPin,
                nmcExpiry: metadata.nmcExpiry,
                dbsStatus: metadata.dbsStatus || 'Compliant',
                dbsNumber: profile?.dbs_number || '',
                dbsExpiry: profile?.dbs_issue_date || '',
                rightToWork: metadata.rightToWork || 'Compliant',
                rightToWorkExpiry: metadata.rightToWorkExpiry || '',
                trainingStatus: metadata.trainingStatus || 'Compliant',
                trainingExpiry: metadata.trainingExpiry || '',
                joinedDate: u.created_at || new Date().toISOString().split('T')[0]
              });
            }
          });

          setApplicants(loadedApplicants);`
);

// Replace saveApplicantToSupabase section
content = content.replace(
  /const saveApplicantToSupabase = async \(applicant: Applicant\) => \{[\s\S]*?console\.error\("Exception in saveApplicantToSupabase:", e\);\s*\}\s*\};/,
  `const saveApplicantToSupabase = async (applicant: Applicant) => {
    try {
      // 1. Update/Insert in users table
      const { error: userErr } = await supabase.from('users').upsert({
        id: applicant.id,
        full_name: applicant.name,
        email: applicant.email.toLowerCase(),
        phone: applicant.phone,
        role: 'Applicant',
        status: applicant.status || 'Applied',
        firebase_uid: applicant.id
      });
      if (userErr) console.error("Error upserting applicant in users table:", userErr);

      // 2. Prepare metadata
      const { error: profileErr } = await supabase.from('staff_profiles').upsert({
        user_id: applicant.id,
        job_title: applicant.position,
        department: 'Applied'
      });
      if (profileErr) console.error("Error upserting staff in staff_profiles:", profileErr);
      
      // Save CV Data as a document
      if (applicant.cvData) {
        await supabase.from('documents').upsert({
          id: \`app_form_\${applicant.id}\`,
          user_id: applicant.id,
          document_name: 'Application Form Data',
          category: 'Application Form',
          file_path: '#',
          notes: JSON.stringify(applicant.cvData)
        });
      }
      
      // Save compliance data as a document
      if (applicant.complianceChecked) {
        await supabase.from('documents').upsert({
          id: \`comp_data_\${applicant.id}\`,
          user_id: applicant.id,
          document_name: 'Compliance Checklist',
          category: 'Compliance Data',
          file_path: '#',
          notes: JSON.stringify(applicant.complianceChecked)
        });
      }
      
    } catch (e) {
      console.error("Exception in saveApplicantToSupabase:", e);
    }
  };`
);

// Replace saveStaffToSupabase section
content = content.replace(
  /const saveStaffToSupabase = async \(s: Staff\) => \{[\s\S]*?console\.error\("Exception in saveStaffToSupabase:", e\);\s*\}\s*\};/,
  `const saveStaffToSupabase = async (s: Staff) => {
    try {
      const { error: userErr } = await supabase.from('users').upsert({
        id: s.id,
        full_name: s.name,
        email: s.email.toLowerCase(),
        phone: s.phone,
        role: s.role === 'Administrator' ? 'Admin' : 'Staff',
        status: s.status,
        firebase_uid: s.id
      });
      if (userErr) console.error("Error upserting staff in users table:", userErr);

      const metadata = {
        address: s.address,
        avatarUrl: s.avatarUrl,
        nmcPin: s.nmcPin,
        nmcExpiry: s.nmcExpiry,
        dbsStatus: s.dbsStatus,
        rightToWorkExpiry: s.rightToWorkExpiry,
        trainingStatus: s.trainingStatus,
        trainingExpiry: s.trainingExpiry
      };
      
      const { error: profileErr } = await supabase.from('staff_profiles').upsert({
        user_id: s.id,
        job_title: s.role,
        department: 'Staff'
      });
      if (profileErr) console.error("Error upserting staff in staff_profiles:", profileErr);
      
      // Save Staff metadata as a document
      await supabase.from('documents').upsert({
        id: \`staff_meta_\${s.id}\`,
        user_id: s.id,
        document_name: 'Staff Metadata',
        category: 'Staff Metadata',
        file_path: '#',
        notes: JSON.stringify(metadata)
      });
    } catch (e) {
      console.error("Exception in saveStaffToSupabase:", e);
    }
  };`
);

fs.writeFileSync('src/App.tsx', content);
