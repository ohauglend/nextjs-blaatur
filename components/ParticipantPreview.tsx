'use client';

import HostNavigation from './HostNavigation';
import { PARTICIPANT_ASSETS } from '@/data/participant-assets';
import PackingList from '@/components/PackingList';
import CountdownTimer from '@/components/CountdownTimer';
import DestinationGuess from '@/components/DestinationGuess';
import TeamActivity from '@/components/TeamActivity';
import FlightInfo from '@/components/FlightInfo';
import ThankYou from '@/components/ThankYou';
import ItineraryView from '@/components/ItineraryView';

interface ParticipantPreviewProps {
  token: string;
  participantId: string;
}

export default function ParticipantPreview({ token, participantId }: ParticipantPreviewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-red-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            👁️ Participant Preview
          </h1>
          <p className="text-gray-600">
            View all components guests will see throughout the trip
          </p>
        </div>

        {/* Navigation */}
        <HostNavigation token={token} currentPage="preview" />

        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-4 rounded">
            <h2 className="text-lg font-bold text-blue-800 mb-2 flex items-center">
              <span className="mr-2">ℹ️</span>
              Preview Mode
            </h2>
            <p className="text-blue-700 text-sm">
              This preview shows all trip components that guests will see throughout the journey. 
              Components appear based on the current trip state you set in Host Controls.
            </p>
          </div>

          {/* Pre-Trip Components */}
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="font-bold text-blue-800 mb-3 flex items-center">
              <span className="mr-2">⏰</span>
              Pre-Trip Phase Components
            </h3>
            <div className="space-y-4">
              <CountdownTimer />
              <DestinationGuess participantId={participantId} />
            </div>
          </div>

          {/* Packing List */}
          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="font-bold text-green-800 mb-3 flex items-center">
              <span className="mr-2">🎒</span>
              Packing Phase Component
            </h3>
            <PackingList participantId={participantId} />
          </div>

          {/* Flight Components */}
          <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
            <h3 className="font-bold text-purple-800 mb-3 flex items-center">
              <span className="mr-2">✈️</span>
              Flight Components
            </h3>
            <div className="space-y-4">
              <FlightInfo participantId={participantId} type="departure" />
              <FlightInfo participantId={participantId} type="return" />
            </div>
          </div>

          {/* Itinerary Components */}
          <div className="border-2 border-indigo-200 rounded-lg p-4 bg-indigo-50">
            <h3 className="font-bold text-indigo-800 mb-3 flex items-center">
              <span className="mr-2">📋</span>
              Itinerary Components
            </h3>
            <div className="space-y-4">
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-gray-800 mb-2">Trip Summary</h4>
                <ItineraryView type="summary" />
              </div>
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-gray-800 mb-2">Day 1 Schedule</h4>
                <ItineraryView type="day-1" />
              </div>
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-gray-800 mb-2">Day 2 Schedule</h4>
                <ItineraryView type="day-2" />
              </div>
            </div>
          </div>

          {/* Activity Components */}
          <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
            <h3 className="font-bold text-red-800 mb-3 flex items-center">
              <span className="mr-2">🎯</span>
              Activity Components
            </h3>
            <div className="space-y-4">
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-gray-800 mb-2">Day 1 Activities</h4>
                <TeamActivity participantId={participantId} day={1} />
              </div>
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-gray-800 mb-2">Day 2 Activities</h4>
                <TeamActivity participantId={participantId} day={2} />
              </div>
            </div>
          </div>

          {/* Thank You Component */}
          <div className="border-2 border-pink-200 rounded-lg p-4 bg-pink-50">
            <h3 className="font-bold text-pink-800 mb-3 flex items-center">
              <span className="mr-2">🎉</span>
              After Trip Component
            </h3>
            <ThankYou participantId={participantId} />
          </div>
        </div>
      </div>
    </div>
  );
}
