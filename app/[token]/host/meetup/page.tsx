import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import HostMeetupPage from '@/components/HostMeetupPage';

interface HostMeetupPageProps {
  params: {
    token: string;
  };
}

export default function HostMeetupRoute({ params }: HostMeetupPageProps) {
  const { isValid } = validateHostToken(params.token);

  if (!isValid) {
    notFound();
  }

  return <HostMeetupPage token={params.token} />;
}
