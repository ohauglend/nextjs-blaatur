import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import HostPackingPage from '@/components/HostPackingPage';

interface HostPackingPageProps {
  params: {
    token: string;
  };
}

export default function HostPackingRoute({ params }: HostPackingPageProps) {
  const { isValid } = validateHostToken(params.token);

  if (!isValid) {
    notFound();
  }

  return <HostPackingPage token={params.token} />;
}
