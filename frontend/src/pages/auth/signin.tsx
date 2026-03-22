import { GetServerSidePropsContext } from "next";
import { getProviders, signIn } from "next-auth/react";

interface SignInProps {
    providers: Awaited<ReturnType<typeof getProviders>>;
}

export default function SignInPage({ providers }: SignInProps) {
    if (!providers) return null;

    const devProvider = providers["dev-credentials"];
    const googleProvider = providers["google"];

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col gap-4 rounded-lg bg-[var(--color-surface)] p-8 shadow-lg">
                <h1 className="text-xl font-bold text-[var(--color-text)]">Sign in</h1>
                {googleProvider && (
                    <button
                        onClick={() => signIn(googleProvider.id, { callbackUrl: "/" })}
                        className="btn btn--primary"
                        data-testid="signin-google"
                    >
                        Sign in with Google
                    </button>
                )}
                {devProvider && (
                    <>
                        <hr className="border-[var(--color-border)]" />
                        <p className="text-sm text-[var(--color-text-secondary)]">Dev accounts</p>
                        <button
                            onClick={() => signIn(devProvider.id, { role: "admin", callbackUrl: "/" })}
                            className="btn btn--primary"
                            data-testid="signin-dev-admin"
                        >
                            Dev Admin
                        </button>
                        <button
                            onClick={() => signIn(devProvider.id, { role: "commenter", callbackUrl: "/" })}
                            className="btn btn--secondary"
                            data-testid="signin-dev-commenter"
                        >
                            Dev Commenter
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export async function getServerSideProps(_context: GetServerSidePropsContext) {
    const providers = await getProviders();
    return { props: { providers } };
}
