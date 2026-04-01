import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface OrgEvent {
  id: string;
  title: string;
  date?: Date;
  signupCount: number;
}

export interface OrgDetailData {
  id: string;
  name: string;
  type: string;
  ownerId: string;
  createdAt?: Date;
  events: OrgEvent[];
}

export function usePlatformOrgDetail(orgId: string | undefined) {
  const [orgDetail, setOrgDetail] = useState<OrgDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrgDetail = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const orgDoc = await getDoc(doc(db, 'organizations', orgId));
      if (!orgDoc.exists()) {
        setOrgDetail(null);
        return;
      }

      const data = orgDoc.data();

      // Fetch events and all org signups in parallel
      const [eventsSnap, signupsSnap] = await Promise.all([
        getDocs(collection(db, `organizations/${orgId}/events`)),
        getDocs(collection(db, `organizations/${orgId}/signups`)).catch(() => null),
      ]);

      // Group signup counts by eventId
      const signupsByEvent: Record<string, number> = {};
      if (signupsSnap) {
        for (const signupDoc of signupsSnap.docs) {
          const eventId = signupDoc.data().eventId;
          if (eventId) {
            signupsByEvent[eventId] = (signupsByEvent[eventId] || 0) + 1;
          }
        }
      }

      const events: OrgEvent[] = eventsSnap.docs.map((eventDoc) => {
        const e = eventDoc.data();
        return {
          id: eventDoc.id,
          title: e.title || e.name || 'Untitled',
          date: e.startTime?.toDate?.() || e.date?.toDate?.() || e.startDate?.toDate?.() || undefined,
          signupCount: signupsByEvent[eventDoc.id] || 0,
        };
      });

      setOrgDetail({
        id: orgDoc.id,
        name: data.name,
        type: data.type,
        ownerId: data.ownerId,
        createdAt: data.createdAt?.toDate?.() || undefined,
        events,
      });
    } catch (error) {
      console.error('Error loading org detail:', error);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadOrgDetail();
  }, [loadOrgDetail]);

  return { orgDetail, loading, refresh: loadOrgDetail };
}
