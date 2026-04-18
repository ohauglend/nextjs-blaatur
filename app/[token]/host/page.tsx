import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import HostDashboard from '@/components/HostDashboard';

interface HostPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function HostPage({ params }: HostPageProps) {
  const { token } = await params;
  const { isValid } = validateHostToken(token);
  
  if (!isValid) {
    notFound();
  }

  return <HostDashboard token={token} />;
}
