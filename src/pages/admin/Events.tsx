import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import type { EventInput } from '../../hooks/useEvents';
import { useTemplates } from '../../hooks/useTemplates';
import type { SlotTemplate } from '../../hooks/useTemplates';
import { useSlots } from '../../hooks/useSlots';
import { EventCard } from '../../components/EventCard';
import { Modal } from '../../components/Modal';

export function AdminEvents() {
  const { currentOrg } = useOrg();
  const { events, loading, createEvent } = useEvents(currentOrg?.id);
  const { templates } = useTemplates(currentOrg?.id);
  const { createSlotForEvent } = useSlots(currentOrg?.id, '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [pendingSlots, setPendingSlots] = useState<SlotTemplate[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [showVolunteerNames, setShowVolunteerNames] = useState(false);

  const resetForm = () => {
    setTitle('');
    setStartDate('');
    setEndDate('');
    setLocation('');
    setDescription('');
    setIsPublic(true);
    setShowVolunteerNames(false);
    setError('');
    setSelectedTemplateId('');
    setPendingSlots([]);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setPendingSlots([]);
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setTitle(template.eventTitle);
      setDescription(template.eventDescription);
      setLocation(template.eventLocation);
      setPendingSlots(template.slots);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const eventData: EventInput = {
        title,
        startTime: new Date(startDate),
        endTime: endDate ? new Date(endDate) : undefined,
        location,
        description,
        isPublic,
        showVolunteerNames,
      };

      const eventId = await createEvent(eventData);

      // If we have pending slots from a template, create them
      if (pendingSlots.length > 0 && eventId && currentOrg?.id) {
        for (const slot of pendingSlots) {
          await createSlotForEvent(currentOrg.id, eventId, {
            name: slot.name,
            category: slot.category,
            quantityTotal: slot.quantityTotal,
            description: slot.description,
          });
        }
      }

      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const upcomingEvents = events.filter((e) => e.startTime >= new Date());
  const pastEvents = events.filter((e) => e.startTime < new Date());

  return (
    <div>
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="page-title">Events</h1>
          <p className="page-subtitle">Manage your organization's events</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          Create Event
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-gray-500 mb-4">No events yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create your first event
            </button>
          </div>
        </div>
      ) : (
        <>
          {upcomingEvents.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Upcoming Events ({upcomingEvents.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map((event) => (
                  <Link key={event.id} to={`/admin/events/${event.id}`}>
                    <EventCard event={event} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {pastEvents.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Past Events ({pastEvents.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastEvents.map((event) => (
                  <Link key={event.id} to={`/admin/events/${event.id}`}>
                    <EventCard event={event} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Event"
        size="lg"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          {templates.length > 0 && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <label htmlFor="template" className="label text-primary-800">
                Start from a template (optional)
              </label>
              <select
                id="template"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="input mt-1"
              >
                <option value="">-- No template --</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.slots.length} slots)
                  </option>
                ))}
              </select>
              {pendingSlots.length > 0 && (
                <p className="text-sm text-primary-600 mt-2">
                  {pendingSlots.length} slot{pendingSlots.length !== 1 ? 's' : ''} will be created automatically
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="title" className="label">
              Event Title *
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Fall Festival Volunteers"
              className="input mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="label">
                Start Date *
              </label>
              <input
                id="startDate"
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="label">
                End Date (optional)
              </label>
              <input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input mt-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" className="label">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Main Gym"
              className="input mt-1"
            />
          </div>

          <div>
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what volunteers will be doing..."
              className="input mt-1"
            />
          </div>

          <div className="flex items-center">
            <input
              id="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
              Make this event public (visible to anyone with the link)
            </label>
          </div>

          <div className="flex items-center">
            <input
              id="showVolunteerNames"
              type="checkbox"
              checked={showVolunteerNames}
              onChange={(e) => setShowVolunteerNames(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="showVolunteerNames" className="ml-2 text-sm text-gray-700">
              Show volunteer names publicly (displays who has signed up for each slot)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
