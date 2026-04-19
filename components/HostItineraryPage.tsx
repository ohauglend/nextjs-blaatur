'use client';

import HostNavigation from './HostNavigation';
import ItineraryEditor from './ItineraryEditor';

interface HostItineraryPageProps {
  token: string;
}

export default function HostItineraryPage({ token }: HostItineraryPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-red-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📋 Itinerary Manager
          </h1>
          <p className="text-gray-600">
            Manage trip summary and daily schedules
          </p>
        </div>

        {/* Navigation */}
        <HostNavigation token={token} currentPage="itinerary" />

        {/* Editor */}
        <ItineraryEditor token={token} />
      </div>
    </div>
  );
}
