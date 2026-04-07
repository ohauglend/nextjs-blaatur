'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import type { ZoneWithClaim, TeamColor, Day2TeamAssignment } from '@/types/zones';
import { getMockLocation, type LocationCoords } from '@/utils/locationService';
import { mapDay1ColorToDay2 } from '@/utils/gamePhaseUtils';

// -- Color mapping -----------------------------------------------------------

const TEAM_COLORS: Record<TeamColor, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  blue: '#3b82f6',
  green: '#22c55e',
};

const TEAM_EMOJIS: Record<TeamColor, string> = {
  red: '🔴',
  yellow: '🟡',
  blue: '🔵',
  green: '🟢',
};

// -- Types for API responses -------------------------------------------------

interface ClaimSuccessResponse {
  success: true;
  challenge: {
    id: number;
    text: string;
    type: string;
    participant_scope: 'team' | 'one';
    zone_name: string;
  } | null;
}

interface ClaimErrorResponse {
  error: string;
  distance_m?: number;
  team_color?: TeamColor;
}

// -- Props -------------------------------------------------------------------

interface ZoneChallengePanelProps {
  zone: ZoneWithClaim;
  participantId: string;
  teamColor: TeamColor;
  /** True once the host has triggered the after-lunch merge — unlocks stealing and switches to after-lunch challenges */
  afterLunch: boolean;
  onClose: () => void;
  onClaimSuccess: () => void;
  onCompleteSuccess: () => void;
  /** Manual GPS position set by participant on map (used when GPS override is active) */
  manualPosition?: { lat: number; lng: number } | null;
  /** Merged team assignments — needed for steal mechanic after lunch */
  day2Assignments?: Day2TeamAssignment[] | null;
}

// -- Helper: get fresh GPS position ------------------------------------------

function getFreshPosition(): Promise<LocationCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}

// -- Component ---------------------------------------------------------------

