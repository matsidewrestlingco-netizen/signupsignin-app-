import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import type { Slot } from '../../hooks/useSlots';
import type { Signup } from '../../hooks/useSignups';
import { DataTable } from '../../components/DataTable';
import { downloadCSV, formatPercentage, calculateFulfillmentPercentage } from '../../lib/exportUtils';

type ReportType = 'summary' | 'fulfillment' | 'readiness' | 'participants' | 'noshow';

interface SlotWithEvent extends Slot {
  eventTitle: string;
}

interface ParticipantData {
  id: string;
  name: string;
  email: string;
  totalSignups: number;
  checkedIn: number;
  noShows: number;
}

export function AdminReports() {
  const { currentOrg } = useOrg();
  const { events, loading: eventsLoading } = useEvents(currentOrg?.id);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [loading, setLoading] = useState(false);

  const [slots, setSlots] = useState<SlotWithEvent[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!currentOrg?.id) return;
      setLoading(true);

      try {
        const eventsToFetch = selectedEvent === 'all'
          ? events
          : events.filter(e => e.id === selectedEvent);

        // Fetch all slots
        const allSlots: SlotWithEvent[] = [];
        for (const event of eventsToFetch) {
          const slotsRef = collection(db, 'organizations', currentOrg.id, 'events', event.id, 'slots');
          const slotsSnapshot = await getDocs(slotsRef);
          slotsSnapshot.forEach(doc => {
            const data = doc.data();
            allSlots.push({
              id: doc.id,
              eventTitle: event.title,
              name: data.name,
              category: data.category || 'General',
              quantityTotal: data.quantityTotal || 1,
              quantityFilled: 0,
              startTime: data.startTime ? (data.startTime as Timestamp).toDate() : undefined,
              endTime: data.endTime ? (data.endTime as Timestamp).toDate() : undefined,
              description: data.description || '',
              createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            });
          });
        }

        // Fetch signups
        const signupsRef = collection(db, 'organizations', currentOrg.id, 'signups');
        let signupsQuery = query(signupsRef);
        if (selectedEvent !== 'all') {
          signupsQuery = query(signupsRef, where('eventId', '==', selectedEvent));
        }
        const signupsSnapshot = await getDocs(signupsQuery);
        const allSignups: Signup[] = [];
        signupsSnapshot.forEach(doc => {
          const data = doc.data();
          allSignups.push({
            id: doc.id,
            eventId: data.eventId,
            slotId: data.slotId,
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail,
            note: data.note || '',
            checkedIn: data.checkedIn ?? false,
            checkedInAt: data.checkedInAt ? (data.checkedInAt as Timestamp).toDate() : undefined,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        });

        // Update slot filled counts
        const slotCounts: Record<string, number> = {};
        allSignups.forEach(s => {
          slotCounts[s.slotId] = (slotCounts[s.slotId] || 0) + 1;
        });
        allSlots.forEach(slot => {
          slot.quantityFilled = slotCounts[slot.id] || 0;
        });

        setSlots(allSlots);
        setSignups(allSignups);
      } catch (err) {
        console.error('Error fetching report data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!eventsLoading) {
      fetchData();
    }
  }, [currentOrg?.id, events, eventsLoading, selectedEvent]);

  const getEventSummary = () => {
    const eventsData = selectedEvent === 'all' ? events : events.filter(e => e.id === selectedEvent);
    return eventsData.map(event => {
      const eventSlots = slots.filter(s => s.eventTitle === event.title);
      const eventSignups = signups.filter(s => s.eventId === event.id);
      const totalCapacity = eventSlots.reduce((sum, s) => sum + s.quantityTotal, 0);
      const totalFilled = eventSlots.reduce((sum, s) => sum + s.quantityFilled, 0);
      const checkedIn = eventSignups.filter(s => s.checkedIn).length;

      return {
        id: event.id,
        title: event.title,
        date: format(event.startTime, 'MMM d, yyyy'),
        totalSlots: eventSlots.length,
        totalCapacity,
        totalFilled,
        fulfillment: formatPercentage(calculateFulfillmentPercentage(totalFilled, totalCapacity)),
        checkedIn,
        attendance: formatPercentage(calculateFulfillmentPercentage(checkedIn, totalFilled)),
      };
    });
  };

  const getSlotFulfillment = () => {
    return slots.map(slot => ({
      id: slot.id,
      event: slot.eventTitle,
      slot: slot.name,
      category: slot.category,
      capacity: slot.quantityTotal,
      filled: slot.quantityFilled,
      available: slot.quantityTotal - slot.quantityFilled,
      fulfillment: formatPercentage(calculateFulfillmentPercentage(slot.quantityFilled, slot.quantityTotal)),
    }));
  };

  const getReadinessData = () => {
    return slots.map(slot => {
      const percentage = calculateFulfillmentPercentage(slot.quantityFilled, slot.quantityTotal);
      let status: string;
      if (percentage >= 1) status = 'Full';
      else if (percentage >= 0.75) status = 'Covered';
      else if (percentage >= 0.5) status = 'Understaffed';
      else status = 'Critical';

      return {
        id: slot.id,
        event: slot.eventTitle,
        slot: slot.name,
        category: slot.category,
        filled: `${slot.quantityFilled}/${slot.quantityTotal}`,
        status,
      };
    }).sort((a, b) => {
      const order = { Critical: 0, Understaffed: 1, Covered: 2, Full: 3 };
      return order[a.status as keyof typeof order] - order[b.status as keyof typeof order];
    });
  };

  const getParticipantData = (): ParticipantData[] => {
    const participants: Record<string, ParticipantData> = {};
    signups.forEach(signup => {
      if (!participants[signup.userId]) {
        participants[signup.userId] = {
          id: signup.userId,
          name: signup.userName,
          email: signup.userEmail,
          totalSignups: 0,
          checkedIn: 0,
          noShows: 0,
        };
      }
      participants[signup.userId].totalSignups++;
      if (signup.checkedIn) {
        participants[signup.userId].checkedIn++;
      } else {
        participants[signup.userId].noShows++;
      }
    });
    return Object.values(participants).sort((a, b) => b.totalSignups - a.totalSignups);
  };

  const getNoShowData = () => {
    return signups
      .filter(s => !s.checkedIn)
      .map(signup => {
        const event = events.find(e => e.id === signup.eventId);
        const slot = slots.find(s => s.id === signup.slotId);
        return {
          id: signup.id,
          name: signup.userName,
          email: signup.userEmail,
          event: event?.title || 'Unknown',
          slot: slot?.name || 'Unknown',
          signedUpAt: format(signup.createdAt, 'MMM d, yyyy'),
        };
      });
  };

  const handleExport = () => {
    let data: object[] = [];
    let filename = '';

    switch (reportType) {
      case 'summary':
        data = getEventSummary();
        filename = 'event_summary';
        break;
      case 'fulfillment':
        data = getSlotFulfillment();
        filename = 'slot_fulfillment';
        break;
      case 'readiness':
        data = getReadinessData();
        filename = 'readiness_dashboard';
        break;
      case 'participants':
        data = getParticipantData();
        filename = 'participant_activity';
        break;
      case 'noshow':
        data = getNoShowData();
        filename = 'no_show_report';
        break;
    }

    downloadCSV(filename, data);
  };

  const renderReport = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
        </div>
      );
    }

    switch (reportType) {
      case 'summary':
        return (
          <DataTable
            data={getEventSummary()}
            keyField="id"
            columns={[
              { key: 'title', header: 'Event' },
              { key: 'date', header: 'Date' },
              { key: 'totalSlots', header: 'Slots' },
              { key: 'totalFilled', header: 'Signups' },
              { key: 'fulfillment', header: 'Fulfillment' },
              { key: 'checkedIn', header: 'Checked In' },
              { key: 'attendance', header: 'Attendance' },
            ]}
            emptyMessage="No events to report on"
          />
        );

      case 'fulfillment':
        return (
          <DataTable
            data={getSlotFulfillment()}
            keyField="id"
            columns={[
              { key: 'event', header: 'Event' },
              { key: 'slot', header: 'Slot' },
              { key: 'category', header: 'Category' },
              { key: 'filled', header: 'Filled' },
              { key: 'capacity', header: 'Capacity' },
              { key: 'available', header: 'Available' },
              { key: 'fulfillment', header: 'Fulfillment %' },
            ]}
            emptyMessage="No slots to report on"
          />
        );

      case 'readiness':
        return (
          <DataTable
            data={getReadinessData()}
            keyField="id"
            columns={[
              { key: 'event', header: 'Event' },
              { key: 'slot', header: 'Slot' },
              { key: 'category', header: 'Category' },
              { key: 'filled', header: 'Filled' },
              {
                key: 'status',
                header: 'Status',
                render: (item) => (
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    item.status === 'Critical' ? 'bg-red-100 text-red-800' :
                    item.status === 'Understaffed' ? 'bg-yellow-100 text-yellow-800' :
                    item.status === 'Covered' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {item.status as string}
                  </span>
                ),
              },
            ]}
            emptyMessage="No slots to report on"
          />
        );

      case 'participants':
        return (
          <DataTable
            data={getParticipantData()}
            keyField="id"
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'email', header: 'Email' },
              { key: 'totalSignups', header: 'Total Signups' },
              { key: 'checkedIn', header: 'Checked In' },
              { key: 'noShows', header: 'No Shows' },
            ]}
            emptyMessage="No participants to report on"
          />
        );

      case 'noshow':
        return (
          <DataTable
            data={getNoShowData()}
            keyField="id"
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'email', header: 'Email' },
              { key: 'event', header: 'Event' },
              { key: 'slot', header: 'Slot' },
              { key: 'signedUpAt', header: 'Signed Up' },
            ]}
            emptyMessage="No no-shows to report"
          />
        );
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">View and export event reports</p>
      </div>

      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="label">Event</label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="input mt-1"
              >
                <option value="all">All Events</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="input mt-1"
              >
                <option value="summary">Event Summary</option>
                <option value="fulfillment">Slot Fulfillment</option>
                <option value="readiness">Readiness Dashboard</option>
                <option value="participants">Participant Activity</option>
                <option value="noshow">No-Show Report</option>
              </select>
            </div>

            <button onClick={handleExport} className="btn-primary">
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {renderReport()}
      </div>
    </div>
  );
}
