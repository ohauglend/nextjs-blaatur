import { PACKING_LISTS } from '@/data/packing-lists';
import { PARTICIPANT_ASSETS } from '@/data/participant-assets';
import PackingList from '@/components/PackingList';
import CountdownTimer from '@/components/CountdownTimer';
import DestinationGuess from '@/components/DestinationGuess';
import TeamActivity from '@/components/TeamActivity';
import FlightInfo from '@/components/FlightInfo';
import ThankYou from '@/components/ThankYou';

interface HostOverviewProps {
  participantId: string;
}

export default function HostOverview({ participantId }: HostOverviewProps) {
  const packingList = PACKING_LISTS[participantId];
  const assets = PARTICIPANT_ASSETS[participantId];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 rounded">
        <h2 className="text-lg font-bold text-yellow-800 mb-2 flex items-center">
          <span className="mr-2">👑</span>
          Host Preview Mode
        </h2>
        <p className="text-yellow-700 text-sm">
          You can see all components that guests will see throughout the trip. 
          Use the state control above to change what guests currently see.
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
        {packingList && <PackingList packingList={packingList} />}
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
  );
}