export default function ZoneChallengePanel({
  zone,
  participantId,
  teamColor,
  afterLunch,
  onClose,
  onClaimSuccess,
  onCompleteSuccess,
  manualPosition,
  day2Assignments,
}: ZoneChallengePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [stealing, setStealing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After a successful claim we store the challenge returned by the API
  const [freshChallenge, setFreshChallenge] = useState<{
    text: string;
    type: string;
    participant_scope: 'team' | 'one';
  } | null>(null);
  // Track whether this was a steal (so we show the challenge but no re-steal)
  const [wasStolen, setWasStolen] = useState(false);
  // Track local completion state for optimistic UI
  const [localCompleted, setLocalCompleted] = useState(false);

  // When the host has enabled GPS override, use the participant's manually placed
  // map pin instead of requesting real GPS coordinates.
  const { data: gpsOverrideData } = useSWR<{ active: boolean }>(
    '/api/dev/mock-location',
    (url: string) => fetch(url).then((r) => r.json()),
  );
  const useManualGps = gpsOverrideData?.active === true;
  console.log('[ZoneChallengePanel] useManualGps (gpsOverrideData?.active):', useManualGps);

  // Slide-up animation on mount
  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(onClose, 300); // wait for slide-down animation
  }, [onClose]);

  // -- Determine panel state -------------------------------------------------

  const claim = zone.claim;
  // Show after-lunch challenge text when afterLunch is active
  const challenge = (afterLunch && zone.afterLunchChallenge) ? zone.afterLunchChallenge : zone.challenge;

  // After lunch, determine "own team" by mapping through merged day2 assignments
  let isOwnTeam = claim?.team_color === teamColor;
  if (afterLunch && claim && day2Assignments && day2Assignments.length > 0) {
    const claimDay2Color = mapDay1ColorToDay2(claim.team_color, day2Assignments) ?? claim.team_color;
    isOwnTeam = claimDay2Color === teamColor;
  }

  const isCompleted = localCompleted || (claim?.completed === true);
  const isStealLocked = claim?.steal_locked === true;

  // Panel states
  const isUnclaimed = !claim && !freshChallenge;
  const isOwnNotCompleted = (isOwnTeam && !isCompleted) || (!!freshChallenge && !wasStolen);
  const isOwnCompleted = isOwnTeam && isCompleted && !freshChallenge;
  const isRivalClaimed = !!claim && !isOwnTeam && !freshChallenge;

  // After-lunch steal availability
  const canSteal = afterLunch && isRivalClaimed && !isStealLocked && !isCompleted;
  // After a successful steal, show challenge (wasStolen + freshChallenge)
  const showStolenChallenge = wasStolen && !!freshChallenge;

  // Active challenge text to display
  const displayChallenge = freshChallenge ?? (challenge ? {
    text: challenge.text,
    type: challenge.type,
    participant_scope: challenge.participant_scope,
  } : null);

  // -- Claim handler ---------------------------------------------------------

  const handleClaim = async () => {
    setClaiming(true);
    setError(null);

    try {
      let coords: LocationCoords;
      if (useManualGps) {
        coords = manualPosition ?? getMockLocation(participantId);
        console.log('[ZoneChallengePanel] using manual GPS coords:', coords, '(manualPosition was:', manualPosition, ')');
      } else {
        console.log('[ZoneChallengePanel] useManualGps=false, requesting real GPS...');
        coords = await getFreshPosition();
        console.log('[ZoneChallengePanel] real GPS coords:', coords);
      }

      const res = await fetch(`/api/zones/${zone.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          team_color: teamColor,
          after_lunch: afterLunch,
          lat: coords.lat,
          lng: coords.lng,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as ClaimErrorResponse;
        if (errData.error === 'too_far') {
          setError(`You're ${errData.distance_m}m away — get closer!`);
        } else if (errData.error === 'already_claimed') {
          setError(`Just claimed by ${TEAM_EMOJIS[errData.team_color!] ?? ''} ${errData.team_color} team`);
          onClaimSuccess(); // trigger refetch so map updates
        } else {
          setError(errData.error ?? 'Failed to claim zone');
        }
        return;
      }

      const data = (await res.json()) as ClaimSuccessResponse;
      if (data.challenge) {
        setFreshChallenge({
          text: data.challenge.text,
          type: data.challenge.type,
          participant_scope: data.challenge.participant_scope,
        });
      }
      onClaimSuccess();
    } catch {
      setError('Failed to unlock zone. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  // -- Steal handler ---------------------------------------------------------

  const handleSteal = async () => {
    setStealing(true);
    setError(null);

    try {
      let coords: LocationCoords;
      if (useManualGps) {
        coords = manualPosition ?? getMockLocation(participantId);
      } else {
        coords = await getFreshPosition();
      }

      const res = await fetch(`/api/zones/${zone.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          team_color: teamColor,
          after_lunch: true,
          lat: coords.lat,
          lng: coords.lng,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as ClaimErrorResponse;
        if (errData.error === 'too_far') {
          setError(`You're ${errData.distance_m}m away — get closer!`);
        } else if (errData.error === 'steal_locked') {
          setError('This zone has already been stolen and is locked.');
        } else if (errData.error === 'completed_immune') {
          setError('This zone is completed and immune to stealing.');
        } else if (errData.error === 'own_team') {
          setError('You cannot steal your own team\'s zone.');
        } else {
          setError(errData.error ?? 'Failed to steal zone');
        }
        return;
      }

      const data = (await res.json()) as ClaimSuccessResponse;
      if (data.challenge) {
        setFreshChallenge({
          text: data.challenge.text,
          type: data.challenge.type,
          participant_scope: data.challenge.participant_scope,
        });
      }
      setWasStolen(true);
      onClaimSuccess();
    } catch {
      setError('Failed to steal zone. Please try again.');
    } finally {
      setStealing(false);
    }
  };

  // -- Complete handler ------------------------------------------------------

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/zones/${zone.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          team_color: teamColor,
          phase: 'day1',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        if (errData.error === 'already_completed') {
          setLocalCompleted(true);
        } else {
          setError(errData.error ?? 'Failed to complete zone');
        }
        return;
      }

      setLocalCompleted(true);
      onCompleteSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  // -- Render ----------------------------------------------------------------

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-[2000] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[2001] bg-white rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pb-6">
          {/* Zone name */}
          <h2 className="text-xl font-bold text-gray-900 mb-3">{zone.name}</h2>

          {/* Error message */}
          {error && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* -- Unclaimed state -- */}
          {isUnclaimed && (
            <div>
              <p className="text-gray-600 text-sm mb-4">This zone is unclaimed. Get close and unlock it!</p>
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {claiming ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Unlocking…
                  </>
                ) : (
                  '🔓 Unlock Zone'
                )}
              </button>
            </div>
          )}

          {/* -- Own team, challenge visible, not completed -- */}
          {isOwnNotCompleted && !isCompleted && displayChallenge && (
            <div>
              <ChallengeCard challenge={displayChallenge} teamColor={teamColor} />
              <p className="text-xs text-gray-500 mt-3 mb-3">
                Share photo proof in the group chat before marking complete.
              </p>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="w-full h-12 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-green-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {completing ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Completing…
                  </>
                ) : (
                  '✅ Mark Complete'
                )}
              </button>
            </div>
          )}

          {/* -- Own team, completed -- */}
          {(isOwnCompleted || (isOwnNotCompleted && isCompleted)) && displayChallenge && (
            <div>
              <ChallengeCard challenge={displayChallenge} teamColor={teamColor} />
              <div className="mt-4 flex items-center justify-center gap-2 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 font-semibold">
                ✓ Completed
              </div>
            </div>
          )}

          {/* -- Own team, completed but no challenge data -- */}
          {isOwnCompleted && !displayChallenge && (
            <div className="flex items-center justify-center gap-2 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 font-semibold">
              ✓ Completed
            </div>
          )}

          {/* -- Rival team claimed -- */}
          {isRivalClaimed && !showStolenChallenge && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-4 h-4 rounded-full inline-block"
                  style={{ backgroundColor: TEAM_COLORS[claim.team_color] }}
                />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {TEAM_EMOJIS[claim.team_color]} {claim.team_color} team
                </span>
              </div>

              {/* Day 2 steal button */}
              {canSteal && (
                <button
                  onClick={handleSteal}
                  disabled={stealing}
                  className="w-full h-12 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {stealing ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Stealing…
                    </>
                  ) : (
                    '⚔️ Steal Zone'
                  )}
                </button>
              )}
              {/* After lunch: locked after steal */}
              {afterLunch && isStealLocked && (
                <div className="px-3 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 text-sm font-medium text-center">
                  🔒 Stolen — locked
                </div>
              )}
              {!afterLunch && (
                <button
                  disabled
                  className="w-full h-12 bg-gray-200 text-gray-500 font-semibold rounded-xl cursor-not-allowed"
                >
                  Already Claimed
                </button>
              )}
            </div>
          )}

          {/* -- Post-steal: show challenge for completing -- */}
          {showStolenChallenge && freshChallenge && (
            <div>
              <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm font-semibold">
                ⚔️ Zone stolen! Complete the challenge to earn your point.
              </div>
              <ChallengeCard challenge={freshChallenge} teamColor={teamColor} />
              <p className="text-xs text-gray-500 mt-3 mb-3">
                Share photo proof in the group chat before marking complete.
              </p>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="w-full h-12 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-green-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {completing ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Completing…
                  </>
                ) : (
                  '✅ Mark Complete'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// -- Sub-component: Challenge Card -------------------------------------------

function ChallengeCard({
  challenge,
  teamColor,
}: {
  challenge: { text: string; type: string; participant_scope: 'team' | 'one' };
  teamColor: TeamColor;
}) {
  const typeBadge = challenge.type === 'geography' ? '📍 Location-specific' : '🍺 Generic';
  const scopeBadge = challenge.participant_scope === 'team' ? '👥 Whole team' : '☝️ Pick one';

  return (
    <div className="mb-2">
      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: TEAM_COLORS[teamColor] }}
        >
          {typeBadge}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {scopeBadge}
        </span>
      </div>

      {/* Challenge text */}
      <p className="text-lg text-gray-900 leading-relaxed">{challenge.text}</p>
    </div>
  );
}
