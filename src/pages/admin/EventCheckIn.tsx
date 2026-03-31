import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useOrg } from '../../contexts/OrgContext';
import { useSlots } from '../../hooks/useSlots';
import { useSignups } from '../../hooks/useSignups';
import type { Event } from '../../hooks/useEvents';
import type { Signup } from '../../hooks/useSignups';

export function EventCheckIn() {
  const { eventId } = useParams<{ eventId: string }>();
  const { currentOrg } = useOrg();
  const { slots, loading: slotsLoading } = useSlots(currentOrg?.id, eventId);
  const { signups, loading: signupsLoading, checkIn, undoCheckIn } = useSignups(
    currentOrg?.id,
    eventId
  );

  const [event, setEvent] = useState<Event | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      if (!currentOrg?.id || !eventId) return;
      try {
        const eventDoc = await getDoc(
          doc(db, 'organizations', currentOrg.id, 'events', eventId)
        );
        if (eventDoc.exists()) {
          const data = eventDoc.data();
          setEvent({
            id: eventDoc.id,
            title: data.title,
            startTime: (data.startTime as Timestamp)?.toDate() || new Date(),
            endTime: data.endTime
              ? (data.endTime as Timestamp).toDate()
              : undefined,
            location: data.location || '',
            description: data.description || '',
            isPublic: data.isPublic ?? true,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        }
      } finally {
        setEventLoading(false);
      }
    }
    fetchEvent();
  }, [currentOrg?.id, eventId]);

  const loading = eventLoading || slotsLoading || signupsLoading;

  async function handleCheckIn(signupId: string) {
    setCheckingIn(signupId);
    try {
      await checkIn(signupId);
    } finally {
      setCheckingIn(null);
    }
  }

  async function handleUndoCheckIn(signupId: string) {
    setCheckingIn(signupId);
    try {
      await undoCheckIn(signupId);
    } finally {
      setCheckingIn(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
      </div>
    );
  }

  const checkedInCount = signups.filter((s) => s.checkedIn).length;

  // Index signups by slotId for fast lookup
  const signupsBySlot: Record<string, Signup[]> = {};
  signups.forEach((signup) => {
    if (!signupsBySlot[signup.slotId]) signupsBySlot[signup.slotId] = [];
    signupsBySlot[signup.slotId].push(signup);
  });

  // Group slots by category (slots are already sorted by category+startTime from useSlots)
  const categories: string[] = [];
  const slotsByCategory: Record<string, typeof slots> = {};
  slots.forEach((slot) => {
    if (!slotsByCategory[slot.category]) {
      categories.push(slot.category);
      slotsByCategory[slot.category] = [];
    }
    slotsByCategory[slot.category].push(slot);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3">
        <Link
          to={`/admin/events/${eventId}`}
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          ← Back to Event
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 mt-1 truncate">
          {event?.title}
        </h1>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-gray-500">
            {event && format(event.startTime, 'EEEE, MMMM d')}
          </p>
          <span className="text-sm font-medium text-gray-700">
            {signups.length} volunteer{signups.length !== 1 ? 's' : ''} ·{' '}
            {checkedInCount} checked in
          </span>
        </div>
      </header>

      <main className="px-4 py-4 space-y-6 max-w-2xl mx-auto">
        {slots.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No one has signed up for this event yet.
          </p>
        ) : (
          categories.map((category) => (
            <section key={category}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {category}
              </h2>
              <div className="space-y-3">
                {slotsByCategory[category].map((slot) => {
                  const slotSignups = signupsBySlot[slot.id] || [];
                  const openCount = Math.max(
                    0,
                    slot.quantityTotal - slotSignups.length
                  );

                  return (
                    <div
                      key={slot.id}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                    >
                      {/* Slot header */}
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">
                            {slot.name}
                          </span>
                          {slot.startTime && (
                            <span className="ml-2 text-sm text-gray-500">
                              {format(slot.startTime, 'h:mm a')}
                              {slot.endTime &&
                                ` – ${format(slot.endTime, 'h:mm a')}`}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 shrink-0 ml-2">
                          {slotSignups.length}/{slot.quantityTotal}
                        </span>
                      </div>

                      {/* Person rows */}
                      <ul className="divide-y divide-gray-100">
                        {slotSignups.map((signup) => (
                          <li
                            key={signup.id}
                            className="flex items-center justify-between px-4 py-3 min-h-[56px]"
                          >
                            <div className="flex items-center gap-3">
                              {signup.checkedIn ? (
                                <span className="text-green-500 text-xl leading-none">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xl leading-none">
                                  ○
                                </span>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">
                                  {signup.userName}
                                </p>
                                {signup.checkedIn && signup.checkedInAt && (
                                  <p className="text-xs text-gray-400">
                                    {format(signup.checkedInAt, 'h:mm a')}
                                  </p>
                                )}
                              </div>
                            </div>

                            {signup.checkedIn ? (
                              <button
                                onClick={() => handleUndoCheckIn(signup.id)}
                                disabled={checkingIn === signup.id}
                                className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2 disabled:opacity-50"
                              >
                                Undo
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCheckIn(signup.id)}
                                disabled={checkingIn === signup.id}
                                className="bg-primary-700 text-white text-sm font-medium px-5 py-2.5 rounded-md min-w-[88px] hover:bg-primary-800 active:bg-primary-900 disabled:opacity-50"
                              >
                                {checkingIn === signup.id ? '...' : 'Check In'}
                              </button>
                            )}
                          </li>
                        ))}

                        {/* Open slots */}
                        {Array.from({ length: openCount }).map((_, i) => (
                          <li
                            key={`open-${i}`}
                            className="px-4 py-3 min-h-[56px] flex items-center"
                          >
                            <span className="text-gray-300 text-sm italic ml-8">
                              — open —
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
