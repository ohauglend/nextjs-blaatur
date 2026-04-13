export type PackingCategory =
  | 'clothing'
  | 'electronics'
  | 'personal'
  | 'documents'
  | 'special';

export interface PackingItem {
  id: number;
  text: string;
  category: PackingCategory;
  emoji_override: string | null;
  participant_id: string; // participant ID or 'everyone'
  created_at: string;
  updated_at: string;
}

// Used by the host editor and create form
export interface PackingItemInput {
  text: string;
  category: PackingCategory;
  emoji_override?: string | null;
  participant_id: string;
}

// Category-to-default-icon mapping (used in both host and participant components)
export const CATEGORY_ICONS: Record<PackingCategory, string> = {
  clothing: '👕',
  electronics: '🔌',
  personal: '🧴',
  documents: '📄',
  special: '🎯',
};

// Returns the display icon for an item — emoji_override takes priority over category icon
export function getItemIcon(item: PackingItem): string {
  return item.emoji_override ?? CATEGORY_ICONS[item.category];
}
