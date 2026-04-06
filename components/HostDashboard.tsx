'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import HostNavigation from './HostNavigation';
import { TRIP_CONFIG } from '@/data/participants';
import { getAllStates } from '@/data/states';
import { useCurrentState } from '@/hooks/useCurrentState';
import { getAllParticipants, getParticipantsByRole } from '@/utils/participantUtils';
import { PARTICIPANT_ASSETS } from '@/data/participant-assets';

interface HostDashboardProps {
  token: string;
}

export default function HostDashboard({ token }: HostDashboardProps) {
  const currentState = useCurrentState();
  const allStates = getAllStates();
  const currentStateData = allStates.find(s => s.id === currentState);
  const hosts = getParticipantsByRole('host');
  const guests = getParticipantsByRole('guest');

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-red-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            👑 {TRIP_CONFIG.name} - Host Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Welcome to the host control center!
          </p>
        </div>

        {/* Navigation */}
        <HostNavigation token={token} currentPage="dashboard" />

        {/* Current State Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📍</span>
            Current Trip State
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl mb-2">{currentStateData?.emoji}</div>
              <h3 className="text-xl font-semibold text-gray-800">
                {currentStateData?.name}
              </h3>
              <p className="text-gray-600">{currentStateData?.description}</p>
            </div>
            <Link
              href={`/${token}/host/controls`}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
            >
              Change State
            </Link>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Zone Game Card */}
          <Link
            href={`/${token}/host/zones`}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all border-l-4 border-green-500"
          >
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Zone Game
            </h3>
            <p className="text-gray-600 mb-4">
              Live map with all teams, scoreboard, Day 2 transition, challenge review & dev controls
            </p>
            <div className="text-green-600 font-medium">
              Open Zone Game →
            </div>
          </Link>

          {/* Preview Card */}
          <Link
            href={`/${token}/host/preview`}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all"
          >
            <div className="text-4xl mb-4">👁️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Preview All Tiles
            </h3>
            <p className="text-gray-600 mb-4">
              View all participant components and tiles to see what's coming up throughout the trip
            </p>
            <div className="text-blue-600 font-medium">
              View Preview →
            </div>
          </Link>

          {/* Controls Card */}
          <Link
            href={`/${token}/host/controls`}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all"
          >
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Host Controls
            </h3>
            <p className="text-gray-600 mb-4">
              Manage trip state, configure voting sessions, and access administrative functions
            </p>
            <div className="text-blue-600 font-medium">
              Open Controls →
            </div>
          </Link>
        </div>

        {/* Participant Access */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            👥 Participant Screens
          </h2>
          
          {/* Hosts Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
              <span className="mr-2">👑</span>
              Hosts
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {hosts.map((participant) => {
                const assets = PARTICIPANT_ASSETS[participant.id];
                return (
                  <Link
                    key={participant.id}
                    href={`/${token}/${participant.id}`}
                    className="block p-3 bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 border-yellow-200 hover:border-yellow-400"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">{assets?.emoji}</div>
                      <h4 className="font-semibold text-gray-800">
                        {participant.name}
                      </h4>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Guests Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
              <span className="mr-2">🎒</span>
              Guests
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {guests.map((participant) => {
                const assets = PARTICIPANT_ASSETS[participant.id];
                return (
                  <Link
                    key={participant.id}
                    href={`/${token}/${participant.id}`}
                    className="block p-3 bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 border-blue-200 hover:border-blue-400"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">{assets?.emoji}</div>
                      <h4 className="font-semibold text-gray-800">
                        {participant.name}
                      </h4>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <h3 className="font-bold text-yellow-800 mb-3 flex items-center">
            <span className="mr-2">💡</span>
            Host Tips
          </h3>
          <div className="text-sm text-yellow-700 space-y-2">
            <p>• Use <strong>Preview All Tiles</strong> to see all components guests will encounter throughout the trip</p>
            <p>• Use <strong>Host Controls</strong> to advance trip phases and manage administrative settings</p>
            <p>• The current state determines what guests see on their screens right now</p>
            <p>• Click on any participant name to view their personal screeninistrative settings</p>
            <p>• The current state determines what guests see on their screens right now</p>
            <p>• You can still access your personal participant page through your profile</p>
          </div>
        </div>
      </div>
    </div>
  );
}
