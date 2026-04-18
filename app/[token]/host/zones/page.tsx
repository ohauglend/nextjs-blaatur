import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import HostZoneGame from '@/components/HostZoneGame';

interface HostZonesPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function HostZonesPage({ params }: HostZonesPageProps) {
  const { token } = await params;
  const { isValid } = validateHostToken(token);
  if (!isValid) notFound();
  return <HostZoneGame token={token} />;
}
