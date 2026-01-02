'use client';

import { useState, useEffect } from 'react';
import CitySelector from './CitySelector';
import { City } from '@/utils/cityData';

interface DestinationGuess {
  id: number;
  participant_id: string;
  guess: string | null;
  city_name: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  distance_km: number | null;
  is_correct_destination: boolean;
  created_at: string;
}

interface DestinationGuessProps {
  participantId: string;
}

export default function DestinationGuess({ participantId }: DestinationGuessProps) {
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousGuesses, setPreviousGuesses] = useState<DestinationGuess[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCity) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/destination-guesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId,
          cityName: selectedCity.name,
          country: selectedCity.country,
          latitude: selectedCity.latitude,
          longitude: selectedCity.longitude,
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Success! Show success message and reload guesses
        setSuccessMessage(`Guess updated to ${selectedCity.name}`);
        await loadPreviousGuesses();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
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

  // Get the active guess
  const activeGuess = previousGuesses.find(g => g.is_active);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🤔</span>
        Guess the Destination
      </h2>

      {/* Currently guessing display */}
      {activeGuess && activeGuess.city_name && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-600">Currently guessing:</p>
          <p className="text-lg font-semibold text-blue-800">
            {activeGuess.city_name}, {activeGuess.country}
          </p>
        </div>
      )}

      {/* Guess Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <p className="text-gray-600">
          Where do you think we're going? Search for a city and make your best guess!
        </p>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}
        
        <div>
          <CitySelector 
            onSelect={handleCitySelect} 
            disabled={isSubmitting}
            selectedCity={selectedCity}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !selectedCity}
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
            {previousGuesses.map((prevGuess) => (
              <div 
                key={prevGuess.id} 
                className={`flex items-center justify-between p-2 rounded text-sm ${
                  prevGuess.is_active 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {prevGuess.city_name && prevGuess.country 
                      ? `${prevGuess.city_name}, ${prevGuess.country}` 
                      : `"${prevGuess.guess}"`}
                  </span>
                  {prevGuess.is_active && (
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                      Current Guess
                    </span>
                  )}
                </div>
                <span className="text-xs">
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
