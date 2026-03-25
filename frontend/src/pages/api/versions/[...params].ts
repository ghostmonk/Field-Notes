import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { fetchBackend } from '@/shared/utils/backend-fetch';

const VALID_SEGMENT = /^[a-zA-Z0-9_-]+$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // Validate each segment: alphanumeric, hyphens, underscores only — no ".." or slashes
    for (const segment of params) {
        if (!VALID_SEGMENT.test(segment)) {
            return res.status(400).json({ detail: "Invalid path segment" });
        }
    }

    const pathSegments = params.join("/");

    try {
        const response = await fetchBackend(`/versions/${pathSegments}`, {
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
