import { notFound } from 'next/navigation';
import Link from 'next/link';
import { validateHostToken } from '@/utils/hostAccess';
import HostNavigation from '@/components/HostNavigation';
import ChallengeEditor from '@/components/ChallengeEditor';

interface HostChallengesPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function HostChallengesPage({ params }: HostChallengesPageProps) {
  const { token } = await params;
  const { isValid } = validateHostToken(token);
  if (!isValid) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-red-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🗺️ Zone Game</h1>
          <p className="text-gray-600">Challenge Editor</p>
        </div>

        <HostNavigation token={token} currentPage="zones" />

        <div className="mb-4">
          <Link
            href={`/${token}/host/zones`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Back to Zone Game
          </Link>
        </div>

        <ChallengeEditor token={token} />
      </div>
    </div>
  );
}
