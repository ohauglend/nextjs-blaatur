import { TripState } from '@/data/states';

/**
 * Fetch the current trip state from the API
 */
export async function getCurrentStateFromAPI(): Promise<TripState> {
  try {
    const response = await fetch('/api/state', {
      method: 'GET',
      cache: 'no-store' // Always get fresh data
    });

    if (!response.ok) {
      console.error('Failed to fetch state from API');
      return 'pre-trip'; // Fallback
    }

    const data = await response.json();
    return data.state_id as TripState;
  } catch (error) {
    console.error('Error fetching current state:', error);
    return 'pre-trip'; // Fallback
  }
}

/**
 * Update the trip state via API
 */
export async function updateStateViaAPI(
  newState: TripState,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/state', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state_id: newState,
        updated_by: updatedBy
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Failed to update state' };
    }

    const data = await response.json();
    return { success: data.success };
  } catch (error) {
    console.error('Error updating state:', error);
    return { success: false, error: 'Network error' };
  }
}
