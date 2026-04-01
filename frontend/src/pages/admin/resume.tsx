import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/admin', permanent: true },
});

export default function ResumeRedirect() {
  return null;
}
