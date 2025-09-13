import { PARTICIPANT_ASSETS } from '@/data/participant-assets';

interface ThankYouProps {
  participantId: string;
}

export default function ThankYou({ participantId }: ThankYouProps) {
  const assets = PARTICIPANT_ASSETS[participantId];

  return (
    <div className="bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 rounded-lg shadow-lg p-8 mb-6 text-center">
      <div className="text-6xl mb-4">🎉</div>
      
      <h2 className="text-3xl font-bold text-gray-800 mb-4">
        Thank You for an Amazing Trip!
      </h2>

      <div className="text-2xl mb-6">{assets?.emoji}</div>

      <p className="text-lg text-gray-700 mb-6 leading-relaxed">
        What an incredible adventure we've had together! From the mystery destination 
        to the team challenges, from the laughs to the unforgettable moments - 
        this Blåtur will forever be in our memories.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-sm">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl mb-2">📸</div>
          <h3 className="font-semibold mb-1">Memories Made</h3>
          <p className="text-gray-600">Countless photos and stories to share</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl mb-2">🤝</div>
          <h3 className="font-semibold mb-1">New Bonds</h3>
          <p className="text-gray-600">Friendships strengthened through adventure</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl mb-2">🌟</div>
          <h3 className="font-semibold mb-1">Stories to Tell</h3>
          <p className="text-gray-600">Adventures that will be talked about for years</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-center">
          <span className="mr-2">📋</span>
          Keep the Memories Alive
        </h3>
        
        <div className="space-y-3 text-left">
          <div className="flex items-center space-x-3">
            <span>📸</span>
            <div>
              <p className="font-medium">All Trip Photos</p>
              <a 
                href="https://photos.google.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                Access the shared photo album
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span>📁</span>
            <div>
              <p className="font-medium">Your Personal Files</p>
              <a 
                href={assets?.googleDriveLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                Download your trip documents
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span>💌</span>
            <div>
              <p className="font-medium">Stay Connected</p>
              <p className="text-gray-600 text-sm">
                Keep sharing memories in our group chat!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-gray-600 italic">
        "The best trips are the ones that bring us closer together"
      </div>

      <div className="mt-6 text-sm text-gray-500">
        Until the next adventure... 🌍✈️
      </div>
    </div>
  );
}
