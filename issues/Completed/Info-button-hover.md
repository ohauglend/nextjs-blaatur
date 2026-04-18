# Info Button — Issue: Mobile Click Support

## Summary
On mobile devices the ℹ️ info button in `ParticipantHeader` does nothing when tapped, because the panel is shown via CSS `group-hover`, which requires a persistent hover state that touch screens do not support. The panel should appear on click/tap and close when tapping outside.

## Root Cause
`InfoButton` in `components/ParticipantHeader.tsx` is a plain function inside a **server component** file. It uses Tailwind's `group-hover:opacity-100` to reveal the panel — this works on desktop mouse hover but is invisible to touch events.

## Decision
Replace the CSS hover approach with **click-only toggle** (works identically on desktop and mobile; removes hover/click state conflict).

## Implementation Steps

### 1. Create `components/InfoButton.tsx` as a client component
Extract the existing `InfoButton` function into a new file and add click state:

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { PARTICIPANT_ASSETS } from '@/data/participant-assets';

export default function InfoButton({ participantId }: { participantId: string }) {
  const assets = PARTICIPANT_ASSETS[participantId];
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking/tapping outside the panel
  useEffect(() => {
    if (!isOpen) return;
    function handleOutsideClick(e: MouseEvent | TouchEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-3 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
        aria-label="Trip information"
        aria-expanded={isOpen}
      >
        <span className="text-xl">ℹ️</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white shadow-2xl rounded-lg p-4 border z-50">
          {/* ... same info panel content as before ... */}
        </div>
      )}
    </div>
  );
}
```

### 2. Update `components/ParticipantHeader.tsx`
- Add `import InfoButton from '@/components/InfoButton';` at the top
- Remove the inline `InfoButton` function at the bottom of the file
- The `<InfoButton participantId={participantId} />` call in the JSX stays unchanged

## Files Changed
- `components/InfoButton.tsx` — new client component (extracted + click toggle added)
- `components/ParticipantHeader.tsx` — import new file, delete inline `InfoButton` function

## Verification
1. **Mobile (touch):** Tap ℹ️ → panel opens; tap ℹ️ again → panel closes
2. **Mobile (touch):** Tap anywhere outside the panel → panel closes
3. **Desktop:** Click ℹ️ → panel opens; click outside → panel closes
4. `ParticipantHeader` server component renders without errors (client component import is allowed)
5. ARIA `aria-expanded` attribute reflects the open/closed state correctly
