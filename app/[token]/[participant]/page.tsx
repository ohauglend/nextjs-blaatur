import { notFound } from 'next/navigation';
import { parseSecureUrl } from '@/utils/secureAccess';
import ParticipantPageClient from './ParticipantPageClient';

interface PageProps {
  params: Promise<{
    token: string;
    participant: string;
  }>;
}

export async function generateStaticParams() {
  // Generate all valid token/participant combinations
  const participants = [
    { token: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', participant: 'oskar' },
    { token: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', participant: 'odd' },
    { token: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', participant: 'aasmund' },
    { token: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', participant: 'emilie' },
    { token: '6ba7b811-9dad-11d1-80b4-00c04fd430c8', participant: 'mathias' },
    { token: '01234567-89ab-cdef-0123-456789abcdef', participant: 'brage' },
    { token: 'f47ac10b-58cc-4372-a567-0e02b2c3d480', participant: 'sara' },
    { token: '550e8400-e29b-41d4-a716-446655440000', participant: 'johanna' }
  ];
  
  return participants;
}

export default async function SecureParticipantPage({ params }: PageProps) {
  const { token, participant } = await params;
  
  // Validate the token matches the participant
  const { isValid, participantId } = parseSecureUrl(token, participant);
  
  if (!isValid || !participantId) {
    notFound();
  }

  return <ParticipantPageClient participantId={participantId} />;
}
