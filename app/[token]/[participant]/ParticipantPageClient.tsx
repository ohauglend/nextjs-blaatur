'use client';

import { useState, useCallback, useRef } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { isValidParticipant, getParticipant, getParticipantTeamColor } from '@/utils/participantUtils';
import { getTeamForPhase } from '@/utils/gamePhaseUtils';
import { PACKING_LISTS } from '@/data/packing-lists';
import { useCurrentState } from '@/hooks/useCurrentState';
import { getParticipantToken } from '@/utils/secureAccess';
import ParticipantHeader from '@/components/ParticipantHeader';
import PackingList from '@/components/PackingList';
import CountdownTimer from '@/components/CountdownTimer';
import DestinationGuess from '@/components/DestinationGuess';
import VotingInterface from '@/components/VotingInterface';
import TeamActivity from '@/components/TeamActivity';
import FlightInfo from '@/components/FlightInfo';
import ThankYou from '@/components/ThankYou';
import TeamScoreHeader from '@/components/TeamScoreHeader';
import ZoneChallengePanel from '@/components/ZoneChallengePanel';
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
  const packingList = PACKING_LISTS[participantId];
  const token = getParticipantToken(participantId);

  // Zone challenge panel state
  const [selectedZone, setSelectedZone] = useState<ZoneWithClaim | null>(null);
  // Dev-mode GPS override (click map to set)
  const [devPosition, setDevPosition] = useState<{ lat: number; lng: number } | null>(null);
  // Dev-mode GPS click toggle
  const [devGpsActive, setDevGpsActive] = useState(false);
  // Ref to zone SWR mutate function (set by ZoneMap via callback)
  const zoneMutateRef = useRef<(() => void) | null>(null);

  // Fetch Day 2 assignments (polled for phase awareness)
  const { data: day2Data } = useSWR<{ assignments: Day2TeamAssignment[] }>(
    currentState === 'day-2' ? '/api/game/day2-assignments' : null,
    swrFetcher,
    { refreshInterval: 30_000 },
  );
  const day2Assignments = day2Data?.assignments ?? null;

  // Determine effective team color for the current phase
  const day2TeamColor = day2Assignments
    ? getTeamForPhase(participantId, 'day2', day2Assignments)
    : null;

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

  const handleDevPositionSet = useCallback((coords: { lat: number; lng: number }) => {
    setDevPosition(coords);
  }, []);

  const handleDevGpsToggle = useCallback(() => {
    setDevGpsActive((prev) => !prev);
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
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-lg shadow-lg hover:shadow-xl transition-all font-bold"
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
              {getParticipantTeamColor(participantId, 'day1') && (
                <>
                  <TeamScoreHeader
                    teamColor={getParticipantTeamColor(participantId, 'day1')!}
                    phase="day1"
                  />
                  <ZoneMap
                    participantId={participantId}
                    teamColor={getParticipantTeamColor(participantId, 'day1')!}
                    phase="day1"
                    onZoneTap={handleZoneTap}
                    onMutateRef={handleMutateRef}
                    onDevPositionSet={handleDevPositionSet}
                    devPosition={devPosition}
                    devGpsActive={devGpsActive}
                    onDevGpsToggle={handleDevGpsToggle}
                  />
                  {selectedZone && (
                    <ZoneChallengePanel
                      zone={selectedZone}
                      participantId={participantId}
                      teamColor={getParticipantTeamColor(participantId, 'day1')!}
                      phase="day1"
                      onClose={() => setSelectedZone(null)}
                      onClaimSuccess={handleClaimSuccess}
                      onCompleteSuccess={handleCompleteSuccess}
                      devPosition={devPosition}
                    />
                  )}
                </>
              )}
              <TeamActivity participantId={participantId} day={1} />
              <VotingInterface participantId={participantId} />
            </>
          )}

          {/* Day 2 */}
          {currentState === 'day-2' && (
            <>
              {(day2TeamColor ?? getParticipantTeamColor(participantId, 'day2')) && (
                <>
                  <TeamScoreHeader
                    teamColor={(day2TeamColor ?? getParticipantTeamColor(participantId, 'day2'))!}
                    phase="day2"
                    day2Assignments={day2Assignments}
                  />
                  <ZoneMap
                    participantId={participantId}
                    teamColor={(day2TeamColor ?? getParticipantTeamColor(participantId, 'day2'))!}
                    phase="day2"
                    onZoneTap={handleZoneTap}
                    onMutateRef={handleMutateRef}
                    onDevPositionSet={handleDevPositionSet}
                    devPosition={devPosition}
                    devGpsActive={devGpsActive}
                    onDevGpsToggle={handleDevGpsToggle}
                    day2Assignments={day2Assignments}
                  />
                  {selectedZone && (
                    <ZoneChallengePanel
                      zone={selectedZone}
                      participantId={participantId}
                      teamColor={(day2TeamColor ?? getParticipantTeamColor(participantId, 'day2'))!}
                      phase="day2"
                      onClose={() => setSelectedZone(null)}
                      onClaimSuccess={handleClaimSuccess}
                      onCompleteSuccess={handleCompleteSuccess}
                      devPosition={devPosition}
                      day2Assignments={day2Assignments}
                    />
                  )}
                </>
              )}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
