import '../styles/globals.css';
import '../styles/editor.css';
// Template CSS — must match template.active in site.config.json
// To switch templates: change the import path AND the config value, then rebuild
import '../templates/default/index.css';
import { AppProps } from 'next/app';
import { SessionProvider } from "next-auth/react";
import { Layout } from "@/layout";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { NetworkStatus } from "@/components/NetworkStatus";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useImageZoom } from "@/hooks/useImageZoom";
import { useRouter } from 'next/router';
import Head from "next/head";
import { getSiteConfig } from '@/config';
import { configureDOMPurify } from '@/shared/utils/sanitizer';
import keepAliveService from '@/shared/lib/keep-alive';
import { BackendWarmupBanner } from '@/components/LoadingSkeletons';

function SessionGuard({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.error === 'RefreshTokenError') {
            signOut();
        }
    }, [session?.error]);

    return <>{children}</>;
}

function MyApp({ Component, pageProps }: AppProps) {
    const mainRef = useRef<HTMLDivElement>(null);
    useImageZoom(mainRef);
    const [isWarming, setIsWarming] = useState(false);
    const [warmupFailed, setWarmupFailed] = useState(false);
    const [isSkeletonTest, setIsSkeletonTest] = useState(false);

    const doWarmup = useCallback(async (skeletonTest: boolean) => {
        setIsWarming(true);
        setWarmupFailed(false);

        try {
            const success = await keepAliveService.warmup();
            if (!success) {
                setWarmupFailed(true);
            }
        } catch (error) {
            console.error('Warmup failed:', error);
            setWarmupFailed(true);
        } finally {
            if (!skeletonTest) {
                setIsWarming(false);
            }
        }
    }, []);

    useEffect(() => {
        configureDOMPurify();

        // Check if we're in skeleton test mode
        const skeletonTestMode = window.location.search.includes('skeleton=test');
        setIsSkeletonTest(skeletonTestMode);

        // Start keep-alive service to prevent cold starts
        keepAliveService.start();

        // Initial warmup attempt
        doWarmup(skeletonTestMode);

        // Cleanup on unmount
        return () => {
            keepAliveService.stop();
        };
    }, [doWarmup]);

    const router = useRouter();

    useEffect(() => {
        const handleRouteChange = () => {
            const main = document.getElementById('main-content');
            if (main) {
                main.focus({ preventScroll: true });
            }
        };
        router.events.on('routeChangeComplete', handleRouteChange);
        return () => router.events.off('routeChangeComplete', handleRouteChange);
    }, [router]);

    const handleWarmupRetry = useCallback(async () => {
        await doWarmup(isSkeletonTest);
    }, [doWarmup, isSkeletonTest]);

    return (
        <SessionProvider session={pageProps.session} refetchInterval={4 * 60}>
            <SessionGuard>
                <ToastProvider>
                    <ConfirmProvider>
                        <Head>
                            <meta
                                name="viewport"
                                content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes"
                            />
                            <meta name="author" content={getSiteConfig().site.author}/>
                            <link rel="canonical" href="https://ghostmonk.com/"/>
                        </Head>
                        <NetworkStatus />
                        <Layout>
                            <BackendWarmupBanner
                                isWarming={isWarming}
                                warmupFailed={warmupFailed}
                                onRetry={handleWarmupRetry}
                            />
                            <div ref={mainRef}>
                                <Component {...pageProps} />
                            </div>
                        </Layout>
                    </ConfirmProvider>
                </ToastProvider>
            </SessionGuard>
        </SessionProvider>
    );
};

export default MyApp;
