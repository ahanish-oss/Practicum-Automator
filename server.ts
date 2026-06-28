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

  app.post("/api/gemini/generate", async (req, res) => {
    try {
      console.log("[API] Request received");
      const { prompt, fields, model, documentType, aiPersona } = req.body;
      
      let promptToUse = prompt || "";
      if (fields && Array.isArray(fields) && fields.length > 0) {
        console.log(`[API] Dynamic fields provided: ${fields.length} fields found.`);
        // Find context details from first field
        const firstField = fields[0];
        const experimentTitle = firstField?.experimentTitle || firstField?.topic || "MQTT Publish Subscribe Architecture";
        const docType = documentType || "Engineering Lab Record";
        const persona = aiPersona || "expert engineering laboratory instructor";

        promptToUse = `You are an expert ${persona}.

Generate realistic, technical, academic laboratory record content.

Primary Context Source:
- Experiment Topic (Topic/Title): "${experimentTitle}"
- Document Type: "${docType}"

Below is the list of fields requiring high-fidelity responses. Make sure each generated value matches the requested ID and is highly specific to the experiment topic ("${experimentTitle}").

Fields to generate:
${JSON.stringify(fields.map(f => ({
  fieldId: f.fieldId || f.id,
  id: f.id,
  section: f.section,
  label: f.label,
  role: f.role || "observation",
  topic: f.topic || experimentTitle,
  type: f.type,
  headers: f.headers,
  tableRows: f.tableRows
})), null, 2)}

Rules for generating response content:
1. Generate detailed, highly specific academic content solely about "${experimentTitle}".
2. Never repeat or use generic, lazy or placeholder phrases such as:
   - "Experiment completed successfully"
   - "Data was observed"
   - "System worked correctly"
   - "The experiment was completed successfully and all objectives were achieved."
   - "Data transmission was successful without packet loss."
   - "Generated content for ..."
3. Output format requirements:
   - Return ONLY a valid JSON Array of objects.
   - Each object MUST represent a field, with key "id".
   - For text or textarea fields, set "value" to a string of technical generated text and omit/set "tableValue" to null.
   - For table fields, set "tableValue" to a 2D Array of Strings representing the data rows (DO NOT include the table headers as the first row). Set "value" to null.

4. Section-Specific Intelligence & Content Guidelines based on "role":
   - For role: "resource_table" (Actual Resources Used):
     * Generate realistic hardware, software, tools, versions, and configurations.
     * Fill the columns with rich details instead of generic text.
     * For example, instead of transmitting generic names, generate exactly:
       Resource Name: "Desktop Computer" | Specifications: "Intel Core i5, 8GB RAM"
       Resource Name: "MQTT Broker" | Specifications: "Eclipse Mosquitto 2.0"
       Resource Name: "Python" | Specifications: "Version 3.12"
       Resource Name: "VS Code" | Specifications: "Version 1.98"
       Resource Name: "Wireshark" | Specifications: "Version 4.2"
       Include appropriate specs, quantities, and active/connected status.
   - For role: "procedure" (Actual Procedure Followed):
     * Generate detailed, numbered procedural steps outlining setup, script creation, initialization, execution, and confirmation.
   - For role: "observation" (Observations / Measurements):
     * Generate actual measurable observations, specific values, network pings, latency timings (e.g., in milliseconds), broker server status logs, and subscription metrics.
   - For role: "result" (Results/Observations Summary):
     * Summarize technical experimental outcomes with precise qualitative or quantitative results.
   - For role: "interpretation" (Interpretation of Results):
     * Explain what the obtained values/observations scientifically and technically mean.
   - For role: "conclusion" (Conclusions / Learning Outcomes):
     * State clearly whether the objectives of "${experimentTitle}" were met and what practical engineering takeaways were learned.
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

  // 1. Single section revise endpoint
  app.post("/api/gemini/copilot/revise", async (req, res) => {
    try {
      console.log("[COPILOT API] Revise request received");
      const { fieldId, fieldLabel, fieldType, currentValue, instruction, experimentTitle, semanticRole, model, documentType, aiPersona } = req.body;
      
      const persona = aiPersona || "Engineering Lab Practicum Advisor";
      const docType = documentType || "Laboratory Experiment";
      const prompt = `You are an expert ${persona}.
We are revising a specific section of a student's academic document.

Experiment: "${experimentTitle || docType}"
Section Label: "${fieldLabel || "Section"}"
Section Role: "${semanticRole || "observation"}"
Field Type: "${fieldType || "textarea"}"

Current Content:
${JSON.stringify(currentValue, null, 2)}

Student's Instruction for Revision:
"${instruction}"

Your task is to rewrite or edit this content according to the instruction.
Rules:
1. Maintain high-fidelity academic engineering language.
2. Address the instruction precisely.
3. If this is a table (fieldType === "table"), output a JSON array of arrays of strings (2D array of cells representing the row data, excluding the header row).
4. If this is a text or textarea field, return the revised string.

Output must be in JSON format:
{
  "revisedValue": "the revised text string" or [["cell1", "cell2"], ["cell3", "cell4"]] for table fields
}
`;

      const requestedModel = model || "gemini-3.5-flash";
      const response = await callModelWithRetry(requestedModel, prompt, { responseMimeType: "application/json" });

      if (!response || !response.text) {
        throw new Error("No response from model");
      }

      console.log("[COPILOT API] Revision received successfully");
      const cleaned = response.text.trim();
      const parsed = JSON.parse(cleaned);
      res.json({ success: true, revisedValue: parsed.revisedValue });
    } catch (error: any) {
      console.error("[COPILOT REVISE ERROR]", error);
      res.status(200).json({ success: false, error: error.message || "Failed to revise section" });
    }
  });

  // 2. Chat with global/local report updates endpoint
  app.post("/api/gemini/copilot/chat", async (req, res) => {
    try {
      console.log("[COPILOT API] Chat request received");
      const { message, chatHistory, formValues, fields, experimentTitle, model, documentType, aiPersona } = req.body;

      const persona = aiPersona || "Engineering Lab Practicum Advisor and Copilot";
      const docType = documentType || "academic document";
      const prompt = `You are an expert ${persona}.
You are helping a student review, refine, and improve their ${docType}.

Experiment Topic: "${experimentTitle || "MQTT Publish Subscribe Architecture"}"

The current fields and their metadata in the report are:
${JSON.stringify(fields, null, 2)}

Current values in the report:
${JSON.stringify(formValues, null, 2)}

The student says: "${message}"

Your tasks:
1. Provide a direct, polite, helpful response answering their question or explaining what modifications you've made. Keep it concise, academic, and highly professional.
2. If the user asked for a change (e.g. "make observations more technical", "rewrite slide 1", "make everything IEEE", etc.), identify which fields in 'formValues' should be updated.
For each updated field, write the complete, updated content.
- For table fields, output the updated table rows as a 2D Array of Strings (excluding headers).
- For text/textarea fields, output the updated string.

Output must be in JSON format:
{
  "text": "Your textual response here...",
  "updatedFields": {
    "fieldId": "revised text content or [[cell1, cell2], [cell3, cell4]] for tables"
  }
}
`;

      const requestedModel = model || "gemini-3.5-flash";
      const response = await callModelWithRetry(requestedModel, prompt, { responseMimeType: "application/json" });

      if (!response || !response.text) {
        throw new Error("No response from model");
      }

      console.log("[COPILOT API] Chat completed successfully");
      const cleaned = response.text.trim();
      const parsed = JSON.parse(cleaned);
      res.json({ success: true, text: parsed.text, updatedFields: parsed.updatedFields || {} });
    } catch (error: any) {
      console.error("[COPILOT CHAT ERROR]", error);
      res.status(200).json({ success: false, error: error.message || "Failed to complete chat" });
    }
  });

  // 3. Report evaluation endpoint
  app.post("/api/gemini/copilot/evaluate", async (req, res) => {
    try {
      console.log("[COPILOT API] Evaluate request received");
      const { experimentTitle, formValues, fields, model, documentType, aiPersona } = req.body;

      const persona = aiPersona || "Engineering Lab Practicum Evaluator";
      const docType = documentType || "academic document";
      const prompt = `You are an expert ${persona}.
Analyze the following student ${docType} and calculate a quality score.

Experiment Topic: "${experimentTitle || "MQTT Publish Subscribe Architecture"}"

Report Contents:
${JSON.stringify(
  fields.map((f: any) => ({
    id: f.id,
    label: f.label,
    role: f.role || f.semanticRole,
    value: formValues[f.id]
  })),
  null,
  2
)}

Evaluate the quality of the report out of 100 based on detail, technical depth, proper metrics, completeness, and clarity.
Identify:
1. At least 2-3 specific Strengths (e.g., "Clear, numbered procedural steps", "Accurate broker port configuration").
2. At least 2-3 specific suggestions/recommendations to improve the score.
3. Specific Missing Information (e.g. "No hardware specifications provided", "No network latency measurements", "Missing packet loss metrics", "Screenshots placeholder warning").

Output must be in JSON format conforming to:
{
  "score": 85,
  "strengths": ["...", "..."],
  "suggestions": ["...", "..."],
  "missingInfo": ["...", "..."]
}
`;

      const requestedModel = model || "gemini-3.5-flash";
      const response = await callModelWithRetry(requestedModel, prompt, { responseMimeType: "application/json" });

      if (!response || !response.text) {
        throw new Error("No response from model");
      }

      console.log("[COPILOT API] Evaluation completed successfully");
      const cleaned = response.text.trim();
      const parsed = JSON.parse(cleaned);
      res.json({ success: true, quality: parsed });
    } catch (error: any) {
      console.error("[COPILOT EVAL ERROR]", error);
      res.status(200).json({ success: false, error: error.message || "Failed to evaluate report" });
    }
  });

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
