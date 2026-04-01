import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SlotTemplate {
  name: string;
  category: string;
  quantityTotal: number;
  description: string;
  // Duration in minutes (relative, not absolute times)
  durationMinutes?: number;
  // Offset from event start in minutes
  offsetFromEventStart?: number;
}

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  eventTitle: string;
  eventDescription: string;
  eventLocation: string;
  // Duration in hours
  durationHours?: number;
  slots: SlotTemplate[];
  createdAt: Date;
}

export function useTemplates(orgId: string | undefined) {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const templatesRef = collection(db, 'organizations', orgId, 'templates');
    const q = query(templatesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const templateList: EventTemplate[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          templateList.push({
            id: docSnap.id,
            name: data.name,
            description: data.description || '',
            eventTitle: data.eventTitle,
            eventDescription: data.eventDescription || '',
            eventLocation: data.eventLocation || '',
            durationHours: data.durationHours,
            slots: data.slots || [],
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        });
        setTemplates(templateList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching templates:', err);
        setError('Failed to load templates');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orgId]);

  async function createTemplate(data: {
    name: string;
    description?: string;
    eventTitle: string;
    eventDescription?: string;
    eventLocation?: string;
    durationHours?: number;
    slots: SlotTemplate[];
  }) {
    if (!orgId) throw new Error('No organization selected');

    const templatesRef = collection(db, 'organizations', orgId, 'templates');
    await addDoc(templatesRef, {
      ...data,
      createdAt: Timestamp.now(),
    });
  }

  async function deleteTemplate(templateId: string) {
    if (!orgId) throw new Error('No organization selected');

    await deleteDoc(doc(db, 'organizations', orgId, 'templates', templateId));
  }

  return {
    templates,
    loading,
    error,
    createTemplate,
    deleteTemplate,
  };
}
