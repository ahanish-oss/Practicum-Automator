import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

console.log(
  "[API KEY PREFIX]",
  process.env.GEMINI_API_KEY?.slice(0, 8)
);

// We must lazy initialize GenAI so that missing key fails properly
let ai: GoogleGenAI | null = null;
function getGenAI() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" }
      }
    });
  }
  return ai;
}

// Helper to check for 503 / unavailable or high demand errors
function is503Error(e: any): boolean {
  const errorStr = String(e?.message || e).toLowerCase();
  const status = e?.status || e?.code || 0;
  return status === 503 || 
         status === 504 || 
         status === 502 || 
         status === 500 || 
         errorStr.includes("503") || 
         errorStr.includes("504") || 
         errorStr.includes("502") || 
         errorStr.includes("500") || 
         errorStr.includes("unavailable") || 
         errorStr.includes("socket hang up") || 
         errorStr.includes("econnreset") || 
         errorStr.includes("etimedout") || 
         errorStr.includes("fetch failed") || 
         errorStr.includes("experiencing high demand");
}

// Model retry helper with exponential backoff (max 3 retries: 1s, 2s, 4s)
async function callModelWithRetry(modelName: string, prompt: string, config: any): Promise<any> {
  console.log("[AI MODEL]", modelName);
  const genAI = getGenAI();
  const delays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s
  let attempt = 0;

  while (true) {
    try {
      const response = await genAI.models.generateContent({
        model: modelName,
        contents: prompt,
        config
      });
      return response;
    } catch (e: any) {
      // Log Gemini error
      console.error(
         "[GEMINI ERROR]",
         e
      );

      const errorStr = String(e?.message || e).toLowerCase();
      const status = e?.status || e?.code || 0;
      const isQuota = status === 429 || 
                      errorStr.includes("429") || 
                      errorStr.includes("quota") || 
                      errorStr.includes("rate limit") || 
                      errorStr.includes("resource_exhausted");

      if (isQuota) {
        // Do not retry quota errors
        const errObj: any = new Error("Quota exceeded");
        errObj.status = 429;
        throw errObj;
      }

      if (is503Error(e)) {
        if (attempt < delays.length) {
          const delay = delays[attempt];
          console.log(`[API] 503/Transient error on ${modelName}. Retrying in ${delay}ms... (Retry ${attempt + 1}/${delays.length})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }
      }
      throw e;
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Only register Gemini endpoint in development
  // In production on Vercel, use /api/gemini/generate.ts serverless function
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/gemini/generate", async (req, res) => {
      try {
        console.log("[API] Request received");
        const { prompt, fields, model } = req.body;
      
      let promptToUse = prompt || "";
      if (fields && Array.isArray(fields) && fields.length > 0) {
        console.log(`[API] Dynamic fields provided: ${fields.length} fields found.`);
        promptToUse = `You are completing an academic/professional engineering laboratory practicum document.
Context or Document details:
${prompt || "Generate realistic student responses for this practicum."}

Below is the list of fields that need responses. Use ONLY the field IDs provided below. NEVER invent or mismatch IDs.

Fields:
${JSON.stringify(fields, null, 2)}

Instructions for generating field values:
1. For text or textarea fields (type !== "table"):
   - Set "value" to a realistic, highly professional, non-trivial, domain-specific student response. Make sure it is descriptive, scientific, and accurate (e.g., for "mqtt observations" write an elite paragraph describing latency, broker synchronization, keepalive intervals, and broker status logs; for "actual procedure followed" write numbered paragraphs detailing environment setups, client scripts, testing, and result captures).
   - Set "tableValue" to null or omit it.

2. For table fields (where type is "table"):
   - Set "value" to null or omit it.
   - Set "tableValue" to a 2D Array of Strings representing the data rows. DO NOT include the table headers as the first data row.
   - IMPORTANT RULES FOR TABLES:
     * FILL ALL AVAILABLE ROWS: You must generate a row in "tableValue" for EACH data row (each item in the field's "tableRows" list where "isHeader" is false).
     * DO NOT MODIFY OR OVERWRITE prefilled identifier columns (like S.No, Serial Number, or pre-entered names). Keep the text values of those columns exactly as they are in the template (e.g., if the first cell of a row has text "1" or is an empty string for a prefilled index, pass that exact string or "" in your cell response; do NOT fabricated new identifiers).
     * USE DOMAIN-SPECIFIC RESOURCES: Fill the editable columns with highly realistic engineering and laboratory tools/configs (e.g. for MQTT use "Mosquitto MQTT Broker", "Paho python-mqtt client", "Raspberry Pi Pico W", "Wireshark", and specific configurations like "Mosquitto v2.0.15", "Latest / Python 3.12", "TCP Port 1883", and remarks like "Running", "Connected & Publishing", "Verified successfully").
     * Example: For a table field with headers ["S.No", "Resource Name", "Version/Configuration", "Remarks"] and 2 data rows, the generated "tableValue" should look like:
       [
         ["", "MQTT Broker (Mosquitto)", "v2.0.18 on Port 1883", "System Broker - Running"],
         ["", "Publisher Client", "Python Paho-MQTT v1.6.1", "Tested & Connected"]
       ]
`;
      }

      const config = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              value: { type: Type.STRING },
              tableValue: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            },
            required: ["id"]
          }
        }
      };

      // Try requested model or candidates list with retry backoff
      const requestedModel = model || "gemini-3.5-flash";
      const candidates = [
        requestedModel,
        "gemini-3.5-flash",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-3.1-flash-lite"
      ].filter((val, index, self) => self.indexOf(val) === index); // deduplicate

      let response: any = null;
      let lastError: any = null;

      for (const candidate of candidates) {
        try {
          console.log(`[API] Trying model candidate: ${candidate}`);
          response = await callModelWithRetry(candidate, promptToUse, config);
          if (response && response.text) {
            console.log(`[API] Success with model: ${candidate}`);
            break;
          }
        } catch (e: any) {
          console.error(`[API] Model ${candidate} failed:`, e.message || e);
          lastError = e;
        }
      }

      if (!response) {
        const errorMsg = lastError?.message || lastError || "All model candidates failed";
        const isQuota = lastError?.status === 429 || String(errorMsg).includes("Quota exceeded") || String(errorMsg).includes("RESOURCE_EXHAUSTED");
        const statusText = isQuota ? "Quota exceeded" : "AI service temporarily unavailable";
        return res.status(200).json({ success: false, error: statusText });
      }

      console.log("[API] Gemini response received. Length:", response.text?.length);
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("[API ERROR]", error);
      res.status(200).json({ success: false, error: "AI service temporarily unavailable" });
    }
  });
  }

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