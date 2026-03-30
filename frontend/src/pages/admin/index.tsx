import { ReactElement } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { AdminLayout } from "@/modules/admin/components/AdminLayout";
import { NextPageWithLayout } from "@/shared/types/page";
import Head from "next/head";

const AdminPage: NextPageWithLayout = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div
        className="admin-theme flex h-dvh items-center justify-center"
        style={{ backgroundColor: "var(--background)" }}
      >
        <p style={{ color: "var(--muted-foreground)" }}>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Command Center</title>
      </Head>
      <AdminLayout />
    </>
  );
};

AdminPage.getLayout = (page: ReactElement) => page;

export default AdminPage;
