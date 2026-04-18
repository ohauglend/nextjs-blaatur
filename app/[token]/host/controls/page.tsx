import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import HostControls from '@/components/HostControls';

interface HostControlsPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function HostControlsPage({ params }: HostControlsPageProps) {
  const { token } = await params;
  const { isValid } = validateHostToken(token);
  
  if (!isValid) {
    notFound();
  }

  return <HostControls token={token} />;
}
