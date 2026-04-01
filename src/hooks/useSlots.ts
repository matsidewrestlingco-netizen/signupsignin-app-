import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getCountFromServer,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Slot {
  id: string;
  name: string;
  category: string;
  quantityTotal: number;
  quantityFilled: number;
  startTime?: Date;
  endTime?: Date;
  description: string;
  createdAt: Date;
}

export interface SlotInput {
  name: string;
  category: string;
  quantityTotal: number;
  startTime?: Date;
  endTime?: Date;
  description: string;
}

export function useSlots(orgId: string | undefined, eventId: string | undefined) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !eventId) {
      setSlots([]);
      setLoading(false);
      return;
    }

    const slotsRef = collection(db, 'organizations', orgId, 'events', eventId, 'slots');

    const unsubscribe = onSnapshot(
      slotsRef,
      async (snapshot) => {
        try {
          const slotList: Slot[] = [];

          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();

            // Get signup count for this slot
            let quantityFilled = 0;
            try {
              const signupsRef = collection(db, 'organizations', orgId, 'signups');
              const signupsQuery = query(
                signupsRef,
                where('eventId', '==', eventId),
                where('slotId', '==', docSnap.id)
              );
              const countSnapshot = await getCountFromServer(signupsQuery);
              quantityFilled = countSnapshot.data().count;
            } catch (e) {
              console.warn('Could not get signup count:', e);
            }

            slotList.push({
              id: docSnap.id,
              name: data.name,
              category: data.category || 'General',
              quantityTotal: data.quantityTotal || 1,
              quantityFilled,
              startTime: data.startTime ? (data.startTime as Timestamp).toDate() : undefined,
              endTime: data.endTime ? (data.endTime as Timestamp).toDate() : undefined,
              description: data.description || '',
              createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            });
          }

          // Sort client-side by category then startTime
          slotList.sort((a, b) => {
            if (a.category !== b.category) {
              return a.category.localeCompare(b.category);
            }
            if (a.startTime && b.startTime) {
              return a.startTime.getTime() - b.startTime.getTime();
            }
            return 0;
          });

          setSlots(slotList);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing slots:', err);
          setError(err instanceof Error ? err.message : 'Failed to load slots');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching slots:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orgId, eventId]);

  async function createSlot(data: SlotInput): Promise<string> {
    if (!orgId || !eventId) throw new Error('No organization or event selected');

    const slotsRef = collection(db, 'organizations', orgId, 'events', eventId, 'slots');
    const docRef = await addDoc(slotsRef, {
      ...data,
      startTime: data.startTime ? Timestamp.fromDate(data.startTime) : null,
      endTime: data.endTime ? Timestamp.fromDate(data.endTime) : null,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  }

  async function createSlotForEvent(targetOrgId: string, targetEventId: string, data: SlotInput): Promise<string> {
    const slotsRef = collection(db, 'organizations', targetOrgId, 'events', targetEventId, 'slots');
    const docRef = await addDoc(slotsRef, {
      ...data,
      startTime: data.startTime ? Timestamp.fromDate(data.startTime) : null,
      endTime: data.endTime ? Timestamp.fromDate(data.endTime) : null,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  }

  async function updateSlot(slotId: string, data: Partial<SlotInput>): Promise<void> {
    if (!orgId || !eventId) throw new Error('No organization or event selected');

    const slotRef = doc(db, 'organizations', orgId, 'events', eventId, 'slots', slotId);
    const updateData: Record<string, unknown> = { ...data };

    if (data.startTime) {
      updateData.startTime = Timestamp.fromDate(data.startTime);
    }
    if (data.endTime) {
      updateData.endTime = Timestamp.fromDate(data.endTime);
    }

    await updateDoc(slotRef, updateData);
  }

  async function deleteSlot(slotId: string): Promise<void> {
    if (!orgId || !eventId) throw new Error('No organization or event selected');

    const slotRef = doc(db, 'organizations', orgId, 'events', eventId, 'slots', slotId);
    await deleteDoc(slotRef);
  }

  return {
    slots,
    loading,
    error,
    createSlot,
    createSlotForEvent,
    updateSlot,
    deleteSlot,
  };
}
