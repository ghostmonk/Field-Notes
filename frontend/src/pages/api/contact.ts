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
    // Use socket address as canonical IP — never trust client-supplied X-Forwarded-For
    const clientIp = req.socket.remoteAddress || '127.0.0.1';

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
    console.error("Fatal error in /api/contact:", error);
    return res.status(500).json({
      detail: "Internal server error",
    });
  }
}
