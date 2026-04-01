import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  getDocs,
  where,
  updateDoc,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { SlotCard } from '../components/SlotCard';
import type { Event } from '../hooks/useEvents';
import type { Slot } from '../hooks/useSlots';
import { useSignups } from '../hooks/useSignups';
import { AddToCalendar } from '../components/AddToCalendar';

export function EventDetail() {
  const { orgId, eventId } = useParams<{ orgId: string; eventId: string }>();
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState<Event | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [userSignupSlots, setUserSignupSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingUp, setSigningUp] = useState<string | null>(null);
  const [orgBranding, setOrgBranding] = useState<{ primaryColor: string; logoUrl?: string; name: string } | null>(null);

  const { createSignup } = useSignups(orgId);

  useEffect(() => {
    async function fetchData() {
      if (!orgId || !eventId) return;

      try {
        // Fetch event
        const eventDoc = await getDoc(
          doc(db, 'organizations', orgId, 'events', eventId)
        );
        if (!eventDoc.exists()) {
          setError('Event not found');
          setLoading(false);
          return;
        }

        const eventData = eventDoc.data();
        setEvent({
          id: eventDoc.id,
          title: eventData.title,
          startTime: (eventData.startTime as Timestamp)?.toDate() || new Date(),
          endTime: eventData.endTime
            ? (eventData.endTime as Timestamp).toDate()
            : undefined,
          location: eventData.location || '',
          description: eventData.description || '',
          isPublic: eventData.isPublic ?? true,
          createdAt: (eventData.createdAt as Timestamp)?.toDate() || new Date(),
        });

        // Fetch org branding
        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          setOrgBranding({
            name: orgData.name,
            primaryColor: orgData.branding?.primaryColor || '#243c7c',
            logoUrl: orgData.branding?.logoUrl,
          });
        }

        // Fetch slots with signup counts
        const slotsRef = collection(
          db,
          'organizations',
          orgId,
          'events',
          eventId,
          'slots'
        );
        const slotsQuery = query(slotsRef, orderBy('category'), orderBy('startTime'));
        const slotsSnapshot = await getDocs(slotsQuery);

        const slotList: Slot[] = [];
        for (const docSnap of slotsSnapshot.docs) {
          const data = docSnap.data();

          let quantityFilled = data.quantityFilled || 0;

          // Self-heal negative counts (can happen if signups existed before increment tracking)
          if (quantityFilled < 0 && currentUser) {
            try {
              const countSnap = await getCountFromServer(
                query(
                  collection(db, 'organizations', orgId, 'signups'),
                  where('slotId', '==', docSnap.id)
                )
              );
              quantityFilled = countSnap.data().count;
              await updateDoc(
                doc(db, 'organizations', orgId, 'events', eventId, 'slots', docSnap.id),
                { quantityFilled }
              );
            } catch {
              quantityFilled = 0;
            }
          }

          slotList.push({
            id: docSnap.id,
            name: data.name,
            category: data.category || 'General',
            quantityTotal: data.quantityTotal || 1,
            quantityFilled,
            startTime: data.startTime
              ? (data.startTime as Timestamp).toDate()
              : undefined,
            endTime: data.endTime
              ? (data.endTime as Timestamp).toDate()
              : undefined,
            description: data.description || '',
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        }

        setSlots(slotList);

        // Fetch user's signups for this event
        if (currentUser) {
          const userSignupsRef = collection(db, 'organizations', orgId, 'signups');
          const userSignupsQuery = query(
            userSignupsRef,
            where('eventId', '==', eventId),
            where('userId', '==', currentUser.uid)
          );
          const userSignupsSnapshot = await getDocs(userSignupsQuery);
          const signedUpSlots = new Set<string>();
          userSignupsSnapshot.forEach((doc) => {
            signedUpSlots.add(doc.data().slotId);
          });
          setUserSignupSlots(signedUpSlots);
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgId, eventId, currentUser]);

  async function handleSignUp(slotId: string) {
    if (!currentUser || !userProfile || !orgId || !eventId) {
      navigate('/login', { state: { from: location } });
      return;
    }

    setSigningUp(slotId);

    try {
      await createSignup({
        eventId,
        slotId,
        userId: currentUser.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
      });

      // Add org to parent's profile so "My Signups" can find their signups
      if (orgId && !userProfile.organizations?.[orgId]) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          [`organizations.${orgId}`]: 'member',
        });
        await refreshProfile();
      }

      setUserSignupSlots((prev) => new Set([...prev, slotId]));

      // Update slot count locally
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { ...s, quantityFilled: s.quantityFilled + 1 } : s
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setSigningUp(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {error || 'Event not found'}
          </h2>
          <Link
            to={`/events/${orgId}`}
            className="mt-4 inline-block text-primary-600 hover:text-primary-500"
          >
            Back to events
          </Link>
        </div>
      </div>
    );
  }

  // Group slots by category
  const slotsByCategory = slots.reduce((acc, slot) => {
    if (!acc[slot.category]) {
      acc[slot.category] = [];
    }
    acc[slot.category].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  const brandColor = orgBranding?.primaryColor || '#243c7c';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="shadow" style={{ backgroundColor: brandColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                to={`/events/${orgId}`}
                className="text-sm text-white/80 hover:text-white"
              >
                &larr; Back to events
              </Link>
              <div className="flex items-center gap-3 mt-2">
                {orgBranding?.logoUrl && (
                  <img
                    src={orgBranding.logoUrl}
                    alt={`${orgBranding.name} logo`}
                    className="h-10 w-auto bg-white rounded p-1"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {event.title}
                  </h1>
                  <div className="text-sm text-white/80 mt-1">
                    <p>{format(event.startTime, 'EEEE, MMMM d, yyyy')}</p>
                    {event.location && <p>{event.location}</p>}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <AddToCalendar
                title={event.title}
                description={event.description}
                location={event.location}
                startTime={event.startTime}
                endTime={event.endTime}
              />
              {currentUser ? (
                <Link to="/parent" className="px-4 py-2 bg-white/20 text-white rounded-md hover:bg-white/30 transition-colors">
                  My Signups
                </Link>
              ) : (
                <Link to="/login" state={{ from: location }} className="px-4 py-2 bg-white text-gray-900 rounded-md hover:bg-gray-100 transition-colors">
                  Log in to Sign Up
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {event.description && (
          <div className="card mb-8">
            <div className="card-body">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                About this event
              </h2>
              <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
            </div>
          </div>
        )}

        {slots.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No volunteer slots available yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(slotsByCategory).map(([category, categorySlots]) => (
              <section key={category}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {category}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {categorySlots.map((slot) => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      isSignedUp={userSignupSlots.has(slot.id)}
                      onSignUp={
                        signingUp === slot.id
                          ? undefined
                          : () => handleSignUp(slot.id)
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        <p className="mt-8 text-center text-sm text-gray-400">
          Want to run your own events?{' '}
          <Link to="/setup/organization" className="text-gray-500 hover:text-gray-700">
            Create an organization →
          </Link>
        </p>
      </main>
    </div>
  );
}
