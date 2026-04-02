import { useState, useEffect } from 'react';
import {
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, Timestamp, getCountFromServer, where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Slot, SlotInput } from '../lib/types';

export function useSlots(orgId: string | undefined, eventId: string | undefined) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !eventId) { setSlots([]); setLoading(false); return; }
    const slotsRef = collection(db, 'organizations', orgId, 'events', eventId, 'slots');
    const unsubscribe = onSnapshot(slotsRef, async (snapshot) => {
      try {
        const slotList: Slot[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          let quantityFilled = 0;
          try {
            const signupsRef = collection(db, 'organizations', orgId, 'signups');
            const q = query(signupsRef, where('eventId', '==', eventId), where('slotId', '==', docSnap.id));
            const countSnap = await getCountFromServer(q);
            quantityFilled = countSnap.data().count;
          } catch { /* use 0 */ }
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
        slotList.sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category);
          if (a.startTime && b.startTime) return a.startTime.getTime() - b.startTime.getTime();
          return 0;
        });
        setSlots(slotList);
        setLoading(false);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load slots');
        setLoading(false);
      }
    }, (err) => { setError(err.message); setLoading(false); });
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

  async function updateSlot(slotId: string, data: Partial<SlotInput>): Promise<void> {
    if (!orgId || !eventId) throw new Error('No organization or event selected');
    const slotRef = doc(db, 'organizations', orgId, 'events', eventId, 'slots', slotId);
    const updateData: Record<string, unknown> = { ...data };
    if (data.startTime) updateData.startTime = Timestamp.fromDate(data.startTime);
    if (data.endTime) updateData.endTime = Timestamp.fromDate(data.endTime);
    await updateDoc(slotRef, updateData);
  }

  async function deleteSlot(slotId: string): Promise<void> {
    if (!orgId || !eventId) throw new Error('No organization or event selected');
    await deleteDoc(doc(db, 'organizations', orgId, 'events', eventId, 'slots', slotId));
  }

  return { slots, loading, error, createSlot, updateSlot, deleteSlot };
}
