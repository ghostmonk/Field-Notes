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
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const forwardedFor = Array.isArray(clientIp) ? clientIp[0] : clientIp;

    const response = await fetchBackend("/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": forwardedFor,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Fatal error in /api/contact:", error);
    return res.status(500).json({
      detail: "Internal server error",
    });
  }
}
