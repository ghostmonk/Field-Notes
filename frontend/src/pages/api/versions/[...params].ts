import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const API_BASE_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

    if (!API_BASE_URL) {
        return res.status(500).json({ detail: "Backend URL not configured" });
    }

    if (req.method !== "GET") {
        return res.status(405).json({ detail: "Method not allowed" });
    }

    const token = await getToken({ req });
    if (!token?.accessToken) {
        return res.status(401).json({ detail: "Not authenticated" });
    }

    // params is an array like ["story", "content-id"] or ["story", "content-id", "1"]
    const params = req.query.params;
    if (!Array.isArray(params) || params.length < 2) {
        return res.status(400).json({ detail: "Invalid path" });
    }

    const pathSegments = params.join("/");
    const apiUrl = `${API_BASE_URL}/versions/${pathSegments}`;

    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token.accessToken}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error("Error in /api/versions:", error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : "Internal server error",
        });
    }
}
