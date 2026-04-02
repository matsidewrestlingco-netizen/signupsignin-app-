import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SlotCounts {
  total: number;
  filled: number;
}

/**
 * Fetches aggregate slot counts (total capacity + filled) for a list of events.
 * Returns a map of eventId → { total, filled } for use in EventCard.
 * Uses one-time getDocs per event (not a live listener) — suitable for dashboard previews.
 */
export function useEventSlotCounts(
  orgId: string | undefined,
  eventIds: string[]
): Record<string, SlotCounts> {
  const [counts, setCounts] = useState<Record<string, SlotCounts>>({});

  useEffect(() => {
    if (!orgId || eventIds.length === 0) return;

    Promise.all(
      eventIds.map(async (eventId) => {
        const snap = await getDocs(
          collection(db, 'organizations', orgId, 'events', eventId, 'slots')
        );
        const total = snap.docs.reduce(
          (sum, d) => sum + ((d.data().quantityTotal as number) || 0),
          0
        );
        const filled = snap.docs.reduce(
          (sum, d) => sum + ((d.data().quantityFilled as number) || 0),
          0
        );
        return { eventId, total, filled };
      })
    )
      .then((results) => {
        setCounts((prev) => {
          const next = { ...prev };
          results.forEach(({ eventId, total, filled }) => {
            next[eventId] = { total, filled };
          });
          return next;
        });
      })
      .catch(() => {
        // Fail silently — cards show 0/0 rather than crashing
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, eventIds.join(',')]);

  return counts;
}
