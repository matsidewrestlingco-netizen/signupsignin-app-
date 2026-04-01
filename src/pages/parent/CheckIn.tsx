import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { StatusBadge } from '../../components/StatusBadge';

interface CheckInItem {
  signupId: string;
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  slotId: string;
  slotName: string;
  slotTime?: string;
  checkedIn: boolean;
  checkedInAt?: Date;
}

export function ParentCheckIn() {
  const { currentUser } = useAuth();
  const { currentOrg } = useOrg();
  const [items, setItems] = useState<CheckInItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSignups() {
      if (!currentOrg?.id || !currentUser?.uid) {
        setLoading(false);
        return;
      }

      try {
        const signupsRef = collection(db, 'organizations', currentOrg.id, 'signups');
        const q = query(signupsRef, where('userId', '==', currentUser.uid));
        const snapshot = await getDocs(q);

        const checkInItems: CheckInItem[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();

          // Fetch event
          const eventDoc = await getDoc(
            doc(db, 'organizations', currentOrg.id, 'events', data.eventId)
          );
          if (!eventDoc.exists()) continue;
          const eventData = eventDoc.data();
          const eventDate = (eventData.startTime as Timestamp)?.toDate();

          // Only show events from today onwards
          if (eventDate < today) continue;

          // Fetch slot
          const slotDoc = await getDoc(
            doc(db, 'organizations', currentOrg.id, 'events', data.eventId, 'slots', data.slotId)
          );
          if (!slotDoc.exists()) continue;
          const slotData = slotDoc.data();

          let slotTime: string | undefined;
          if (slotData.startTime) {
            const start = (slotData.startTime as Timestamp).toDate();
            slotTime = format(start, 'h:mm a');
            if (slotData.endTime) {
              const end = (slotData.endTime as Timestamp).toDate();
              slotTime += ` - ${format(end, 'h:mm a')}`;
            }
          }

          checkInItems.push({
            signupId: docSnap.id,
            eventId: data.eventId,
            eventTitle: eventData.title,
            eventDate,
            slotId: data.slotId,
            slotName: slotData.name,
            slotTime,
            checkedIn: data.checkedIn ?? false,
            checkedInAt: data.checkedInAt ? (data.checkedInAt as Timestamp).toDate() : undefined,
          });
        }

        // Sort by event date
        checkInItems.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
        setItems(checkInItems);
      } catch (err) {
        console.error('Error fetching check-in items:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSignups();
  }, [currentOrg?.id, currentUser?.uid]);

  const handleCheckIn = async (signupId: string) => {
    if (!currentOrg?.id) return;

    setCheckingIn(signupId);
    try {
      const signupRef = doc(db, 'organizations', currentOrg.id, 'signups', signupId);
      await updateDoc(signupRef, {
        checkedIn: true,
        checkedInAt: serverTimestamp(),
      });

      setItems(prev =>
        prev.map(item =>
          item.signupId === signupId
            ? { ...item, checkedIn: true, checkedInAt: new Date() }
            : item
        )
      );
    } catch (err) {
      alert('Failed to check in');
    } finally {
      setCheckingIn(null);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayItems = items.filter(item => {
    const d = new Date(item.eventDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const futureItems = items.filter(item => {
    const d = new Date(item.eventDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Check In</h1>
        <p className="page-subtitle">Mark yourself as present for your volunteer shifts</p>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-gray-500">No upcoming signups to check in for</p>
          </div>
        </div>
      ) : (
        <>
          {todayItems.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Today - {format(today, 'MMMM d, yyyy')}
              </h2>
              <div className="space-y-4">
                {todayItems.map(item => (
                  <div key={item.signupId} className="card">
                    <div className="card-body">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.eventTitle}</h3>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                              {item.slotName}
                            </span>
                            {item.slotTime && (
                              <span className="ml-2 text-sm text-gray-500">{item.slotTime}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <StatusBadge checkedIn={item.checkedIn} checkedInAt={item.checkedInAt} />
                          {!item.checkedIn && (
                            <button
                              onClick={() => handleCheckIn(item.signupId)}
                              disabled={checkingIn === item.signupId}
                              className="btn-primary"
                            >
                              {checkingIn === item.signupId ? 'Checking in...' : 'Check In'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {todayItems.length === 0 && (
            <div className="card mb-8">
              <div className="card-body text-center py-8">
                <p className="text-gray-500">No events to check in for today</p>
              </div>
            </div>
          )}

          {futureItems.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming</h2>
              <div className="space-y-4">
                {futureItems.map(item => (
                  <div key={item.signupId} className="card opacity-75">
                    <div className="card-body">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.eventTitle}</h3>
                          <p className="text-sm text-gray-500">
                            {format(item.eventDate, 'EEEE, MMMM d, yyyy')}
                          </p>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {item.slotName}
                            </span>
                            {item.slotTime && (
                              <span className="ml-2 text-sm text-gray-500">{item.slotTime}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-400">
                          Check-in available on event day
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
