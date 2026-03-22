import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import { REFRESH_TOKEN_ERROR } from "@/shared/lib/auth";

async function refreshAccessToken(token: JWT): Promise<JWT> {
    try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken!,
            }),
        });

        const refreshed = await response.json();

        if (!response.ok) {
            throw new Error(refreshed.error || "Token refresh failed");
        }

        return {
            ...token,
            accessToken: refreshed.access_token,
            accessTokenExpires: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
            // Google may return a new refresh token; keep the old one if not
            refreshToken: refreshed.refresh_token ?? token.refreshToken,
            error: undefined,
        };
    } catch (error) {
        console.error("Error refreshing access token:", error);
        return { ...token, error: REFRESH_TOKEN_ERROR };
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "openid email profile",
                    access_type: "offline",
                    // "consent" required — Google only guarantees refresh_token with it
                    prompt: "consent",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Initial sign-in: store tokens and expiry
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.accessTokenExpires = account.expires_at
                    ? account.expires_at * 1000
                    : Date.now() + 3600 * 1000;

                // Fetch user info from backend to get role and ID
                try {
                    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);

                    const response = await fetch(`${backendUrl}/me`, {
                        headers: {
                            'Authorization': `Bearer ${account.access_token}`,
                        },
                        signal: controller.signal,
                    });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const userInfo = await response.json();
                        token.userId = userInfo.id;
                        token.userRole = userInfo.role;
                    } else {
                        console.warn(`Backend returned ${response.status} for /me - user will have no role assigned`);
                    }
                } catch (error) {
                    if (error instanceof Error && error.name === 'AbortError') {
                        console.warn('Backend /me request timed out - user will have no role assigned');
                    } else {
                        console.warn('Failed to fetch user info from backend:', error);
                    }
                }

                return token;
            }

            // Subsequent requests: check if access token needs refresh
            if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
                return token;
            }

            // Token expired — attempt refresh
            if (token.refreshToken) {
                return refreshAccessToken(token);
            }

            // No refresh token available
            return { ...token, error: REFRESH_TOKEN_ERROR };
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken as string;
            session.error = token.error as string | undefined;
            if (session.user) {
                session.user.id = token.userId as string;
                session.user.role = token.userRole as 'admin' | 'commenter';
            }
            return session;
        },
    },
    cookies: {
        state: {
            name: "next-auth.state",
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                domain: process.env.NODE_ENV === 'production' ? '.ghostmonk.com' : undefined,
                maxAge: 900,
            },
        },
        pkceCodeVerifier: {
            name: "next-auth.pkce.code_verifier",
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                domain: process.env.NODE_ENV === 'production' ? '.ghostmonk.com' : undefined,
                maxAge: 900,
            },
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NEXTAUTH_DEBUG === 'true',
};

export default NextAuth(authOptions);
