import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import HostMeetupPage from '@/components/HostMeetupPage';

interface HostMeetupPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function HostMeetupRoute({ params }: HostMeetupPageProps) {
  const { token } = await params;
  const { isValid } = validateHostToken(token);

  if (!isValid) {
    notFound();
  }

  return <HostMeetupPage token={token} />;
}
