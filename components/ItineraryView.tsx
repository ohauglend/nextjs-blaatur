'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ItineraryType = 'summary' | 'day-1' | 'day-2';

interface ItineraryItem {
  id: number;
  itinerary_type: ItineraryType;
  datetime: string;
  text: string;
  emoji: string;
  created_at: string;
  updated_at: string;
}

interface ItineraryViewProps {
  type: ItineraryType;
  collapsible?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  });

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDateAndTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Find the index of the "current" item — the last item whose datetime is in
 * the past or now, OR if all items are in the future, highlight the first.
 */
function getCurrentIndex(items: ItineraryItem[], now: number): number {
  if (items.length === 0) return -1;
  let lastPast = -1;
  for (let i = 0; i < items.length; i++) {
    if (new Date(items[i].datetime).getTime() <= now) {
      lastPast = i;
    }
  }
  // If nothing is past yet, highlight the first upcoming item
  if (lastPast === -1) return 0;
  // If the last past item isn't the last item, highlight the next one (upcoming)
  if (lastPast < items.length - 1) return lastPast + 1;
  // Everything is in the past — highlight the last one
  return lastPast;
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

function Timeline({ items, isSummary }: { items: ItineraryItem[]; isSummary: boolean }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const currentIdx = getCurrentIndex(items, now);

  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const itemTime = new Date(item.datetime).getTime();
        const isPast = itemTime < now && i !== currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <div
            key={item.id}
            className={`flex items-start gap-3 pl-3 py-2 border-l-4 transition-colors ${
              isCurrent
                ? 'border-blue-500 bg-blue-50'
                : isPast
                  ? 'border-gray-200 opacity-50'
                  : 'border-indigo-200'
            }`}
          >
            <span className="text-lg leading-none mt-0.5">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold ${isCurrent ? 'text-blue-700' : 'text-gray-500'}`}>
                {isSummary ? formatDateAndTime(item.datetime) : formatTime(item.datetime)}
              </div>
              <div className={`text-sm ${isCurrent ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                {item.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ItineraryView (main export)
// ---------------------------------------------------------------------------

export default function ItineraryView({ type, collapsible = false }: ItineraryViewProps) {
  const [expanded, setExpanded] = useState(!collapsible);

  const { data: items, error } = useSWR<ItineraryItem[]>(
    `/api/itinerary?type=${type}`,
    fetcher,
    { refreshInterval: 60_000 },
  );

  const isSummary = type === 'summary';
  const title = isSummary ? '✈️ Trip Overview' : '📋 Today\'s Schedule';

  // Loading
  if (!items && !error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <p className="text-red-600 text-sm">Failed to load schedule.</p>
      </div>
    );
  }

  // Empty
  if (items && items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
          <span className="mr-2">{isSummary ? '✈️' : '📋'}</span>
          {title}
        </h3>
        <p className="text-gray-500 text-sm italic">No schedule items yet.</p>
      </div>
    );
  }

  // Collapsible wrapper
  if (collapsible) {
    return (
      <div className="bg-white rounded-lg shadow-lg mb-6 overflow-hidden">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-semibold text-gray-800 flex items-center">
            <span className="mr-2">📋</span>
            Today&apos;s Schedule
            <span className="ml-2 text-xs text-gray-500 font-normal">
              {items!.length} item{items!.length !== 1 ? 's' : ''}
            </span>
          </h3>
          <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {expanded && (
          <div className="px-4 pb-4">
            <Timeline items={items!} isSummary={isSummary} />
          </div>
        )}
      </div>
    );
  }

  // Non-collapsible (summary / preview)
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
        <span className="mr-2">{isSummary ? '✈️' : '📋'}</span>
        {title}
      </h3>
      <Timeline items={items!} isSummary={isSummary} />
    </div>
  );
}
