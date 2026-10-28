import { Html, Head, Main, NextScript } from "next/document";
import { getSiteConfig } from '@/config';

const config = getSiteConfig();

const fontWeightMap: Record<string, string> = {};
const primaryFonts = [config.fonts.heading, config.fonts.body].filter((f): f is string => Boolean(f));
for (const f of primaryFonts) fontWeightMap[f] = '300;400;500;600;700';
if (config.fonts.serif) fontWeightMap[config.fonts.serif] ??= '400';
if (config.fonts.mono) fontWeightMap[config.fonts.mono] ??= '400;500';

const fontFamilies = Object.entries(fontWeightMap)
    .map(([name, weights]) => `${name.replace(/ /g, '+')}:wght@${weights}`)
    .join('&family=');

const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;

export default function Document() {
    return (
        <Html lang="en" className="dark" data-scroll-behavior="smooth" style={{backgroundColor: 'var(--color-surface-primary)'}}>
            <Head>
                {/* Meta tags */}
                <meta charSet="utf-8" />
                <meta name="referrer" content="strict-origin-when-cross-origin" />
                <meta name="robots" content="index, follow" />
                <meta name="theme-color" content="#000000" />
                <link rel="icon" href="/favicon.ico" />

                {/* Google Fonts */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href={fontUrl} rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap" rel="stylesheet" />

                {/* Security headers as meta tags */}
                <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
                <meta name="referrer-policy" content="strict-origin-when-cross-origin"/>
            </Head>
            <body className="text-foreground">
            <Main/>
            <NextScript/>
            </body>
        </Html>
    );
}
