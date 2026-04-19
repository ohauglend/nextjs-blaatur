import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import HostItineraryPage from '@/components/HostItineraryPage';

interface HostItineraryRouteProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function HostItineraryRoute({ params }: HostItineraryRouteProps) {
  const { token } = await params;
  const { isValid } = validateHostToken(token);

  if (!isValid) {
    notFound();
  }

  return <HostItineraryPage token={token} />;
}
