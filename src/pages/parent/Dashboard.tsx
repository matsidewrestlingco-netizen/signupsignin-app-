import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useMySignups } from '../../hooks/useSignups';
import type { Signup } from '../../hooks/useSignups';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AddToCalendar } from '../../components/AddToCalendar';

interface SignupWithDetails extends Signup {
  eventTitle: string;
  eventDate: Date;
  slotName: string;
  slotTime?: string;
}

export function ParentDashboard() {
  const { currentUser } = useAuth();
  const { currentOrg } = useOrg();
  const { signups, loading, error: signupsError, cancelSignup } = useMySignups(currentOrg?.id, currentUser?.uid);
  const [signupsWithDetails, setSignupsWithDetails] = useState<SignupWithDetails[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    async function fetchDetails() {
      if (!currentOrg?.id || signups.length === 0) {
        setSignupsWithDetails([]);
        setLoadingDetails(false);
        return;
      }

      const results = await Promise.all(
        signups.map(async (signup) => {
          try {
            const [eventDoc, slotDoc] = await Promise.all([
              getDoc(doc(db, 'organizations', currentOrg.id, 'events', signup.eventId)),
              getDoc(doc(db, 'organizations', currentOrg.id, 'events', signup.eventId, 'slots', signup.slotId)),
            ]);

            const eventData = eventDoc.data();
            const slotData = slotDoc.data();

            if (!eventData || !slotData) return null;

            let slotTime: string | undefined;
            if (slotData.startTime) {
              const start = (slotData.startTime as Timestamp).toDate();
              slotTime = format(start, 'h:mm a');
              if (slotData.endTime) {
                const end = (slotData.endTime as Timestamp).toDate();
                slotTime += ` - ${format(end, 'h:mm a')}`;
              }
            }

            return {
              ...signup,
              eventTitle: eventData.title,
              eventDate: (eventData.startTime as Timestamp)?.toDate() || new Date(),
              slotName: slotData.name,
              slotTime,
            } as SignupWithDetails;
          } catch (err) {
            console.error('Error fetching signup details:', err);
            return null;
          }
        })
      );

      const details = results.filter((d): d is SignupWithDetails => d !== null);
      details.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
      setSignupsWithDetails(details);
      setLoadingDetails(false);
    }

    if (!loading) {
      fetchDetails();
    }
  }, [currentOrg?.id, signups, loading]);

  const handleCancelSignup = async () => {
    if (!cancellingId || !currentOrg?.id) return;

    try {
      await cancelSignup(cancellingId);
      setShowCancelModal(false);
      setCancellingId(null);
    } catch (err) {
      alert('Failed to cancel signup');
    }
  };

  const upcomingSignups = signupsWithDetails.filter(s => s.eventDate >= new Date());
  const pastSignups = signupsWithDetails.filter(s => s.eventDate < new Date());

  const isLoading = loading || loadingDetails;

  return (
    <div>
      {signupsError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{signupsError}</p>
        </div>
      )}
      <div className="page-header">
        <h1 className="page-title">My Signups</h1>
        <p className="page-subtitle">View and manage your volunteer signups</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
        </div>
      ) : signupsWithDetails.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-gray-500 mb-4">You haven't signed up for any events yet</p>
            <p className="text-sm text-gray-400">
              Ask your organization admin for a link to browse available events
            </p>
          </div>
        </div>
      ) : (
        <>
          {upcomingSignups.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Upcoming ({upcomingSignups.length})
              </h2>
              <div className="space-y-4">
                {upcomingSignups.map((signup) => (
                  <div key={signup.id} className="card">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link
                            to={`/event/${currentOrg?.id}/${signup.eventId}`}
                            className="font-semibold text-gray-900 hover:text-primary-600"
                          >
                            {signup.eventTitle}
                          </Link>
                          <p className="text-sm text-gray-500 mt-1">
                            {format(signup.eventDate, 'EEEE, MMMM d, yyyy')}
                          </p>
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                              {signup.slotName}
                            </span>
                            {signup.slotTime && (
                              <span className="ml-2 text-sm text-gray-500">{signup.slotTime}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <StatusBadge checkedIn={signup.checkedIn} checkedInAt={signup.checkedInAt} />
                          <AddToCalendar
                            title={`${signup.slotName} - ${signup.eventTitle}`}
                            startTime={signup.eventDate}
                            description={`Volunteer slot: ${signup.slotName}`}
                          />
                          {!signup.checkedIn && (
                            <button
                              onClick={() => {
                                setCancellingId(signup.id);
                                setShowCancelModal(true);
                              }}
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              Cancel
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

          {pastSignups.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Past ({pastSignups.length})
              </h2>
              <div className="space-y-4">
                {pastSignups.map((signup) => (
                  <div key={signup.id} className="card opacity-75">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link
                            to={`/event/${currentOrg?.id}/${signup.eventId}`}
                            className="font-semibold text-gray-900 hover:text-primary-600"
                          >
                            {signup.eventTitle}
                          </Link>
                          <p className="text-sm text-gray-500 mt-1">
                            {format(signup.eventDate, 'EEEE, MMMM d, yyyy')}
                          </p>
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {signup.slotName}
                            </span>
                          </div>
                        </div>
                        <StatusBadge checkedIn={signup.checkedIn} checkedInAt={signup.checkedInAt} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <p className="mt-8 text-center text-sm text-gray-400">
        Want to run your own events?{' '}
        <Link to="/setup/organization" className="text-gray-600 hover:text-gray-800">
          Create an organization →
        </Link>
      </p>

      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancellingId(null);
        }}
        onConfirm={handleCancelSignup}
        title="Cancel Signup"
        message="Are you sure you want to cancel this signup?"
        confirmText="Cancel Signup"
        danger
      />
    </div>
  );
}
