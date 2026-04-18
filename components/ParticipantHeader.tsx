import { PARTICIPANT_ASSETS } from '@/data/participant-assets';
import { TRIP_STATES, getCurrentState } from '@/data/states';
import InfoButton from '@/components/InfoButton';

interface ParticipantHeaderProps {
  participantId: string;
  participantName: string;
}

export default function ParticipantHeader({ participantId, participantName }: ParticipantHeaderProps) {
  const assets = PARTICIPANT_ASSETS[participantId];
  const currentState = getCurrentState();
  const stateInfo = TRIP_STATES[currentState];

  if (!assets) {
    return <div>Participant not found</div>;
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 mb-6">
      {/* Profile Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="text-4xl">{assets.emoji}</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{participantName}</h1>
            <div className="flex items-center space-x-2">
              <span className="text-xl">{stateInfo.emoji}</span>
              <span className="text-sm font-medium text-gray-600">{stateInfo.participantView}</span>
            </div>
          </div>
        </div>

        {/* Info Button */}
        <InfoButton participantId={participantId} />
      </div>
    </div>
  );
}
