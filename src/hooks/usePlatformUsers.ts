import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  createdAt?: Date;
  organizations: Record<string, string>;
  superAdmin?: boolean;
}

export function usePlatformUsers() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'users'));
      const data: PlatformUser[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          email: d.email,
          name: d.name,
          createdAt: d.createdAt?.toDate?.() || undefined,
          organizations: d.organizations || {},
          superAdmin: d.superAdmin || false,
        };
      });
      setUsers(data);
    } catch (error) {
      console.error('Error loading platform users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return { users, loading, refresh: loadUsers };
}
