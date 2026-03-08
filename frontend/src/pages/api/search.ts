import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const API_BASE_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

    if (!API_BASE_URL) {
        return res.status(500).json({ detail: "Backend URL not configured" });
    }

    if (req.method !== "GET") {
        return res.status(405).json({ detail: "Method not allowed" });
    }

    const params = new URLSearchParams();
    if (req.query.q) {
        params.append("q", req.query.q.toString());
    }
    if (req.query.limit) {
        params.append("limit", req.query.limit.toString());
    }

    const apiUrl = `${API_BASE_URL}/search?${params.toString()}`;

    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error("Error in /api/search:", error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : "Internal server error",
        });
    }
}
