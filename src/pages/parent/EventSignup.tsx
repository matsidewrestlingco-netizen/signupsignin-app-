import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { doc, getDoc, collection, query, orderBy, getDocs, where, getCountFromServer, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useSignups } from '../../hooks/useSignups';
import { SlotCard } from '../../components/SlotCard';
import type { Event } from '../../hooks/useEvents';
import type { Slot } from '../../hooks/useSlots';

export function ParentEventSignup() {
  const { eventId } = useParams<{ eventId: string }>();
  const { currentUser, userProfile } = useAuth();
  const { currentOrg } = useOrg();
  const { createSignup } = useSignups(currentOrg?.id);

  const [event, setEvent] = useState<Event | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [userSignupSlots, setUserSignupSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [signingUp, setSigningUp] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!currentOrg?.id || !eventId) return;

      try {
        // Fetch event
        const eventDoc = await getDoc(doc(db, 'organizations', currentOrg.id, 'events', eventId));
        if (!eventDoc.exists()) {
          setLoading(false);
          return;
        }

        const eventData = eventDoc.data();
        setEvent({
          id: eventDoc.id,
          title: eventData.title,
          startTime: (eventData.startTime as Timestamp)?.toDate() || new Date(),
          endTime: eventData.endTime ? (eventData.endTime as Timestamp).toDate() : undefined,
          location: eventData.location || '',
          description: eventData.description || '',
          isPublic: eventData.isPublic ?? true,
          createdAt: (eventData.createdAt as Timestamp)?.toDate() || new Date(),
        });

        // Fetch slots
        const slotsRef = collection(db, 'organizations', currentOrg.id, 'events', eventId, 'slots');
        const slotsQuery = query(slotsRef, orderBy('category'), orderBy('startTime'));
        const slotsSnapshot = await getDocs(slotsQuery);

        const slotList: Slot[] = [];
        for (const docSnap of slotsSnapshot.docs) {
          const data = docSnap.data();

          // Get signup count
          const signupsRef = collection(db, 'organizations', currentOrg.id, 'signups');
          const signupsQuery = query(
            signupsRef,
            where('eventId', '==', eventId),
            where('slotId', '==', docSnap.id)
          );
          const countSnapshot = await getCountFromServer(signupsQuery);

          slotList.push({
            id: docSnap.id,
            name: data.name,
            category: data.category || 'General',
            quantityTotal: data.quantityTotal || 1,
            quantityFilled: countSnapshot.data().count,
            startTime: data.startTime ? (data.startTime as Timestamp).toDate() : undefined,
            endTime: data.endTime ? (data.endTime as Timestamp).toDate() : undefined,
            description: data.description || '',
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        }

        setSlots(slotList);

        // Fetch user's signups
        if (currentUser) {
          const userSignupsRef = collection(db, 'organizations', currentOrg.id, 'signups');
          const userSignupsQuery = query(
            userSignupsRef,
            where('eventId', '==', eventId),
            where('userId', '==', currentUser.uid)
          );
          const userSignupsSnapshot = await getDocs(userSignupsQuery);
          const signedUpSlots = new Set<string>();
          userSignupsSnapshot.forEach(doc => {
            signedUpSlots.add(doc.data().slotId);
          });
          setUserSignupSlots(signedUpSlots);
        }
      } catch (err) {
        console.error('Error fetching event:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentOrg?.id, eventId, currentUser]);

  const handleSignUp = async (slotId: string) => {
    if (!currentUser || !userProfile || !eventId) return;

    setSigningUp(slotId);
    try {
      await createSignup({
        eventId,
        slotId,
        userId: currentUser.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
      });

      setUserSignupSlots(prev => new Set([...prev, slotId]));
      setSlots(prev =>
        prev.map(s => s.id === slotId ? { ...s, quantityFilled: s.quantityFilled + 1 } : s)
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setSigningUp(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Event not found</p>
        <Link to="/parent" className="text-primary-600 hover:text-primary-500 mt-2 inline-block">
          Back to my signups
        </Link>
      </div>
    );
  }

  const slotsByCategory = slots.reduce((acc, slot) => {
    if (!acc[slot.category]) acc[slot.category] = [];
    acc[slot.category].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  return (
    <div>
      <div className="page-header">
        <Link to="/parent" className="text-sm text-primary-600 hover:text-primary-500">
          &larr; Back to my signups
        </Link>
        <h1 className="page-title mt-2">{event.title}</h1>
        <p className="page-subtitle">
          {format(event.startTime, 'EEEE, MMMM d, yyyy')}
          {event.location && ` • ${event.location}`}
        </p>
      </div>

      {event.description && (
        <div className="card mb-6">
          <div className="card-body">
            <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
          </div>
        </div>
      )}

      {slots.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-8">
            <p className="text-gray-500">No volunteer slots available for this event</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(slotsByCategory).map(([category, categorySlots]) => (
            <section key={category}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{category}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {categorySlots.map(slot => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    isSignedUp={userSignupSlots.has(slot.id)}
                    onSignUp={signingUp === slot.id ? undefined : () => handleSignUp(slot.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
