'use client';

import { useState, useEffect } from 'react';

interface DestinationGuess {
  id: number;
  participant_id: string;
  guess: string;
  created_at: string;
}

interface DestinationGuessProps {
  participantId: string;
}

export default function DestinationGuess({ participantId }: DestinationGuessProps) {
  const [guess, setGuess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousGuesses, setPreviousGuesses] = useState<DestinationGuess[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load previous guesses on component mount
  useEffect(() => {
    loadPreviousGuesses();
  }, [participantId]);

  const loadPreviousGuesses = async () => {
    try {
      const response = await fetch(`/api/destination-guesses/${participantId}`);
      if (response.ok) {
        const result = await response.json();
        setPreviousGuesses(result.data || []);
      }
    } catch (error) {
      console.error('Error loading previous guesses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/destination-guesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId,
          guess: guess.trim()
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Success! Clear the form and reload guesses
        setGuess('');
        await loadPreviousGuesses();
      } else {
        // Handle specific error cases
        if (response.status === 503) {
          setError('Database not yet configured. This feature will work after deployment to Vercel.');
        } else {
          setError(result.error || 'Failed to submit guess');
        }
      }
    } catch (error) {
      console.error('Error submitting guess:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🤔</span>
        Guess the Destination
      </h2>

      {/* Guess Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <p className="text-gray-600">
          Where do you think we're going? Make your best guess!
        </p>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        <div>
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Enter your destination guess..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={isSubmitting}
            maxLength={500}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !guess.trim()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Submitting...
            </span>
          ) : (
            'Submit My Guess 🎯'
          )}
        </button>
      </form>

      {/* Previous Guesses */}
      {previousGuesses.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <span className="mr-2">📝</span>
            Your Previous Guesses ({previousGuesses.length})
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {previousGuesses.map((prevGuess, index) => (
              <div key={prevGuess.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <span className="font-medium">"{prevGuess.guess}"</span>
                <span className="text-gray-500 text-xs">
                  {new Date(prevGuess.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            You can make multiple guesses! We'll see how close you were when we arrive 😏
          </p>
        </div>
      )}
    </div>
  );
}
