import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import HostDashboard from '@/components/HostDashboard';

interface HostPageProps {
  params: {
    token: string;
  };
}

export default function HostPage({ params }: HostPageProps) {
  const { isValid } = validateHostToken(params.token);
  
  if (!isValid) {
    notFound();
  }

  return <HostDashboard token={params.token} />;
}
