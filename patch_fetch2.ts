import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const missingMapping = `
          const loadedDocuments: Document[] = [];
          const loadedTimesheets: Timesheet[] = [];
          const loadedLogs: ActivityLog[] = [];
          const loadedFeedbacks: any[] = [];
          const loadedTemplates: RoleTemplate[] = [];

          docsData.forEach(d => {
            if (d.category === 'ActivityLog') {
              try {
                loadedLogs.push(JSON.parse(d.notes));
              } catch(e) {}
            } else if (d.category === 'Timesheet') {
              try {
                loadedTimesheets.push(JSON.parse(d.notes));
              } catch(e) {}
            } else if (d.category === 'RoleTemplate') {
              try {
                loadedTemplates.push(JSON.parse(d.notes));
              } catch(e) {}
            } else if (d.category === 'FamilyFeedback') {
              try {
                loadedFeedbacks.push(JSON.parse(d.notes));
              } catch(e) {}
            } else if (d.category !== 'Application Form' && d.category !== 'Compliance Data' && d.category !== 'Staff Metadata') {
              const owner = usersData.find(u => u.id === d.user_id);
              loadedDocuments.push({
                id: d.id,
                name: d.document_name,
                category: d.category as any,
                staffId: d.user_id,
                staffName: owner?.full_name || 'System User',
                fileUrl: d.file_path,
                uploadDate: d.upload_date ? new Date(d.upload_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                status: (d.verification_status === 'Pending' ? 'Awaiting Review' : d.verification_status) as any,
                size: d.file_size ? \`\${(d.file_size / 1024).toFixed(1)} KB\` : '1.5 MB'
              });
            }
          });
          
          setApplicants(loadedApplicants);
`;

content = content.replace(/setApplicants\(loadedApplicants\);/, missingMapping);

fs.writeFileSync('src/App.tsx', content);
