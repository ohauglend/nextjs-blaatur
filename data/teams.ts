export type TeamColor = 'red' | 'yellow' | 'blue' | 'green';

export interface Team {
  color: TeamColor;
  name: string;
  emoji: string;
  members: string[];
}

export interface Restaurant {
  name: string;
  address: string;
  mapsUrl: string;
  timeSlot: string;
  type: 'lunch' | 'dinner';
}

export interface DayActivity {
  day: number;
  teamType: 'pairs' | 'groups';
  description: string;
  activities: {
    morning: string;
    afternoon: string;
  };
  restaurants: Restaurant[];
}

// Day 1 - Teams of 2 (4 teams)
export const DAY_1_TEAMS: Team[] = [
  {
    color: 'red',
    name: 'Red Team',
    emoji: '🔴',
    members: ['emilie', 'mathias']
  },
  {
    color: 'yellow',
    name: 'Yellow Team',
    emoji: '🟡',
    members: ['brage', 'sara']
  },
  {
    color: 'blue',
    name: 'Blue Team',
    emoji: '🔵',
    members: ['johanna', 'oskar']
  },
  {
    color: 'green',
    name: 'Green Team',
    emoji: '🟢',
    members: ['odd', 'aasmund']
  }
];

// Day 2 - Teams of 4 (2 teams)
export const DAY_2_TEAMS: Team[] = [
  {
    color: 'red',
    name: 'Red Team',
    emoji: '🔴',
    members: ['emilie', 'mathias', 'brage', 'sara']
  },
  {
    color: 'yellow',
    name: 'Yellow Team',
    emoji: '🟡',
    members: ['johanna', 'oskar', 'odd', 'aasmund']
  }
];

export const DAY_ACTIVITIES: Record<number, DayActivity> = {
  1: {
    day: 1,
    teamType: 'pairs',
    description: 'Explore the city in pairs! Each team has a unique route with different challenges and discoveries.',
    activities: {
      morning: 'City exploration and team challenges - follow your colored route markers',
      afternoon: 'Continue your adventure after lunch - complete photo challenges and find hidden gems'
    },
    restaurants: [
      {
        name: 'Harbor Café',
        address: '123 Harbor Street',
        mapsUrl: 'https://www.google.com/maps',
        timeSlot: '12:30 - 13:30',
        type: 'lunch'
      },
      {
        name: 'Sunset Bistro',
        address: '456 Sunset Boulevard',
        mapsUrl: 'https://www.google.com/maps',
        timeSlot: '19:00 - 21:00',
        type: 'dinner'
      }
    ]
  },
  2: {
    day: 2,
    teamType: 'groups',
    description: 'Team up in larger groups for epic challenges! Red Team vs Yellow Team in the ultimate competition.',
    activities: {
      morning: 'Team building challenges and competitive activities',
      afternoon: 'Final challenges and team competitions - may the best team win!'
    },
    restaurants: [
      {
        name: 'Victory Lunch',
        address: '789 Champion Avenue',
        mapsUrl: 'https://www.google.com/maps',
        timeSlot: '13:00 - 14:00',
        type: 'lunch'
      },
      {
        name: 'Celebration Dinner',
        address: '101 Victory Lane',
        mapsUrl: 'https://www.google.com/maps',
        timeSlot: '20:00 - 22:00',
        type: 'dinner'
      }
    ]
  }
};

export function getParticipantTeam(participantId: string, day: number): Team | null {
  const teams = day === 1 ? DAY_1_TEAMS : DAY_2_TEAMS;
  return teams.find(team => team.members.includes(participantId)) || null;
}

export function getTeammates(participantId: string, day: number): string[] {
  const team = getParticipantTeam(participantId, day);
  return team ? team.members.filter(member => member !== participantId) : [];
}
