'use client';

import { useState, useCallback, useRef } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { isValidParticipant, getParticipant, getParticipantTeamColor } from '@/utils/participantUtils';
import { getTeamForPhase } from '@/utils/gamePhaseUtils';
import { useCurrentState } from '@/hooks/useCurrentState';
import { getParticipantToken } from '@/utils/secureAccess';
import ParticipantHeader from '@/components/ParticipantHeader';
import PackingList from '@/components/PackingList';
import CountdownTimer from '@/components/CountdownTimer';
import MeetupSpot from '@/components/MeetupSpot';
import DestinationGuess from '@/components/DestinationGuess';
import FloatingHeadsVote from '@/components/FloatingHeadsVote';
import TeamActivity from '@/components/TeamActivity';
import FlightInfo from '@/components/FlightInfo';
import ThankYou from '@/components/ThankYou';
import TeamScoreHeader from '@/components/TeamScoreHeader';
import ZoneChallengePanel from '@/components/ZoneChallengePanel';
import ItineraryView from '@/components/ItineraryView';
import type { ZoneWithClaim, Day2TeamAssignment } from '@/types/zones';

const ZoneMap = dynamic(() => import('@/components/ZoneMap'), { ssr: false });

const swrFetcher = (url: string) => fetch(url).then((r) => r.json());

interface ParticipantPageClientProps {
  participantId: string;
}

export default function ParticipantPageClient({ participantId }: ParticipantPageClientProps) {
  if (!isValidParticipant(participantId)) {
    notFound();
  }

  const participant = getParticipant(participantId);
  const currentState = useCurrentState();
  const token = getParticipantToken(participantId);

  // Zone challenge panel state
  const [selectedZone, setSelectedZone] = useState<ZoneWithClaim | null>(null);
  // Manual GPS position — set by participant clicking the map (when GPS override is active)
  const [manualPosition, setManualPosition] = useState<{ lat: number; lng: number } | null>(null);
  // Whether the participant has turned on click-to-pin mode on the map
  const [manualGpsActive, setManualGpsActive] = useState(false);
  // Ref to zone SWR mutate function (set by ZoneMap via callback)
  const zoneMutateRef = useRef<(() => void) | null>(null);

  // Fetch Day 2 assignments during day-1 (steal phase is triggered inside day-1)
  const { data: day2Data } = useSWR<{ assignments: Day2TeamAssignment[] }>(
    currentState === 'day-1' ? '/api/game/day2-assignments' : null,
    swrFetcher,
    { refreshInterval: 30_000 },
  );
  const day2Assignments = day2Data?.assignments ?? null;

  // Once the host triggers the merge, the after-lunch steal phase begins inside day-1
  const afterLunch = day2Assignments != null && day2Assignments.length > 0;

  // Effective team color: after lunch use merged day2 color, before lunch use day1 color
  const effectiveTeamColor = afterLunch
    ? getTeamForPhase(participantId, 'day2', day2Assignments!)
    : getParticipantTeamColor(participantId, 'day1');

  const handleZoneTap = useCallback((zone: ZoneWithClaim) => {
    setSelectedZone(zone);
  }, []);

  const handleMutateRef = useCallback((mutate: () => void) => {
    zoneMutateRef.current = mutate;
  }, []);

  const handleClaimSuccess = useCallback(() => {
    zoneMutateRef.current?.();
  }, []);

  const handleCompleteSuccess = useCallback(() => {
    zoneMutateRef.current?.();
  }, []);

  const handleManualPositionSet = useCallback((coords: { lat: number; lng: number }) => {
    setManualPosition(coords);
  }, []);

  const handleManualGpsToggle = useCallback(() => {
    setManualGpsActive((prev) => !prev);
  }, []);

  // All participants see state-based content
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        
        {/* Participant Header */}
        <ParticipantHeader 
          participantId={participantId}
          participantName={participant.name}
        />

        {/* Link to Host Interface (only for hosts) */}
        {participant.role === 'host' && token && (
          <div className="mb-6">
            <Link
              href={`/${token}/host`}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 rounded-lg shadow-lg hover:shadow-xl transition-all font-bold"
            >
              <span className="mr-2">👑</span>
              Go to Host Interface
              <span className="ml-2">→</span>
            </Link>
          </div>
        )}

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
              <PackingList participantId={participantId} />
            </>
          )}

          {/* Meet-up Phase */}
          {currentState === 'meetup' && (
            <>
              <CountdownTimer />
              <MeetupSpot participantId={participantId} />
              <PackingList participantId={participantId} />
              <DestinationGuess participantId={participantId} />
            </>
          )}

          {/* Flight Phase */}
          {currentState === 'flight' && (
            <>
              <FlightInfo participantId={participantId} type="departure" />
              <ItineraryView type="summary" />
            </>
          )}

          {/* Day 1 Morning Vote — floating-head sliding-scale votes */}
          {currentState === 'day-1-voting' && (
            <FloatingHeadsVote participantId={participantId} />
          )}

          {/* Day 1 — includes steal phase once host triggers the merge */}
          {currentState === 'day-1' && (
            <>
              {effectiveTeamColor && (
                <>
                  <TeamScoreHeader
                    teamColor={effectiveTeamColor}
                    afterLunch={afterLunch}
                    day2Assignments={afterLunch ? day2Assignments : undefined}
                  />
                  <ZoneMap
                    participantId={participantId}
                    teamColor={effectiveTeamColor}
                    afterLunch={afterLunch}
                    onZoneTap={handleZoneTap}
                    onMutateRef={handleMutateRef}
                    onManualPositionSet={handleManualPositionSet}
                    manualPosition={manualPosition}
                    manualGpsActive={manualGpsActive}
                    onManualGpsToggle={handleManualGpsToggle}
                    day2Assignments={afterLunch ? day2Assignments : undefined}
                  />
                  {selectedZone && (
                    <ZoneChallengePanel
                      zone={selectedZone}
                      participantId={participantId}
                      teamColor={effectiveTeamColor}
                      afterLunch={afterLunch}
                      onClose={() => setSelectedZone(null)}
                      onClaimSuccess={handleClaimSuccess}
                      onCompleteSuccess={handleCompleteSuccess}
                      manualPosition={manualPosition}
                      day2Assignments={afterLunch ? day2Assignments : undefined}
                    />
                  )}
                </>
              )}
              <TeamActivity participantId={participantId} day={1} />
              <ItineraryView type="day-1" collapsible />
            </>
          )}

          {/* Day 2 — show day 2 itinerary only */}
          {currentState === 'day-2' && (
            <ItineraryView type="day-2" />
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
