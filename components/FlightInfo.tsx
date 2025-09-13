import { PARTICIPANT_ASSETS } from '@/data/participant-assets';

interface FlightInfoProps {
  participantId: string;
  type: 'departure' | 'return';
}

export default function FlightInfo({ participantId, type }: FlightInfoProps) {
  const assets = PARTICIPANT_ASSETS[participantId];

  if (!assets) {
    return <div>Participant not found</div>;
  }

  if (type === 'departure') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">✈️</span>
          Your Flight Information
        </h2>

        <div className="text-center mb-6">
          <div className="bg-gray-100 p-4 rounded-lg inline-block">
            <p className="text-sm text-gray-600 mb-2">Boarding Pass QR Code</p>
            <div className="bg-white p-4 rounded border-2 border-dashed border-gray-300">
              <p className="text-xs text-gray-500 mb-2">QR Code for {assets.name}</p>
              <div className="w-32 h-32 mx-auto bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                [QR Code]<br/>Placeholder
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Scan at airport check-in
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between p-3 bg-blue-50 rounded">
            <span className="font-medium">Departure:</span>
            <span>Oslo Airport (OSL)</span>
          </div>
          <div className="flex justify-between p-3 bg-blue-50 rounded">
            <span className="font-medium">Time:</span>
            <span>May 1st, 08:30</span>
          </div>
          <div className="flex justify-between p-3 bg-blue-50 rounded">
            <span className="font-medium">Gate:</span>
            <span>Will be announced</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 text-sm flex items-center">
            <span className="mr-2">⚠️</span>
            Be at the airport 2 hours before departure!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🏠</span>
        Return Flight Information
      </h2>

      <div className="text-center mb-6">
        <div className="bg-gray-100 p-4 rounded-lg inline-block">
          <p className="text-sm text-gray-600 mb-2">Full Booking Confirmation</p>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-500 mb-2">Booking for {assets.name}</p>
            <div className="w-48 h-32 mx-auto bg-gray-200 flex items-center justify-center text-xs text-gray-500">
              [Booking PDF]<br/>Placeholder
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 text-sm mb-4">
        <div className="flex justify-between p-3 bg-green-50 rounded">
          <span className="font-medium">Return Date:</span>
          <span>May 10th, 2026</span>
        </div>
        <div className="flex justify-between p-3 bg-green-50 rounded">
          <span className="font-medium">Departure Time:</span>
          <span>14:45</span>
        </div>
        <div className="flex justify-between p-3 bg-green-50 rounded">
          <span className="font-medium">Arrival:</span>
          <span>Oslo Airport (OSL)</span>
        </div>
      </div>

      <div className="p-3 bg-blue-50 rounded">
        <p className="text-blue-800 text-sm flex items-center">
          <span className="mr-2">📁</span>
          Find your complete booking in your{' '}
          <a 
            href={assets.googleDriveLink}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-blue-600 hover:underline font-medium"
          >
            Google Drive folder
          </a>
        </p>
      </div>
    </div>
  );
}
