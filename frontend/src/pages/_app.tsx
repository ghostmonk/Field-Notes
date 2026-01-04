import '../styles/globals.css';
import { AppProps } from 'next/app';
import { SessionProvider } from "next-auth/react";
import Layout from "@/components/Layout";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import { configureDOMPurify } from '@/shared/utils/sanitizer';
import keepAliveService from '@/lib/keep-alive';
import { BackendWarmupBanner } from '@/components/LoadingSkeletons';

function MyApp({ Component, pageProps }: AppProps) {
    const [isWarming, setIsWarming] = useState(false);
    const [warmupFailed, setWarmupFailed] = useState(false);
    const [isSkeletonTest, setIsSkeletonTest] = useState(false);

    useEffect(() => {
        configureDOMPurify();
        
        // Check if we're in skeleton test mode
        const skeletonTestMode = window.location.search.includes('skeleton=test');
        setIsSkeletonTest(skeletonTestMode);
        
        // Start keep-alive service to prevent cold starts
        keepAliveService.start();
        
        // Initial warmup attempt
        const performWarmup = async () => {
            setIsWarming(true);
            setWarmupFailed(false);
            
            try {
                const success = await keepAliveService.warmup();
                if (!success) {
                    setWarmupFailed(true);
                }
            } catch (error) {
                console.error('Initial warmup failed:', error);
                setWarmupFailed(true);
            } finally {
                // Keep warming state if in skeleton test mode
                if (!skeletonTestMode) {
                    setIsWarming(false);
                }
            }
        };

        performWarmup();

        // Cleanup on unmount
        return () => {
            keepAliveService.stop();
        };
    }, []);

    const handleWarmupRetry = async () => {
        setIsWarming(true);
        setWarmupFailed(false);
        
        try {
            const success = await keepAliveService.warmup();
            if (!success) {
                setWarmupFailed(true);
            }
        } catch (error) {
            console.error('Warmup retry failed:', error);
            setWarmupFailed(true);
        } finally {
            // Keep warming state if in skeleton test mode
            if (!isSkeletonTest) {
                setIsWarming(false);
            }
        }
    };

    return (
        <SessionProvider session={pageProps.session}>
            <Head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes"
                />
                <meta name="author" content="Ghostmonk"/>
                <link rel="canonical" href="https://ghostmonk.com/"/>
            </Head>
            <Layout>
                <BackendWarmupBanner 
                    isWarming={isWarming}
                    warmupFailed={warmupFailed}
                    onRetry={handleWarmupRetry}
                />
                <Component {...pageProps} />
            </Layout>
        </SessionProvider>
    );
};

export default MyApp;
