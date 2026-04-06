import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import HostZoneGame from '@/components/HostZoneGame';

interface HostZonesPageProps {
  params: {
    token: string;
  };
}

export default function HostZonesPage({ params }: HostZonesPageProps) {
  const { isValid } = validateHostToken(params.token);
  if (!isValid) notFound();
  return <HostZoneGame token={params.token} />;
}
