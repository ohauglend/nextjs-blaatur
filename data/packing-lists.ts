export interface PackingItem {
  item: string;
  category: 'clothing' | 'electronics' | 'personal' | 'documents' | 'special';
  required: boolean;
  notes?: string;
}

export interface PackingList {
  participantId: string;
  items: PackingItem[];
  specialInstructions?: string[];
}

export const PACKING_LISTS: Record<string, PackingList> = {
  'emilie': {
    participantId: 'emilie',
    items: [
      { item: 'Warm jacket', category: 'clothing', required: true, notes: 'It might get chilly!' },
      { item: 'Comfortable walking shoes', category: 'clothing', required: true },
      { item: 'Swimwear', category: 'clothing', required: true, notes: 'Trust us on this one' },
      { item: 'Camera or phone', category: 'electronics', required: true },
      { item: 'Portable charger', category: 'electronics', required: true },
      { item: 'Passport', category: 'documents', required: true },
      { item: 'Sunglasses', category: 'personal', required: false },
      { item: 'Waterproof bag', category: 'special', required: true, notes: 'You will need this!' },
    ],
    specialInstructions: [
      'Pack light - we might be moving around a lot',
      'Bring clothes for both warm and cold weather',
      'Don\'t forget your sense of adventure!'
    ]
  },
  'mathias': {
    participantId: 'mathias',
    items: [
      { item: 'Hiking boots', category: 'clothing', required: true, notes: 'Sturdy ones!' },
      { item: 'Rain jacket', category: 'clothing', required: true },
      { item: 'Quick-dry clothes', category: 'clothing', required: true },
      { item: 'Camera or phone', category: 'electronics', required: true },
      { item: 'Portable charger', category: 'electronics', required: true },
      { item: 'Passport', category: 'documents', required: true },
      { item: 'Head torch/flashlight', category: 'special', required: true, notes: 'You will definitely need this' },
      { item: 'Waterproof bag', category: 'special', required: true },
    ],
    specialInstructions: [
      'We might be doing some outdoor activities',
      'Waterproof everything is key',
      'Energy snacks recommended'
    ]
  },
  'brage': {
    participantId: 'brage',
    items: [
      { item: 'Formal shirt', category: 'clothing', required: true, notes: 'One nice evening planned' },
      { item: 'Casual comfortable clothes', category: 'clothing', required: true },
      { item: 'Swimwear', category: 'clothing', required: true },
      { item: 'Camera or phone', category: 'electronics', required: true },
      { item: 'Portable charger', category: 'electronics', required: true },
      { item: 'Passport', category: 'documents', required: true },
      { item: 'Sunscreen', category: 'personal', required: true, notes: 'High SPF recommended' },
      { item: 'Reusable water bottle', category: 'special', required: true },
    ],
    specialInstructions: [
      'Mix of casual and slightly formal occasions',
      'Sun protection is important',
      'Stay hydrated!'
    ]
  },
  'sara': {
    participantId: 'sara',
    items: [
      { item: 'Layered clothing', category: 'clothing', required: true, notes: 'Weather can change quickly' },
      { item: 'Comfortable shoes', category: 'clothing', required: true },
      { item: 'Swimwear', category: 'clothing', required: true },
      { item: 'Camera or phone', category: 'electronics', required: true },
      { item: 'Portable charger', category: 'electronics', required: true },
      { item: 'Passport', category: 'documents', required: true },
      { item: 'Personal medications', category: 'personal', required: true },
      { item: 'Small backpack', category: 'special', required: true, notes: 'For day trips' },
    ],
    specialInstructions: [
      'Comfort is key for this trip',
      'We will be active during the days',
      'Bring anything that makes you feel at home'
    ]
  },
  'johanna': {
    participantId: 'johanna',
    items: [
      { item: 'Versatile outfits', category: 'clothing', required: true, notes: 'Day to night transitions' },
      { item: 'Good walking shoes', category: 'clothing', required: true },
      { item: 'Swimwear', category: 'clothing', required: true },
      { item: 'Camera or phone', category: 'electronics', required: true },
      { item: 'Portable charger', category: 'electronics', required: true },
      { item: 'Passport', category: 'documents', required: true },
      { item: 'Journal or notebook', category: 'personal', required: false, notes: 'To capture memories' },
      { item: 'Travel pillow', category: 'special', required: false, notes: 'Long journey ahead' },
    ],
    specialInstructions: [
      'This will be a trip to remember',
      'Comfortable yet stylish is the way to go',
      'Prepare for the unexpected!'
    ]
  },
  // Hosts get simpler lists since they know what's coming
  'oskar': {
    participantId: 'oskar',
    items: [
      { item: 'Host materials', category: 'special', required: true, notes: 'You know what this means' },
      { item: 'Camera or phone', category: 'electronics', required: true },
      { item: 'Passport', category: 'documents', required: true },
    ],
    specialInstructions: ['You are in charge - pack accordingly!']
  },
  'odd': {
    participantId: 'odd',
    items: [
      { item: 'Host materials', category: 'special', required: true, notes: 'You know what this means' },
      { item: 'Camera or phone', category: 'electronics', required: true },
      { item: 'Passport', category: 'documents', required: true },
    ],
    specialInstructions: ['You are in charge - pack accordingly!']
  },
  'aasmund': {
    participantId: 'aasmund',
    items: [
      { item: 'Host materials', category: 'special', required: true, notes: 'You know what this means' },
      { item: 'Camera or phone', category: 'electronics', required: true },
      { item: 'Passport', category: 'documents', required: true },
    ],
    specialInstructions: ['You are in charge - pack accordingly!']
  },
};

// Helper function to get packing list for a participant
export function getPackingListForParticipant(participantId: string): PackingList | null {
  return PACKING_LISTS[participantId] || null;
}
