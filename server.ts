import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
