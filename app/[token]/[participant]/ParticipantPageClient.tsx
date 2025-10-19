'use client';

import { notFound } from 'next/navigation';
import { isValidParticipant, getParticipant } from '@/utils/participantUtils';
import { PACKING_LISTS } from '@/data/packing-lists';
import { PARTICIPANT_ASSETS, getParticipantAssets } from '@/data/participant-assets';
import { useCurrentState } from '@/hooks/useCurrentState';
import ParticipantHeader from '@/components/ParticipantHeader';
import PackingList from '@/components/PackingList';
import CountdownTimer from '@/components/CountdownTimer';
import DestinationGuess from '@/components/DestinationGuess';
import VotingInterface from '@/components/VotingInterface';
import TeamActivity from '@/components/TeamActivity';
import FlightInfo from '@/components/FlightInfo';
import ThankYou from '@/components/ThankYou';
import StateControl from '@/components/StateControl';
import HostOverview from '@/components/HostOverview';

interface ParticipantPageClientProps {
  participantId: string;
}

export default function ParticipantPageClient({ participantId }: ParticipantPageClientProps) {
  if (!isValidParticipant(participantId)) {
    notFound();
  }

  const participant = getParticipant(participantId);
  const currentState = useCurrentState();
  const packingList = PACKING_LISTS[participantId];
  const assets = getParticipantAssets(participantId);

  // Host Experience - Show everything and state control
  if (participant.role === 'host') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-red-100">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          
          {/* Participant Header */}
          <ParticipantHeader 
            participantId={participantId}
            participantName={participant.name}
          />

          {/* State Control for Hosts */}
          <StateControl currentState={currentState} />

          {/* Host Overview - All Components */}
          <HostOverview participantId={participantId} />

          {/* Development Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
              <h3 className="font-bold mb-2">🔧 Debug Info:</h3>
              <p>Current State: <span className="font-mono bg-gray-200 px-1 rounded">{currentState}</span></p>
              <p>Participant Role: <span className="font-mono bg-gray-200 px-1 rounded">{participant.role}</span></p>
              <p>Has Packing List: <span className="font-mono bg-gray-200 px-1 rounded">{packingList ? 'Yes' : 'No'}</span></p>
              <p>Has Assets: <span className="font-mono bg-gray-200 px-1 rounded">{assets ? 'Yes' : 'No'}</span></p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Guest Experience - State-based content
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        
        {/* Participant Header */}
        <ParticipantHeader 
          participantId={participantId}
          participantName={participant.name}
        />

        {/* State-based Content */}
        <div className="space-y-6">
          
          {/* Pre-Trip Phase */}
          {currentState === 'pre-trip' && (
            <>
              <CountdownTimer />
              <DestinationGuess participantId={participantId} />
            </>
          )}

          {/* Pre-Trip Packing Phase */}
          {currentState === 'pre-trip-packing' && (
            <>
              <CountdownTimer />
              <DestinationGuess participantId={participantId} />
              {packingList && <PackingList packingList={packingList} />}
            </>
          )}

          {/* Flight Phase */}
          {currentState === 'flight' && (
            <FlightInfo participantId={participantId} type="departure" />
          )}

          {/* Day 1 */}
          {currentState === 'day-1' && (
            <>
              <TeamActivity participantId={participantId} day={1} />
              <VotingInterface participantId={participantId} />
            </>
          )}

          {/* Day 2 */}
          {currentState === 'day-2' && (
            <>
              <TeamActivity participantId={participantId} day={2} />
              <VotingInterface participantId={participantId} />
            </>
          )}

          {/* Flight Home */}
          {currentState === 'flight-home' && (
            <FlightInfo participantId={participantId} type="return" />
          )}

          {/* After Trip */}
          {currentState === 'after-trip' && (
            <ThankYou participantId={participantId} />
          )}

          {/* Development Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
              <h3 className="font-bold mb-2">🔧 Debug Info:</h3>
              <p>Current State: <span className="font-mono bg-gray-200 px-1 rounded">{currentState}</span></p>
              <p>Participant Role: <span className="font-mono bg-gray-200 px-1 rounded">{participant.role}</span></p>
              <p>Has Packing List: <span className="font-mono bg-gray-200 px-1 rounded">{packingList ? 'Yes' : 'No'}</span></p>
              <p>Has Assets: <span className="font-mono bg-gray-200 px-1 rounded">{assets ? 'Yes' : 'No'}</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
