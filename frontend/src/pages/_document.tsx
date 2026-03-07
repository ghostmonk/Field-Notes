import { Html, Head, Main, NextScript } from "next/document";
import siteConfig from '../../../site.config.json';

const fontFamilies = [siteConfig.fonts.heading, siteConfig.fonts.body]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map(f => f.replace(/ /g, '+'))
    .join('&family=');

const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@300;400;500;600;700&display=swap`;

export default function Document() {
    return (
        <Html lang="en" className="dark" data-theme="dark" style={{backgroundColor: '#0f172a'}}>
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

                {/* Security headers as meta tags */}
                <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
                <meta name="referrer-policy" content="strict-origin-when-cross-origin"/>
            </Head>
            <body style={{backgroundColor: '#0f172a'}} className="text-foreground">
            <Main/>
            <NextScript/>
            </body>
        </Html>
    );
}
