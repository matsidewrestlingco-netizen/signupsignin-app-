import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  location: string;
  description: string;
  isPublic: boolean;
  showVolunteerNames: boolean;
  createdAt: Date;
}

export interface EventInput {
  title: string;
  startTime: Date;
  endTime?: Date;
  location: string;
  description: string;
  isPublic: boolean;
  showVolunteerNames: boolean;
}

export function useEvents(orgId: string | undefined) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const eventsRef = collection(db, 'organizations', orgId, 'events');
    const q = query(eventsRef, orderBy('startTime', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eventList: Event[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          eventList.push({
            id: doc.id,
            title: data.title,
            startTime: (data.startTime as Timestamp)?.toDate() || new Date(),
            endTime: data.endTime ? (data.endTime as Timestamp).toDate() : undefined,
            location: data.location || '',
            description: data.description || '',
            isPublic: data.isPublic ?? true,
            showVolunteerNames: data.showVolunteerNames ?? false,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        });
        setEvents(eventList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching events:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orgId]);

  async function createEvent(data: EventInput): Promise<string> {
    if (!orgId) throw new Error('No organization selected');

    const eventsRef = collection(db, 'organizations', orgId, 'events');
    const docRef = await addDoc(eventsRef, {
      ...data,
      startTime: Timestamp.fromDate(data.startTime),
      endTime: data.endTime ? Timestamp.fromDate(data.endTime) : null,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  }

  async function updateEvent(eventId: string, data: Partial<EventInput>): Promise<void> {
    if (!orgId) throw new Error('No organization selected');

    const eventRef = doc(db, 'organizations', orgId, 'events', eventId);
    const updateData: Record<string, unknown> = { ...data };

    if (data.startTime) {
      updateData.startTime = Timestamp.fromDate(data.startTime);
    }
    if (data.endTime) {
      updateData.endTime = Timestamp.fromDate(data.endTime);
    }

    await updateDoc(eventRef, updateData);
  }

  async function deleteEvent(eventId: string): Promise<void> {
    if (!orgId) throw new Error('No organization selected');

    const eventRef = doc(db, 'organizations', orgId, 'events', eventId);
    await deleteDoc(eventRef);
  }

  return {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
