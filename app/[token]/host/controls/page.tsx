import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import HostControls from '@/components/HostControls';

interface HostControlsPageProps {
  params: {
    token: string;
  };
}

export default function HostControlsPage({ params }: HostControlsPageProps) {
  const { isValid } = validateHostToken(params.token);
  
  if (!isValid) {
    notFound();
  }

  return <HostControls token={params.token} />;
}
