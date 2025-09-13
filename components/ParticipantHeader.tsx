import { PARTICIPANT_ASSETS } from '@/data/participant-assets';
import { TRIP_STATES, getCurrentState } from '@/data/states';

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

function InfoButton({ participantId }: { participantId: string }) {
  const assets = PARTICIPANT_ASSETS[participantId];

  return (
    <div className="relative group">
      <button className="p-3 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors">
        <span className="text-xl">ℹ️</span>
      </button>
      
      {/* Info Panel - Shows on hover/click */}
      <div className="absolute right-0 top-12 w-80 bg-white shadow-2xl rounded-lg p-4 border z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center">
          <span className="mr-2">📋</span>
          Trip Information
        </h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center space-x-2">
            <span>🏨</span>
            <div>
              <p className="font-medium">Hotel Blåtur</p>
              <p className="text-gray-600">123 Adventure Street, Mystery City</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span>📸</span>
            <div>
              <p className="font-medium">Photo Sharing</p>
              <a 
                href="https://photos.google.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Photos Album
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span>☁️</span>
            <div>
              <p className="font-medium">Weather Today</p>
              <p className="text-gray-600">Sunny, 22°C</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span>📞</span>
            <div>
              <p className="font-medium">Emergency Contact</p>
              <p className="text-gray-600">Host: +47 123 45 678</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span>📁</span>
            <div>
              <p className="font-medium">Your Documents</p>
              <a 
                href={assets?.googleDriveLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Drive Folder
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
