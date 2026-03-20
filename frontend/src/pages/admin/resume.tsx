import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ResumeForm, DownloadButtons } from '@/modules/resume';
import { useResumeEditor } from '@/modules/resume';
import { useConfirm } from '@/components/ConfirmDialog';

export default function AdminResumePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const editor = useResumeEditor();
  const confirm = useConfirm();

  useEffect(() => {
    if (status !== 'loading' && (!session || session.user?.role !== 'admin')) {
      router.replace('/');
    }
  }, [status, session, router]);

  if (status === 'loading' || !session || session.user?.role !== 'admin') {
    return null;
  }

  const handleDelete = async () => {
    if (!editor.isExisting) return;
    const confirmed = await confirm({
      title: 'Delete Resume',
      message: 'Delete your resume? This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      await editor.handleDelete();
    }
  };

  return (
    <>
      <Head>
        <title>Resume Builder</title>
      </Head>
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Resume Builder</h1>
          <div className="flex gap-3 items-center">
            <DownloadButtons resume={editor.resume} />
            {editor.isExisting && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        <ResumeForm editor={editor} />
      </div>
    </>
  );
}
