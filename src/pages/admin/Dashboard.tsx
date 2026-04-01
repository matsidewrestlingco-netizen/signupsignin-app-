import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import { EventCard } from '../../components/EventCard';

interface Stats {
  totalEvents: number;
  totalSignups: number;
  checkedIn: number;
  upcomingEvents: number;
}

export function AdminDashboard() {
  const { currentOrg } = useOrg();
  const { events, loading: eventsLoading } = useEvents(currentOrg?.id);
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    totalSignups: 0,
    checkedIn: 0,
    upcomingEvents: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!currentOrg?.id) {
        setLoadingStats(false);
        return;
      }

      try {
        // Count total signups
        const signupsRef = collection(db, 'organizations', currentOrg.id, 'signups');
        const totalSnapshot = await getCountFromServer(query(signupsRef));
        const totalSignups = totalSnapshot.data().count;

        // Count checked in
        const checkedInSnapshot = await getCountFromServer(
          query(signupsRef, where('checkedIn', '==', true))
        );
        const checkedIn = checkedInSnapshot.data().count;

        // Count upcoming events
        const upcomingEvents = events.filter(
          (e) => e.startTime >= new Date()
        ).length;

        setStats({
          totalEvents: events.length,
          totalSignups,
          checkedIn,
          upcomingEvents,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoadingStats(false);
      }
    }

    if (!eventsLoading) {
      fetchStats();
    }
  }, [currentOrg?.id, events, eventsLoading]);

  const upcomingEvents = events
    .filter((e) => e.startTime >= new Date())
    .slice(0, 3);

  const loading = eventsLoading || loadingStats;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome to {currentOrg?.name || 'your organization'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-gray-500">Total Events</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-gray-500">Upcoming Events</p>
                <p className="text-3xl font-bold text-primary-700">
                  {stats.upcomingEvents}
                </p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-gray-500">Total Signups</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalSignups}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-gray-500">Checked In</p>
                <p className="text-3xl font-bold text-green-600">{stats.checkedIn}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <Link to="/admin/events" className="text-primary-600 hover:text-primary-500">
              View all events
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-8">
                <p className="text-gray-500 mb-4">No upcoming events</p>
                <Link to="/admin/events" className="btn-primary">
                  Create your first event
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <Link key={event.id} to={`/admin/events/${event.id}`}>
                  <EventCard event={event} />
                </Link>
              ))}
            </div>
          )}

          {currentOrg && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900">Share your events</h3>
              <p className="text-sm text-blue-700 mt-1">
                Parents can view and sign up for public events at:
              </p>
              <code className="block mt-2 p-2 bg-white rounded text-sm text-blue-800">
                {window.location.origin}/events/{currentOrg.id}
              </code>
            </div>
          )}
        </>
      )}
    </div>
  );
}
