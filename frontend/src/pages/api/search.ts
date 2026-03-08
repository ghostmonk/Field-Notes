import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const API_BASE_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

    if (!API_BASE_URL) {
        return res.status(500).json({ detail: "Backend URL not configured" });
    }

    if (req.method !== "GET") {
        return res.status(405).json({ detail: "Method not allowed" });
    }

    const q = req.query.q?.toString().trim();
    if (!q || q.length > 200) {
        return res.status(400).json({ detail: "Query parameter 'q' is required (1-200 characters)" });
    }

    const params = new URLSearchParams();
    params.append("q", q);
    if (req.query.limit) {
        params.append("limit", req.query.limit.toString());
    }

    const apiUrl = `${API_BASE_URL}/search?${params.toString()}`;

    try {
        const response = await fetch(apiUrl);

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
