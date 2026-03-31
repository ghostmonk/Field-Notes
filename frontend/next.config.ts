import type { NextConfig } from "next";

// Parse allowed dev origins from environment variable (comma-separated)
const allowedDevOrigins = process.env.NODE_ENV === 'development'
    ? (process.env.ALLOWED_DEV_ORIGINS?.split(',').filter(Boolean) || [])
    : [];

const nextConfig: NextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    outputFileTracingRoot: __dirname,

    // Only apply in development - origins configured via ALLOWED_DEV_ORIGINS env var
    ...(allowedDevOrigins.length > 0 && { allowedDevOrigins }),

    typescript: {
        ignoreBuildErrors: false,
    },

    // Note: ESLint runs separately via `npm run lint`, not during Next.js build
    // (Next.js 16 removed the eslint config option)

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'storage.googleapis.com',
            },
        ],
    },

    experimental: {
        serverActions: {
            bodySizeLimit: '4mb'
        },
    },

    // Exclude cheerio from client bundle (server-side only for HTML parsing).
    // Turbopack uses resolveAlias with { browser: '' } to stub out the module on the client side,
    // equivalent to webpack's resolve.fallback: { cheerio: false }.
    turbopack: {
        resolveAlias: {
            cheerio: { browser: '' },
        },
    },
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                cheerio: false,
            };
        }
        return config;
    },


    // Add rewrites to proxy static uploads to backend API based on explicit env var
    async rewrites() {
        // For Docker: backend:5001, for local dev: localhost:5001
        // BACKEND_URL should be specifically set for Docker environment
        const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.ghostmonk.com';
        
        // Log the backend URL for debugging
        console.log('Backend URL for uploads proxy:', backendUrl);
        
        return [
            {
                source: '/uploads/:path*',
                destination: `${backendUrl}/uploads/:path*`,
            },
        ];
    },
    async headers() {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const isDev = process.env.NODE_ENV === 'development';
        const devSources = isDev ? 'http://localhost:5001' : '';
        const scriptSrc = `'self' 'unsafe-inline' ${apiUrl} https://challenges.cloudflare.com`;

        const csp_value = `
                            default-src 'self';
                            script-src ${scriptSrc};
                            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
                            img-src 'self' data: blob: ${apiUrl} ${devSources} https://storage.googleapis.com https://authjs.dev;
                            media-src 'self' data: blob: ${apiUrl} ${devSources} https://storage.googleapis.com;
                            connect-src 'self' data: ${apiUrl} ${devSources} https://accounts.google.com https://*.googleapis.com https://www.google.com https://challenges.cloudflare.com;
                            font-src 'self' https://fonts.gstatic.com;
                            frame-src 'self' https://accounts.google.com https://*.google.com https://challenges.cloudflare.com;
                        `.replace(/\n/g, '').trim();
        return [
            {
                source: "/api/:path*",
                headers: [
                    {
                        key: "Content-Security-Policy",
                        value: csp_value,
                    },
                    {
                        key: "Access-Control-Allow-Origin",
                        value: "https://ghostmonk.com",
                    },
                    {
                        key: "Access-Control-Allow-Credentials",
                        value: "true",
                    },
                    {
                        key: "Access-Control-Allow-Methods",
                        value: "GET, POST, PUT, DELETE, OPTIONS",
                    },
                    {
                        key: "Access-Control-Allow-Headers",
                        value: "Content-Type, Authorization",
                    },
                ],
            },
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "Content-Security-Policy",
                        value: csp_value,
                    }
                ]
            }
        ];
    },
};

export default nextConfig;
