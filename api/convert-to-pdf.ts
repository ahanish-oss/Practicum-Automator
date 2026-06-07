/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Vercel Serverless Function for DOCX to PDF conversion.
 * Since Vercel does not support Windows/Microsoft Word COM automation,
 * it returns a graceful error as required.
 */

import { IncomingMessage, ServerResponse } from "http";

type VercelRequest = IncomingMessage & { body?: any; query?: any };
type VercelResponse = ServerResponse & { json?: (data: any) => void; status?: (code: number) => VercelResponse };

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set JSON response helpers
  if (!res.json) {
    res.json = function (data: any) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    };
  }
  if (!res.status) {
    res.status = function (code: number) {
      res.statusCode = code;
      return res;
    };
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    res.status!(405).json!({ error: "Method not allowed" });
    return;
  }

  // PDF conversion is only supported on the local Windows environment with Microsoft Word
  res.status!(200).json!({ 
    success: false, 
    error: "Unable to generate PDF. Please try again. (Conversion server only available locally on Windows with MS Word)" 
  });
}
