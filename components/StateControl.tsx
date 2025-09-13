'use client';

import { useState } from 'react';
import { TRIP_STATES, TripState } from '@/data/states';
import { saveCurrentState } from '@/utils/stateManager';

interface StateControlProps {
  currentState: TripState;
}

export default function StateControl({ currentState }: StateControlProps) {
  const [selectedState, setSelectedState] = useState<TripState>(currentState);
  const [isChanging, setIsChanging] = useState(false);

  const handleStateChange = async (newState: TripState) => {
    if (newState === currentState) return;
    
    setIsChanging(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Save the new state to localStorage (in production this would be an API call)
      saveCurrentState(newState);
      console.log(`State changed from ${currentState} to ${newState}`);
      
      // Refresh the page to show the new state
      window.location.reload();
    } catch (error) {
      console.error('Failed to change state:', error);
      alert('Failed to change state. Please try again.');
    } finally {
      setIsChanging(false);
    }
  };

  const states = Object.values(TRIP_STATES);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-yellow-300">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">⚙️</span>
        Host State Control
      </h2>

      <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-yellow-800 text-sm flex items-center">
          <span className="mr-2">⚠️</span>
          <strong>Host Only:</strong> Changing the state will affect what all guests see on their screens.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {states.map((state) => (
          <button
            key={state.id}
            onClick={() => setSelectedState(state.id)}
            disabled={isChanging}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              selectedState === state.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${
              state.id === currentState
                ? 'ring-2 ring-green-300 bg-green-50'
                : ''
            } ${
              isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="text-xl mb-1">{state.emoji}</div>
            <div className="font-medium text-sm text-gray-800">{state.name}</div>
            <div className="text-xs text-gray-600 mt-1">{state.description}</div>
            {state.id === currentState && (
              <div className="text-xs text-green-600 font-medium mt-1 flex items-center">
                <span className="mr-1">✅</span>
                Current
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Selected: <span className="font-medium">{TRIP_STATES[selectedState].name}</span>
        </div>
        
        <button
          onClick={() => handleStateChange(selectedState)}
          disabled={selectedState === currentState || isChanging}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            selectedState === currentState || isChanging
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isChanging ? (
            <span className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Changing...
            </span>
          ) : selectedState === currentState ? (
            'Current State'
          ) : (
            'Change State'
          )}
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
        <p><strong>Note:</strong> In production, this would update a database/API that all participant screens read from.</p>
        <p>For this demo, the state change simulates the update and refreshes the page.</p>
      </div>
    </div>
  );
}
