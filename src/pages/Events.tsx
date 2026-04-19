import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EventCard } from '../components/EventCard';
import type { Event } from '../hooks/useEvents';

interface Organization {
  name: string;
  type: string;
  branding?: {
    primaryColor: string;
    logoUrl?: string;
  };
}

export function Events() {
  const { orgId } = useParams<{ orgId: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!orgId) return;

      try {
        // Fetch organization
        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        if (!orgDoc.exists()) {
          setError('Organization not found');
          setLoading(false);
          return;
        }
        const orgData = orgDoc.data();
        setOrganization({
          name: orgData.name,
          type: orgData.type,
          branding: orgData.branding || { primaryColor: '#243c7c' },
        });

        // Fetch public events
        const eventsRef = collection(db, 'organizations', orgId, 'events');
        const q = query(
          eventsRef,
          where('isPublic', '==', true),
          orderBy('startTime', 'desc')
        );
        const snapshot = await getDocs(q);

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
            isPublic: true,
            showVolunteerNames: data.showVolunteerNames ?? false,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        });

        setEvents(eventList);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">{error}</h2>
          <Link to="/" className="mt-4 inline-block text-primary-600 hover:text-primary-500">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  const upcomingEvents = events.filter((e) => e.startTime >= new Date());
  const pastEvents = events.filter((e) => e.startTime < new Date());

  const brandColor = organization?.branding?.primaryColor || '#243c7c';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="shadow" style={{ backgroundColor: brandColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {organization?.branding?.logoUrl && (
                <img
                  src={organization.branding.logoUrl}
                  alt={`${organization.name} logo`}
                  className="h-10 w-auto bg-white rounded p-1"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {organization?.name}
                </h1>
                <p className="text-sm text-white/80 mt-1">Public Events</p>
              </div>
            </div>
            <Link to="/" className="text-white/90 hover:text-white">
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No public events available</p>
          </div>
        ) : (
          <>
            {upcomingEvents.length > 0 && (
              <section className="mb-12">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Upcoming Events
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingEvents.map((event) => (
                    <Link key={event.id} to={`/event/${orgId}/${event.id}`}>
                      <EventCard event={event} showStatus={false} />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {pastEvents.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Past Events
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pastEvents.map((event) => (
                    <Link key={event.id} to={`/event/${orgId}/${event.id}`}>
                      <EventCard event={event} showStatus={false} />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
