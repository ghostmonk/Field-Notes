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
    const response = await fetchBackend("/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Fatal error in /api/contact:", error);
    return res.status(500).json({
      detail: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
