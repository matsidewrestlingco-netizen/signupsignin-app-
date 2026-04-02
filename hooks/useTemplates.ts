import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { EventTemplate } from '../lib/types';

export function useTemplates(orgId: string | undefined) {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) { setTemplates([]); setLoading(false); return; }
    const templatesRef = collection(db, 'organizations', orgId, 'templates');
    const q = query(templatesRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: EventTemplate[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id, name: data.name, description: data.description || '',
          eventTitle: data.eventTitle, eventDescription: data.eventDescription || '',
          eventLocation: data.eventLocation || '', durationHours: data.durationHours,
          slots: data.slots || [], createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        });
      });
      setTemplates(list); setLoading(false); setError(null);
    }, (err) => { setError('Failed to load templates'); setLoading(false); });
    return () => unsubscribe();
  }, [orgId]);

  async function createTemplate(data: Omit<EventTemplate, 'id' | 'createdAt'>) {
    if (!orgId) throw new Error('No organization selected');
    await addDoc(collection(db, 'organizations', orgId, 'templates'), {
      ...data, createdAt: Timestamp.now(),
    });
  }

  async function deleteTemplate(templateId: string) {
    if (!orgId) throw new Error('No organization selected');
    await deleteDoc(doc(db, 'organizations', orgId, 'templates', templateId));
  }

  return { templates, loading, error, createTemplate, deleteTemplate };
}
