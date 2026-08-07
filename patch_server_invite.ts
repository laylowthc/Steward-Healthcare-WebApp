import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const inviteEndpoint = `
  app.post("/api/admin/invite-user", async (req, res) => {
    try {
      const { email, name, role } = req.body;
      if (!email || !name || !role) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid authorization header" });
      }
      
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

      if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        return res.status(500).json({ error: "Supabase configuration variables are missing on the server" });
      }

      // We don't have token verification right now because we're just checking Bearer exist?
      // Wait, we can verify caller is admin:
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      
      const token = authHeader.split(" ")[1];
      const { data: { user: callerUser }, error: verifyError } = await adminClient.auth.getUser(token);
      if (verifyError || !callerUser) {
        return res.status(401).json({ error: "Unauthorized: Invalid auth token" });
      }

      const { data: callerProfile, error: profileError } = await adminClient
        .from("users")
        .select("*")
        .eq("id", callerUser.id)
        .single();

      const callerRole = (callerProfile?.role || "").toLowerCase();
      if (callerRole !== "admin" && callerRole !== "super-admin") {
        return res.status(403).json({ error: "Forbidden: Administrative privileges required" });
      }

      // Generate a Supabase invite via admin auth
      const appUrl = process.env.APP_URL || process.env.VITE_SUPABASE_URL || "http://localhost:3000";
      const redirectTo = appUrl.endsWith('/') ? appUrl : appUrl + '/';
      
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email.toLowerCase(), {
        redirectTo: redirectTo
      });

      if (inviteError) {
        console.error("[invite-user] Error inviting user:", inviteError);
        return res.status(500).json({ error: inviteError.message });
      }
      
      const targetUserId = inviteData.user.id;

      // Insert profile in public.users
      const { data: insertData, error: insertError } = await adminClient
        .from("users")
        .insert({
          id: targetUserId,
          firebase_uid: targetUserId,
          full_name: name,
          email: email.toLowerCase(),
          role: role,
          status: 'Active' // Or maybe Pending? user said "if account is not active, direct to pending page"
        })
        .select()
        .single();

      if (insertError) {
        console.error("[invite-user] Error inserting user profile:", insertError);
        // It's possible the user profile already exists, we could upsert instead
        const { data: upsertData, error: upsertError } = await adminClient
          .from("users")
          .upsert({
            id: targetUserId,
            firebase_uid: targetUserId,
            full_name: name,
            email: email.toLowerCase(),
            role: role,
            status: 'Active'
          })
          .select()
          .single();
          
        if (upsertError) {
             return res.status(500).json({ error: "Failed to create user profile", details: upsertError });
        }
        return res.status(200).json({ success: true, user: upsertData });
      }

      return res.status(200).json({ success: true, user: insertData });

    } catch (error: any) {
      console.error("[invite-user] Fatal error:", error);
      return res.status(500).json({ error: "Internal Server Error", details: error.message || error });
    }
  });
`;

content = content.replace('app.post("/api/extract-timesheet"', inviteEndpoint + '\n  app.post("/api/extract-timesheet"');

fs.writeFileSync('server.ts', content);
