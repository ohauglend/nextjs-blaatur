'use client';

import HostNavigation from './HostNavigation';
import StateControl from './StateControl';
import { useCurrentState } from '@/hooks/useCurrentState';

interface HostControlsProps {
  token: string;
}

export default function HostControls({ token }: HostControlsProps) {
  const currentState = useCurrentState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-red-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ⚙️ Host Controls
          </h1>
          <p className="text-gray-600">
            Manage trip state and administrative functions
          </p>
        </div>

        {/* Navigation */}
        <HostNavigation token={token} currentPage="controls" />

        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 rounded">
            <h2 className="text-lg font-bold text-yellow-800 mb-2 flex items-center">
              <span className="mr-2">⚠️</span>
              Administrative Area
            </h2>
            <p className="text-yellow-700 text-sm">
              Changes made here will affect what all guests see on their screens. 
              Use these controls carefully to advance the trip through its phases.
            </p>
          </div>

          {/* State Control Section */}
          <StateControl currentState={currentState} />

          {/* Future Admin Features Placeholder */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">🔧</span>
              Additional Controls
            </h2>
            <p className="text-gray-600 mb-4">
              More administrative features will be added here in future updates:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center">
                <span className="mr-2 text-gray-400">○</span>
                Vote session creation and management
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-gray-400">○</span>
                Packing list editing and updates
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-gray-400">○</span>
                Participant management
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-gray-400">○</span>
                Trip settings and configuration
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
