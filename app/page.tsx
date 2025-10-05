import Link from "next/link";
import { getAllParticipants, getParticipantsByRole } from '@/utils/participantUtils';
import { TRIP_CONFIG } from '@/data/participants';
import { PARTICIPANT_ASSETS } from '@/data/participant-assets';
import { getCurrentState, getAllStates } from '@/data/states';
import { PARTICIPANT_TOKENS } from '@/utils/secureAccess';

export default function HostControlPanel() {
  const hosts = getParticipantsByRole('host');
  const guests = getParticipantsByRole('guest');
  const currentState = getCurrentState();
  const allStates = getAllStates();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* TEST MESSAGE FOR AUTOMATIC DEPLOYMENT */}
        <div className="text-center mb-8 p-6 bg-red-500 text-white rounded-lg shadow-xl">
          <h1 className="text-6xl font-bold mb-4">🚀 TEST FOR AUTOMATIC DEPLOYMENT 🚀</h1>
          <p className="text-2xl font-semibold">This message confirms Vercel auto-deploy is working!</p>
        </div>
        
        {/* Host Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            👑 {TRIP_CONFIG.name} - Host Control
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Welcome hosts! Manage the mystery adventure from here.
          </p>
          
          {/* Current State Display */}
          <div className="inline-block bg-white px-6 py-3 rounded-lg shadow-lg">
            <p className="text-lg font-semibold text-gray-800">
              Current State: <span className="text-blue-600">{allStates.find(s => s.id === currentState)?.name}</span>
              <span className="ml-2 text-2xl">{allStates.find(s => s.id === currentState)?.emoji}</span>
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            🎛️ Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-lg text-center">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold text-gray-800 mb-2">Trip Overview</h3>
              <p className="text-sm text-gray-600">Monitor all participants</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-lg text-center">
              <div className="text-2xl mb-2">⚙️</div>
              <h3 className="font-semibold text-gray-800 mb-2">State Control</h3>
              <p className="text-sm text-gray-600">Advance trip phases</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-lg text-center">
              <div className="text-2xl mb-2">📱</div>
              <h3 className="font-semibold text-gray-800 mb-2">Emergency</h3>
              <p className="text-sm text-gray-600">Emergency contacts & info</p>
            </div>
          </div>
        </div>

        {/* Participant Access */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            👥 Participant Screens
          </h2>
          
          {/* Hosts Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
              <span className="mr-2">👑</span>
              Host Access
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hosts.map((participant) => {
                const assets = PARTICIPANT_ASSETS[participant.id];
                const token = PARTICIPANT_TOKENS[participant.id];
                return (
                  <Link
                    key={participant.id}
                    href={`/${token}/${participant.id}`}
                    className="group block p-4 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-yellow-200 hover:border-yellow-400"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{assets?.emoji}</div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-1">
                        {participant.name}
                      </h4>
                      <p className="text-xs text-yellow-600 uppercase font-medium">
                        Host
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Guests Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
              <span className="mr-2">🎒</span>
              Guest Screens
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {guests.map((participant) => {
                const assets = PARTICIPANT_ASSETS[participant.id];
                const token = PARTICIPANT_TOKENS[participant.id];
                return (
                  <Link
                    key={participant.id}
                    href={`/${token}/${participant.id}`}
                    className="group block p-4 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-blue-200 hover:border-blue-400"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{assets?.emoji}</div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-1">
                        {participant.name}
                      </h4>
                      <p className="text-xs text-blue-600 uppercase font-medium">
                        Guest
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center">
              <span className="mr-2">📝</span>
              Host Instructions
            </h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p>• Click on any participant name to view their personal screen</p>
              <p>• Monitor what each guest sees at different trip states</p>
              <p>• Use this panel to manage the experience and help participants</p>
              <p>• All participant data is stored locally - no external dependencies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
