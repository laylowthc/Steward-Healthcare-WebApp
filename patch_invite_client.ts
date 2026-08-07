import fs from 'fs';
let content = fs.readFileSync('src/components/UserAdministration.tsx', 'utf8');

const oldCode = `    try {
      const dbRole = inviteRole === 'admin' ? 'Admin' : (inviteRole === 'staff' ? 'Staff' : 'Applicant');
      const { data, error } = await supabase
        .from('users')
        .insert({
          full_name: inviteName,
          email: inviteEmail.toLowerCase(),
          role: dbRole,
          status: 'Active',
          permissions: []
        })
        .select();

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const created = data[0];
        const newUser: SystemUser = {
          id: created.id,
          uid: created.firebase_uid || created.id,
          name: created.full_name || inviteName,
          email: created.email,
          role: (created.role || inviteRole).toLowerCase() as SystemUser['role'],
          status: created.status || 'Active',
          permissions: created.permissions || []
        };
        setUsers(prev => [newUser, ...prev]);
      }`;

const newCode = `    try {
      const dbRole = inviteRole === 'admin' ? 'Admin' : (inviteRole === 'staff' ? 'Staff' : 'Applicant');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${session.access_token}\`
        },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          role: dbRole
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to invite user");
      }

      if (result.user) {
        const created = result.user;
        const newUser: SystemUser = {
          id: created.id,
          uid: created.firebase_uid || created.id,
          name: created.full_name || inviteName,
          email: created.email,
          role: (created.role || inviteRole).toLowerCase() as SystemUser['role'],
          status: created.status || 'Active',
          permissions: created.permissions || []
        };
        setUsers(prev => [newUser, ...prev]);
      }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('src/components/UserAdministration.tsx', content);
