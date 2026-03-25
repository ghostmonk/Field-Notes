import { NextApiRequest, NextApiResponse } from "next";
import { fetchBackend } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    try {
        const response = await fetchBackend(`/search?${params.toString()}`);

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
