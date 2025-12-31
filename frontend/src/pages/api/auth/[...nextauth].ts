import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
                // Uses timeout and graceful degradation - auth succeeds even if backend is down
                try {
                    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

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
                        // Backend returned error - user can still auth but with limited permissions
                        console.warn(`Backend returned ${response.status} for /me - user will have no role assigned`);
                    }
                } catch (error) {
                    // Network error or timeout - auth still succeeds with degraded functionality
                    if (error instanceof Error && error.name === 'AbortError') {
                        console.warn('Backend /me request timed out - user will have no role assigned');
                    } else {
                        console.warn('Failed to fetch user info from backend:', error);
                    }
                    // Don't throw - allow auth to proceed without role/userId
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
};

export default NextAuth(authOptions);
