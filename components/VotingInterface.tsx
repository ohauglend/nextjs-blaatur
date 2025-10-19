'use client';

import { useState, useEffect } from 'react';
import { PARTICIPANTS } from '@/data/participants';
import Image from 'next/image';

interface VotingInterfaceProps {
  participantId: string;
}

export default function VotingInterface({ participantId }: VotingInterfaceProps) {
  const [selectedVotee, setSelectedVotee] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [submittedVote, setSubmittedVote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get all participants (including self for voting)
  const allParticipants = Object.values(PARTICIPANTS);

  // Load user's existing vote on component mount
  useEffect(() => {
    loadCurrentVote();
  }, [participantId]);

  const loadCurrentVote = async () => {
    try {
      // In production, this would fetch from API
      // For now, we'll simulate with localStorage
      const savedVote = localStorage.getItem(`vote_most_drunk_${participantId}`);
      if (savedVote) {
        setSubmittedVote(savedVote);
        setHasVoted(true);
      }
    } catch (error) {
      console.error('Error loading current vote:', error);
    }
  };

  const handleVoteeSelect = (voteeId: string) => {
    if (!hasVoted) {
      setSelectedVotee(voteeId);
      setError(null);
    }
  };

  const handleSubmitVote = async () => {
    if (!selectedVotee) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Simulate API call - in production this would be a real API call
      await new Promise(resolve => setTimeout(resolve, 800));

      // Update local state and localStorage
      setSubmittedVote(selectedVotee);
      setHasVoted(true);
      localStorage.setItem(`vote_most_drunk_${participantId}`, selectedVotee);

    } catch (error) {
      console.error('Error submitting vote:', error);
      setError('Failed to submit vote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center">
          <span className="mr-3 text-4xl">🍻</span>
          Most Drunk Last Night
        </h2>
        <p className="text-gray-600 text-lg">
          Who had the most fun with drinks yesterday?
        </p>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Voting Complete Message */}
      {hasVoted && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-sm text-center">
            <span className="mr-2">✅</span>
            You voted for: <strong>{PARTICIPANTS[submittedVote!]?.name}</strong>
          </p>
        </div>
      )}

      {/* Instruction Text */}
      {!hasVoted && (
        <div className="mb-4 text-center">
          <p className="text-gray-600 font-medium">
            Tap on a participant to select them:
          </p>
        </div>
      )}

      {/* Participant Photos - Single Column */}
      <div className="space-y-4">
        {allParticipants.map((participant) => {
          const isSelected = selectedVotee === participant.id;
          const isSubmittedVote = submittedVote === participant.id && hasVoted;
          
          return (
            <button
              key={participant.id}
              onClick={() => handleVoteeSelect(participant.id)}
              disabled={hasVoted}
              className={`w-full p-6 rounded-xl border-3 text-center transition-all transform hover:scale-102 ${
                isSubmittedVote
                  ? 'border-green-500 bg-green-50 shadow-lg'
                  : isSelected
                  ? 'border-blue-500 bg-blue-50 scale-102 shadow-lg'
                  : hasVoted
                  ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-center relative">
                {/* Centered Photo */}
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                  <Image
                    src={`/data/participants/${participant.id}/photo.svg`}
                    alt={`${participant.name}'s photo`}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>

                {/* Selection indicator positioned absolutely */}
                {(isSubmittedVote || (isSelected && !hasVoted)) && (
                  <div className="absolute -top-2 -right-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isSubmittedVote ? 'bg-green-500' : 'bg-blue-500'
                    }`}>
                      <span className="text-white text-sm font-bold">
                        {isSubmittedVote ? '✓' : '○'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Submit Button - Bottom */}
      {!hasVoted && selectedVotee && (
        <div className="mt-6">
          <button
            onClick={handleSubmitVote}
            disabled={isSubmitting}
            className="w-full px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Submitting Vote...
              </span>
            ) : (
              `Submit Vote for ${PARTICIPANTS[selectedVotee]?.name} 🗳️`
            )}
          </button>
        </div>
      )}
    </div>
  );
}