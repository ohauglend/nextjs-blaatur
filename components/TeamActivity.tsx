import { getParticipantTeam, getTeammates, DAY_ACTIVITIES } from '@/data/teams';
import { PARTICIPANTS } from '@/data/participants';

interface TeamActivityProps {
  participantId: string;
  day: number;
}

export default function TeamActivity({ participantId, day }: TeamActivityProps) {
  const team = getParticipantTeam(participantId, day);
  const teammates = getTeammates(participantId, day);
  const activity = DAY_ACTIVITIES[day];

  if (!team || !activity) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <p className="text-gray-600">Team information not available yet...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* Team Header */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">{team.emoji}</div>
        <h2 className="text-2xl font-bold text-gray-800">
          You are {team.name}!
        </h2>
        <p className="text-gray-600 mt-2">
          {activity.teamType === 'pairs' ? 'Team of 2' : 'Team of 4'}
        </p>
      </div>

      {/* Teammates */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">Your Teammates:</h3>
        <div className="flex flex-wrap gap-2">
          {teammates.map(teammateId => {
            const teammate = PARTICIPANTS[teammateId];
            return (
              <span
                key={teammateId}
                className="bg-white px-3 py-1 rounded-full text-sm font-medium border"
              >
                {teammate?.name || teammateId}
              </span>
            );
          })}
        </div>
      </div>

      {/* Activity Description */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
          <span className="mr-2">🎯</span>
          Today's Adventure
        </h3>
        <p className="text-gray-700 mb-4">{activity.description}</p>
      </div>

      {/* Schedule */}
      <div className="space-y-4">
        {/* Morning */}
        <div className="border-l-4 border-blue-400 pl-4">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <span className="mr-2">🌅</span>
            Morning Activity
          </h4>
          <p className="text-gray-600 text-sm mt-1">{activity.activities.morning}</p>
        </div>

        {/* Lunch */}
        {activity.restaurants.filter(r => r.type === 'lunch').map(restaurant => (
          <div key={restaurant.name} className="border-l-4 border-green-400 pl-4">
            <h4 className="font-semibold text-gray-800 flex items-center">
              <span className="mr-2">🍽️</span>
              Lunch - {restaurant.timeSlot}
            </h4>
            <p className="text-gray-600 text-sm">{restaurant.name}</p>
            <a 
              href={restaurant.mapsUrl}
              target="_blank"
              rel="noopener noreferrer" 
              className="inline-block mt-1 text-blue-600 hover:underline text-sm"
            >
              📍 View on Maps
            </a>
          </div>
        ))}

        {/* Afternoon */}
        <div className="border-l-4 border-orange-400 pl-4">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <span className="mr-2">☀️</span>
            Afternoon Activity
          </h4>
          <p className="text-gray-600 text-sm mt-1">{activity.activities.afternoon}</p>
        </div>

        {/* Dinner */}
        {activity.restaurants.filter(r => r.type === 'dinner').map(restaurant => (
          <div key={restaurant.name} className="border-l-4 border-purple-400 pl-4">
            <h4 className="font-semibold text-gray-800 flex items-center">
              <span className="mr-2">🍽️</span>
              Dinner - {restaurant.timeSlot}
            </h4>
            <p className="text-gray-600 text-sm">{restaurant.name}</p>
            <a 
              href={restaurant.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-blue-600 hover:underline text-sm"
            >
              📍 View on Maps
            </a>
          </div>
        ))}
      </div>

      {/* Team Color Info */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <p className="text-sm text-gray-700 flex items-center">
          <span className="mr-2">👕</span>
          You'll receive {team.color} team t-shirts and shorts today!
        </p>
      </div>
    </div>
  );
}
