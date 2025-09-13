export interface ParticipantAssets {
  id: string;
  name: string;
  emoji: string;
  profileImage: string;
  flightQR: string;
  returnBooking: string;
  googleDriveLink: string;
}

export const PARTICIPANT_ASSETS: Record<string, ParticipantAssets> = {
  'emilie': {
    id: 'emilie',
    name: 'Emilie',
    emoji: '💃',
    profileImage: '/data/participants/emilie/photo.svg',
    flightQR: '/data/participants/emilie/flight-qr.png',
    returnBooking: '/data/participants/emilie/return-booking.pdf',
    googleDriveLink: 'https://drive.google.com/drive/folders/emilie-folder'
  },
  'mathias': {
    id: 'mathias',
    name: 'Mathias',
    emoji: '🎸',
    profileImage: '/data/participants/mathias/photo.svg',
    flightQR: '/data/participants/mathias/flight-qr.png',
    returnBooking: '/data/participants/mathias/return-booking.pdf',
    googleDriveLink: 'https://drive.google.com/drive/folders/mathias-folder'
  },
  'brage': {
    id: 'brage',
    name: 'Brage',
    emoji: '⚽',
    profileImage: '/data/participants/brage/photo.svg',
    flightQR: '/data/participants/brage/flight-qr.png',
    returnBooking: '/data/participants/brage/return-booking.pdf',
    googleDriveLink: 'https://drive.google.com/drive/folders/brage-folder'
  },
  'sara': {
    id: 'sara',
    name: 'Sara',
    emoji: '🌸',
    profileImage: '/data/participants/sara/photo.svg',
    flightQR: '/data/participants/sara/flight-qr.png',
    returnBooking: '/data/participants/sara/return-booking.pdf',
    googleDriveLink: 'https://drive.google.com/drive/folders/sara-folder'
  },
  'johanna': {
    id: 'johanna',
    name: 'Johanna',
    emoji: '📚',
    profileImage: '/data/participants/johanna/photo.svg',
    flightQR: '/data/participants/johanna/flight-qr.png',
    returnBooking: '/data/participants/johanna/return-booking.pdf',
    googleDriveLink: 'https://drive.google.com/drive/folders/johanna-folder'
  },
  'oskar': {
    id: 'oskar',
    name: 'Oskar',
    emoji: '👑',
    profileImage: '/data/participants/oskar/photo.svg',
    flightQR: '/data/participants/oskar/flight-qr.png',
    returnBooking: '/data/participants/oskar/return-booking.pdf',
    googleDriveLink: 'https://drive.google.com/drive/folders/oskar-folder'
  },
  'odd': {
    id: 'odd',
    name: 'Odd',
    emoji: '🎯',
    profileImage: '/data/participants/odd/photo.svg',
    flightQR: '/data/participants/odd/flight-qr.png',
    returnBooking: '/data/participants/odd/return-booking.pdf',
    googleDriveLink: 'https://drive.google.com/drive/folders/odd-folder'
  },
  'aasmund': {
    id: 'aasmund',
    name: 'Aasmund',
    emoji: '🎭',
    profileImage: '/data/participants/aasmund/photo.svg',
    flightQR: '/data/participants/aasmund/flight-qr.png',
    returnBooking: '/data/participants/aasmund/return-booking.pdf',
    googleDriveLink: 'https://drive.google.com/drive/folders/aasmund-folder'
  }
};

export function getParticipantAssets(participantId: string): ParticipantAssets | null {
  return PARTICIPANT_ASSETS[participantId] || null;
}
