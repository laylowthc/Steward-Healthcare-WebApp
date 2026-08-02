import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import multer from "multer";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { AdminAccountStatusError, updateAccountStatus } from "./src/server/adminAccountStatus";
import { AcceptApplicantError, acceptApplicant } from "./src/server/acceptApplicant";
import { InviteUserError, inviteUser } from "./src/server/inviteUser";

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  const getSupabaseClients = () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase server configuration is incomplete");
    }

    return {
      userClient: createClient(supabaseUrl, supabaseAnonKey),
      adminClient: createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    };
  };

  const requireActiveAdmin = async (req: express.Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const err = new Error("Missing or invalid authorization header") as any;
      err.status = 401;
      throw err;
    }

    const token = authHeader.split(" ")[1];
    const { userClient, adminClient } = getSupabaseClients();
    const { data: { user: callerUser }, error: authError } = await userClient.auth.getUser(token);

    if (authError || !callerUser) {
      const err = new Error("Invalid or expired session token") as any;
      err.status = 401;
      throw err;
    }

    const { data: callerProfile, error: profileError } = await adminClient
      .from("users")
      .select("*")
      .eq("id", callerUser.id)
      .single();

    const callerRole = (callerProfile?.role || "").toLowerCase();
    const callerStatus = callerProfile?.status || "Pending";
    if (profileError || !callerProfile || callerRole !== "admin" || callerStatus !== "Active") {
      const err = new Error("Forbidden: active administrative privileges required") as any;
      err.status = 403;
      throw err;
    }

    return { callerUser, callerProfile, adminClient };
  };

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/admin/invite-user", async (req, res) => {
    try {
      const result = await inviteUser({
        authorization: req.headers.authorization,
        email: req.body?.email,
        fullName: req.body?.fullName,
        role: req.body?.role,
        redirectTo: `${req.protocol}://${req.get('host')}`
      });
      return res.json({
        success: true,
        message: `Invitation sent to ${result.user.email}.`,
        ...result
      });
    } catch (error: any) {
      console.error("[invite-user] Error:", error);
      const status = error instanceof InviteUserError ? error.statusCode : 500;
      return res.status(status).json({
        success: false,
        message: error.message || "Internal Server Error"
      });
    }
  });

  app.patch("/api/admin/users/:id/status", async (req, res) => {
    try {
      const user = await updateAccountStatus({
        authorization: req.headers.authorization,
        targetUserId: req.params.id,
        status: req.body.status
      });
      return res.json({ success: true, user });
    } catch (error: any) {
      console.error("[update-user-status] Error:", error);
      const statusCode = error instanceof AdminAccountStatusError ? error.statusCode : 500;
      return res.status(statusCode).json({ error: error.message || "Internal Server Error" });
    }
  });

  app.patch("/api/admin/user-status", async (req, res) => {
    try {
      const user = await updateAccountStatus({
        authorization: req.headers.authorization,
        targetUserId: req.body.targetUserId,
        status: req.body.status
      });
      return res.json({ success: true, user });
    } catch (error: any) {
      console.error("[update-user-status] Error:", error);
      const statusCode = error instanceof AdminAccountStatusError ? error.statusCode : 500;
      return res.status(statusCode).json({ error: error.message || "Internal Server Error" });
    }
  });

  app.post("/api/admin/accept-applicant", async (req, res) => {
    try {
      const result = await acceptApplicant({
        authorization: req.headers.authorization,
        applicantId: req.body.applicantId
      });
      return res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[accept-applicant] Error:", error);
      const statusCode = error instanceof AcceptApplicantError ? error.statusCode : 500;
      return res.status(statusCode).json({ error: error.message || "Internal Server Error" });
    }
  });

  app.post("/api/admin/delete-user", async (req, res) => {
    try {
      const { targetUserId } = req.body;
      if (!targetUserId) {
        return res.status(400).json({ error: "Missing targetUserId parameter" });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid authorization header" });
      }
      const token = authHeader.split(" ")[1];

      const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ error: "Supabase configuration variables are missing on the server" });
      }

      // Create user client to verify caller session and query caller profile
      const userClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user: callerUser }, error: authError } = await userClient.auth.getUser(token);

      if (authError || !callerUser) {
        console.error("[delete-user] Auth verification failed:", authError);
        return res.status(401).json({ error: "Invalid or expired session token" });
      }

      // Query caller profile
      const { data: callerProfile, error: profileError } = await userClient
        .from("users")
        .select("*")
        .eq("id", callerUser.id)
        .single();

      if (profileError || !callerProfile) {
        console.error("[delete-user] Caller profile query failed:", profileError);
        return res.status(403).json({ error: "Unauthorized: Caller profile not found" });
      }

      // Verify that the caller is an admin
      const callerRole = (callerProfile.role || "").toLowerCase();
      if (callerRole !== "admin" && callerRole !== "super-admin") {
        console.error(`[delete-user] Access denied. Caller role is "${callerRole}"`);
        return res.status(403).json({ error: "Forbidden: Administrative privileges required" });
      }

      if (!supabaseServiceKey) {
        console.error("[delete-user] SUPABASE_SERVICE_ROLE_KEY is not configured");
        return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server" });
      }

      // Create privileged client with service role key
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // 1. Retrieve user documents from public.documents belonging to the target user
      const { data: userDocs, error: docsFetchError } = await adminClient
        .from("documents")
        .select("*")
        .eq("user_id", targetUserId);

      if (docsFetchError) {
        console.error("[delete-user] Error fetching user documents:", docsFetchError);
        return res.status(500).json({ error: "Failed to fetch user documents", details: docsFetchError });
      }

      const deletedFiles: string[] = [];
      const deleteErrors: any[] = [];

      // 2. Extract, normalize, and delete each file from 'documents' storage bucket
      if (userDocs && userDocs.length > 0) {
        for (const doc of userDocs) {
          let pathInDb = doc.file_path || doc.file_path_url || doc.fileUrl || "";
          if (pathInDb) {
            let cleanedPath = pathInDb;
            if (cleanedPath.startsWith("http://") || cleanedPath.startsWith("https://")) {
              const docMarker = "/documents/";
              if (cleanedPath.includes(docMarker)) {
                const parts = cleanedPath.split(docMarker);
                cleanedPath = parts[parts.length - 1];
                const queryIndex = cleanedPath.indexOf("?");
                if (queryIndex !== -1) {
                  cleanedPath = cleanedPath.substring(0, queryIndex);
                }
              }
            }
            cleanedPath = cleanedPath.replace(/^\/+/, "");
            if (cleanedPath.startsWith("documents/")) {
              cleanedPath = cleanedPath.substring("documents/".length);
            }

            if (cleanedPath) {
              console.log(`[delete-user] Normalised storage path for deletion: "${cleanedPath}"`);
              const { error: storageDelError } = await adminClient.storage
                .from("documents")
                .remove([cleanedPath]);

              if (storageDelError) {
                console.error(`[delete-user] Storage delete error for "${cleanedPath}":`, storageDelError);
                deleteErrors.push({ path: cleanedPath, error: storageDelError });
              } else {
                deletedFiles.push(cleanedPath);
              }
            }
          }
        }
      }

      // 3. Delete target user's public.documents rows
      const { error: dbDocsDeleteError } = await adminClient
        .from("documents")
        .delete()
        .eq("user_id", targetUserId);

      if (dbDocsDeleteError) {
        console.error("[delete-user] Error deleting documents from public.documents:", dbDocsDeleteError);
        return res.status(500).json({ error: "Failed to delete user documents from database", details: dbDocsDeleteError });
      }

      // 4. Delete target user's public.users profile
      const { error: dbUserDeleteError } = await adminClient
        .from("users")
        .delete()
        .or(`id.eq."${targetUserId}",firebase_uid.eq."${targetUserId}"`);

      if (dbUserDeleteError) {
        console.error("[delete-user] Error deleting user profile from public.users:", dbUserDeleteError);
        return res.status(500).json({ error: "Failed to delete user profile from public.users", details: dbUserDeleteError });
      }

      // 5. Delete target user from Supabase auth.users using supabase.auth.admin.deleteUser(targetUserId)
      let authUserDeleted = false;
      let authDeleteErrorMsg = null;
      try {
        const { error: authUserDelError } = await adminClient.auth.admin.deleteUser(targetUserId);
        if (authUserDelError) {
          console.error("[delete-user] Error deleting user from Supabase auth.users:", authUserDelError);
          authDeleteErrorMsg = authUserDelError.message;
        } else {
          authUserDeleted = true;
        }
      } catch (err: any) {
        console.error("[delete-user] Exception during auth.users delete:", err);
        authDeleteErrorMsg = err.message || JSON.stringify(err);
      }

      return res.status(200).json({
        success: true,
        message: "Permanent administrative user deletion completed successfully",
        details: {
          targetUserId,
          callerId: callerUser.id,
          callerRole,
          documentsDeletedCount: userDocs ? userDocs.length : 0,
          physicalFilesDeleted: deletedFiles,
          physicalFileErrors: deleteErrors,
          dbDocumentsDeleted: true,
          dbProfileDeleted: true,
          authUserDeleted,
          authDeleteErrorMsg
        }
      });

    } catch (error: any) {
      console.error("[delete-user] Fatal server-side deletion error:", error);
      return res.status(500).json({ error: "Internal Server Error", details: error.message || error });
    }
  });

  app.post("/api/extract-timesheet", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const mimeType = req.file.mimetype;
      const base64Data = req.file.buffer.toString("base64");

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: "Extract timesheet details from this document. Identify the staff name, the week ending date, the client name or location, and the total hours worked.",
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              staffName: { type: Type.STRING, description: "The name of the staff member" },
              weekEnding: { type: Type.STRING, description: "The week ending date" },
              client: { type: Type.STRING, description: "The client name or location worked at" },
              hoursWorked: { type: Type.NUMBER, description: "Total hours worked during the week" },
            },
            required: ["staffName", "weekEnding", "client", "hoursWorked"],
          },
        },
      });

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      const extractedData = JSON.parse(response.text);
      res.json(extractedData);
    } catch (error) {
      console.error("Extraction error:", error);
      res.status(500).json({ error: "Failed to extract timesheet data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
