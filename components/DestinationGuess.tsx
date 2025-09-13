'use client';

import { useState } from 'react';

interface DestinationGuessProps {
  participantId: string;
}

export default function DestinationGuess({ participantId }: DestinationGuessProps) {
  const [guess, setGuess] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim()) {
      // In a real app, this would save to a backend
      setSubmitted(true);
      console.log(`${participantId} guessed: ${guess}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🤔</span>
        Guess the Destination
      </h2>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-gray-600">
            Where do you think we're going? Make your best guess!
          </p>
          
          <div>
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Enter your destination guess..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Submit My Guess 🎯
          </button>
        </form>
      ) : (
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-green-800 font-medium">Guess submitted!</p>
          <p className="text-green-600 text-sm mt-1">
            Your guess: <span className="font-medium">"{guess}"</span>
          </p>
          <p className="text-gray-600 text-sm mt-2">
            We'll see how close you were when we arrive! 😏
          </p>
        </div>
      )}
    </div>
  );
}
