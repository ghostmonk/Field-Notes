import { NextApiRequest, NextApiResponse } from "next";
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

function getBaseUrl(req: NextApiRequest): string {
    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    return `${protocol}://${host}`;
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: { params: { scope: "openid email profile" } },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token;

                // Fetch user info from backend to get role and ID
                try {
                    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
                    const response = await fetch(`${backendUrl}/me`, {
                        headers: {
                            'Authorization': `Bearer ${account.access_token}`,
                        },
                    });
                    if (response.ok) {
                        const userInfo = await response.json();
                        token.userId = userInfo.id;
                        token.userRole = userInfo.role;
                    }
                } catch (error) {
                    console.error('Failed to fetch user info from backend:', error);
                }
            }
            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken as string;
            if (session.user) {
                session.user.id = token.userId as string;
                session.user.role = token.userRole as 'admin' | 'commenter';
            }
            return session;
        },
    },
    cookies: {
        // Only configure the OAuth state cookie to work across subdomains
        state: {
            name: "next-auth.state",
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                domain: process.env.NODE_ENV === 'production' ? '.ghostmonk.com' : undefined,
                maxAge: 900, // 15 minutes
            },
        },
        // Also configure the PKCE code verifier for OAuth
        pkceCodeVerifier: {
            name: "next-auth.pkce.code_verifier",
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                domain: process.env.NODE_ENV === 'production' ? '.ghostmonk.com' : undefined,
                maxAge: 900, // 15 minutes
            },
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NEXTAUTH_DEBUG === 'true',
    trustHost: true,
};

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
    // Dynamically set NEXTAUTH_URL based on the incoming request's host header
    const baseUrl = getBaseUrl(req);
    process.env.NEXTAUTH_URL = baseUrl;

    return NextAuth(req, res, authOptions);
}
