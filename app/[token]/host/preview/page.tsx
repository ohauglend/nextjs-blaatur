import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import ParticipantPreview from '@/components/ParticipantPreview';

interface HostPreviewPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function HostPreviewPage({ params }: HostPreviewPageProps) {
  const { token } = await params;
  const { isValid, participantId } = validateHostToken(token);
  
  if (!isValid || !participantId) {
    notFound();
  }

  return <ParticipantPreview token={token} participantId={participantId} />;
}
