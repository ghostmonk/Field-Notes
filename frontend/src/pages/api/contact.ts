import { NextApiRequest, NextApiResponse } from "next";
import { apiLogger } from "@/shared/utils/logger";
import { fetchBackend } from "@/shared/utils/backend-fetch";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  apiLogger.logApiRequest(req, res);

  try {
    // In production (Cloud Run), the infrastructure sets X-Forwarded-For with the real
    // client IP. Locally, fall back to socket address. Take only the first (leftmost) IP
    // from X-Forwarded-For to avoid client-appended spoofed entries.
    const forwarded = req.headers['x-forwarded-for'];
    const forwardedFirst = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim();
    const clientIp = forwardedFirst || req.socket.remoteAddress || '127.0.0.1';

    const response = await fetchBackend("/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIp,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    apiLogger.error("Fatal error in /api/contact:", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      detail: "Internal server error",
    });
  }
}
