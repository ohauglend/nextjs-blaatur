'use client';

import { useState, useEffect } from 'react';
import { getTimeUntilDeparture, formatTimeUnit } from '@/utils/timeUtils';
import { TRIP_CONFIG } from '@/data/participants';

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilDeparture());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilDeparture());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-lg">
        <div className="animate-pulse">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            {TRIP_CONFIG.name}
          </h2>
          <p className="text-gray-600 mb-8">Loading countdown...</p>
        </div>
      </div>
    );
  }

  if (timeLeft.totalMs <= 0) {
    return (
      <div className="text-center p-8 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-green-800 mb-4">
          🎉 It's Time!
        </h2>
        <p className="text-xl text-green-600">
          The adventure begins now!
        </p>
      </div>
    );
  }

  return (
    <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">
        {TRIP_CONFIG.name}
      </h2>
      <p className="text-gray-600 mb-8 text-lg">
        🗓️ Mystery Departure: May 1st, 2026
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-blue-600">
            {timeLeft.days}
          </div>
          <div className="text-sm text-gray-500 uppercase tracking-wide">
            Days
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-purple-600">
            {timeLeft.hours}
          </div>
          <div className="text-sm text-gray-500 uppercase tracking-wide">
            Hours
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-pink-600">
            {timeLeft.minutes}
          </div>
          <div className="text-sm text-gray-500 uppercase tracking-wide">
            Minutes
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-red-600">
            {timeLeft.seconds}
          </div>
          <div className="text-sm text-gray-500 uppercase tracking-wide">
            Seconds
          </div>
        </div>
      </div>

      <div className="text-2xl font-semibold text-gray-700">
        {formatTimeUnit(timeLeft.days, 'day')} until takeoff! ✈️
      </div>
    </div>
  );
}
