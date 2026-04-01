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
    if (status !== "loading" && (!session || session.user?.role !== "admin")) {
      router.replace("/");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="admin-theme flex h-dvh items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session || session.user?.role !== "admin") {
    return null;
  }

  return (
    <>
      <Head>
        <title>Master Control</title>
      </Head>
      <AdminLayout />
    </>
  );
};

AdminPage.getLayout = (page: ReactElement) => page;

export default AdminPage;
