import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const runUpload = (req: any, res: any) =>
  new Promise<void>((resolve, reject) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await runUpload(req, res);

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: req.file.mimetype,
            data: req.file.buffer.toString('base64')
          }
        },
        {
          text: 'Extract timesheet details from this document. Identify the staff name, the week ending date, the client name or location, and the total hours worked.'
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            staffName: { type: Type.STRING, description: 'The name of the staff member' },
            weekEnding: { type: Type.STRING, description: 'The week ending date' },
            client: { type: Type.STRING, description: 'The client name or location worked at' },
            hoursWorked: { type: Type.NUMBER, description: 'Total hours worked during the week' }
          },
          required: ['staffName', 'weekEnding', 'client', 'hoursWorked']
        }
      }
    });

    if (!response.text) {
      throw new Error('Empty response from AI');
    }

    return res.status(200).json(JSON.parse(response.text));
  } catch (error) {
    console.error('Extraction error:', error);
    return res.status(500).json({ error: 'Failed to extract timesheet data' });
  }
}

