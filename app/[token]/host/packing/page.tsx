import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import HostPackingPage from '@/components/HostPackingPage';

interface HostPackingPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function HostPackingRoute({ params }: HostPackingPageProps) {
  const { token } = await params;
  const { isValid } = validateHostToken(token);

  if (!isValid) {
    notFound();
  }

  return <HostPackingPage token={token} />;
}
