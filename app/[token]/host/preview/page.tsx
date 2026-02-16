import { notFound } from 'next/navigation';
import { validateHostToken } from '@/utils/hostAccess';
import ParticipantPreview from '@/components/ParticipantPreview';

interface HostPreviewPageProps {
  params: {
    token: string;
  };
}

export default function HostPreviewPage({ params }: HostPreviewPageProps) {
  const { isValid, participantId } = validateHostToken(params.token);
  
  if (!isValid || !participantId) {
    notFound();
  }

  return <ParticipantPreview token={params.token} participantId={participantId} />;
}
