'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MeetupSpotData {
  participant_id: string;
  address: string | null;
  meetup_time: string | null;
}

interface MeetupSpotProps {
  participantId: string;
}

export default function MeetupSpot({ participantId }: MeetupSpotProps) {
  const { data, isLoading } = useSWR<MeetupSpotData>(
    `/api/meetup-spots?participant=${participantId}`,
    fetcher,
    { refreshInterval: 30_000 },
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  const hasData = data?.address || data?.meetup_time;

  if (!hasData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-3xl mb-3">🗺️</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">Meet-up Spot</h3>
        <p className="text-gray-500">Your meetup location will be revealed soon 🗺️</p>
      </div>
    );
  }

  const formattedTime = data.meetup_time
    ? new Date(data.meetup_time).toLocaleString('nb-NO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">📍</span>
        Your Meet-up Spot
      </h3>

      {data.address && (
        <div className="mb-3">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-1">Address</p>
          <p className="text-lg text-gray-800 font-semibold">{data.address}</p>
        </div>
      )}

      {formattedTime && (
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-1">Meet-up Time</p>
          <p className="text-lg text-gray-800 font-semibold">{formattedTime}</p>
        </div>
      )}
    </div>
  );
}
