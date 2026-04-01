import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PlatformOrg {
  id: string;
  name: string;
  type: string;
  ownerId: string;
  createdAt?: Date;
  eventCount: number;
}

export function usePlatformOrgs() {
  const [organizations, setOrganizations] = useState<PlatformOrg[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrgs = useCallback(async () => {
    try {
      setLoading(true);
      const orgsSnap = await getDocs(collection(db, 'organizations'));
      const orgsData = await Promise.all(
        orgsSnap.docs.map(async (orgDoc) => {
          const data = orgDoc.data();

          let eventCount = 0;
          try {
            const eventsSnap = await getDocs(
              collection(db, `organizations/${orgDoc.id}/events`)
            );
            eventCount = eventsSnap.size;
          } catch {
            // ignore
          }

          return {
            id: orgDoc.id,
            name: data.name,
            type: data.type,
            ownerId: data.ownerId,
            createdAt: data.createdAt?.toDate?.() || undefined,
            eventCount,
          } satisfies PlatformOrg;
        })
      );

      setOrganizations(orgsData);
    } catch (error) {
      console.error('Error loading platform orgs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  return { organizations, loading, refresh: loadOrgs };
}
