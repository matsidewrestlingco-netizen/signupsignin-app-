import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import type { Event, EventInput } from '../../hooks/useEvents';
import { useSlots } from '../../hooks/useSlots';
import type { SlotInput } from '../../hooks/useSlots';
import { useSignups } from '../../hooks/useSignups';
import { useTemplates } from '../../hooks/useTemplates';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { SlotCard } from '../../components/SlotCard';
import { SignupList } from '../../components/SignupList';

export function AdminEventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentOrg } = useOrg();
  const { updateEvent, deleteEvent } = useEvents(currentOrg?.id);
  const { slots, loading: slotsLoading, error: slotsError, createSlot, updateSlot, deleteSlot } = useSlots(currentOrg?.id, eventId);
  const { signups, loading: signupsLoading, error: signupsError, checkIn, undoCheckIn, cancelSignup } = useSignups(currentOrg?.id, eventId);
  const { createTemplate } = useTemplates(currentOrg?.id);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'slots' | 'signups'>('slots');

  // Edit event modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete event modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Slot modal
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [slotName, setSlotName] = useState('');
  const [slotCategory, setSlotCategory] = useState('General');
  const [slotQuantity, setSlotQuantity] = useState('1');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [slotDescription, setSlotDescription] = useState('');
  const [savingSlot, setSavingSlot] = useState(false);

  // Delete slot modal
  const [showDeleteSlotModal, setShowDeleteSlotModal] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  // Save as template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      if (!currentOrg?.id || !eventId) return;

      try {
        const eventDoc = await getDoc(doc(db, 'organizations', currentOrg.id, 'events', eventId));
        if (!eventDoc.exists()) {
          navigate('/admin/events');
          return;
        }

        const data = eventDoc.data();
        setEvent({
          id: eventDoc.id,
          title: data.title,
          startTime: (data.startTime as Timestamp)?.toDate() || new Date(),
          endTime: data.endTime ? (data.endTime as Timestamp).toDate() : undefined,
          location: data.location || '',
          description: data.description || '',
          isPublic: data.isPublic ?? true,
          createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        });
      } catch (err) {
        console.error('Error fetching event:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [currentOrg?.id, eventId, navigate]);

  const openEditModal = () => {
    if (!event) return;
    setEditTitle(event.title);
    setEditStartDate(format(event.startTime, "yyyy-MM-dd'T'HH:mm"));
    setEditEndDate(event.endTime ? format(event.endTime, "yyyy-MM-dd'T'HH:mm") : '');
    setEditLocation(event.location);
    setEditDescription(event.description);
    setEditIsPublic(event.isPublic);
    setShowEditModal(true);
  };

  const handleUpdateEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    setSaving(true);

    try {
      const data: Partial<EventInput> = {
        title: editTitle,
        startTime: new Date(editStartDate),
        endTime: editEndDate ? new Date(editEndDate) : undefined,
        location: editLocation,
        description: editDescription,
        isPublic: editIsPublic,
      };

      await updateEvent(eventId, data);
      setEvent((prev) => prev ? { ...prev, ...data, startTime: new Date(editStartDate), endTime: editEndDate ? new Date(editEndDate) : undefined } : null);
      setShowEditModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventId) return;
    try {
      await deleteEvent(eventId);
      navigate('/admin/events');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const resetSlotForm = () => {
    setSlotName('');
    setSlotCategory('General');
    setSlotQuantity('1');
    setSlotStartTime('');
    setSlotEndTime('');
    setSlotDescription('');
    setEditingSlot(null);
  };

  const openSlotModal = (slotId?: string) => {
    if (slotId) {
      const slot = slots.find((s) => s.id === slotId);
      if (slot) {
        setEditingSlot(slotId);
        setSlotName(slot.name);
        setSlotCategory(slot.category);
        setSlotQuantity(String(slot.quantityTotal));
        setSlotStartTime(slot.startTime ? format(slot.startTime, 'HH:mm') : '');
        setSlotEndTime(slot.endTime ? format(slot.endTime, 'HH:mm') : '');
        setSlotDescription(slot.description);
      }
    } else {
      resetSlotForm();
    }
    setShowSlotModal(true);
  };

  const duplicateSlot = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (slot) {
      setEditingSlot(null); // Not editing, creating new
      setSlotName(slot.name + ' (Copy)');
      setSlotCategory(slot.category);
      setSlotQuantity(String(slot.quantityTotal));
      setSlotStartTime(slot.startTime ? format(slot.startTime, 'HH:mm') : '');
      setSlotEndTime(slot.endTime ? format(slot.endTime, 'HH:mm') : '');
      setSlotDescription(slot.description);
      setShowSlotModal(true);
    }
  };

  const handleSaveSlot = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSlot(true);

    try {
      const baseDate = event?.startTime || new Date();
      const data: SlotInput = {
        name: slotName,
        category: slotCategory,
        quantityTotal: parseInt(slotQuantity, 10),
        startTime: slotStartTime ? new Date(`${format(baseDate, 'yyyy-MM-dd')}T${slotStartTime}`) : undefined,
        endTime: slotEndTime ? new Date(`${format(baseDate, 'yyyy-MM-dd')}T${slotEndTime}`) : undefined,
        description: slotDescription,
      };

      if (editingSlot) {
        await updateSlot(editingSlot, data);
      } else {
        await createSlot(data);
      }

      setShowSlotModal(false);
      resetSlotForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save slot');
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!deletingSlotId) return;
    try {
      await deleteSlot(deletingSlotId);
      setShowDeleteSlotModal(false);
      setDeletingSlotId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete slot');
    }
  };

  const openTemplateModal = () => {
    setTemplateName(event?.title ? `${event.title} Template` : '');
    setTemplateDescription('');
    setShowTemplateModal(true);
  };

  const handleSaveAsTemplate = async (e: FormEvent) => {
    e.preventDefault();
    if (!event || !templateName.trim()) return;

    setSavingTemplate(true);
    try {
      await createTemplate({
        name: templateName.trim(),
        description: templateDescription.trim(),
        eventTitle: event.title,
        eventDescription: event.description,
        eventLocation: event.location,
        slots: slots.map((slot) => ({
          name: slot.name,
          category: slot.category,
          quantityTotal: slot.quantityTotal,
          description: slot.description,
        })),
      });
      setShowTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
      alert('Template saved successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSavingTemplate(false);
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
        <Link to="/admin/events" className="text-primary-600 hover:text-primary-500 mt-2 inline-block">
          Back to events
        </Link>
      </div>
    );
  }

  // Group slots by category
  const slotsByCategory = slots.reduce((acc, slot) => {
    if (!acc[slot.category]) acc[slot.category] = [];
    acc[slot.category].push(slot);
    return acc;
  }, {} as Record<string, typeof slots>);

  return (
    <div>
      <div className="page-header">
        <Link to="/admin/events" className="text-sm text-primary-600 hover:text-primary-500">
          &larr; Back to events
        </Link>
        <div className="flex justify-between items-start mt-2">
          <div>
            <h1 className="page-title">{event.title}</h1>
            <p className="page-subtitle">
              {format(event.startTime, 'EEEE, MMMM d, yyyy')}
              {event.location && ` • ${event.location}`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              to={`/admin/events/${eventId}/checkin`}
              className="btn-primary"
            >
              Day-Of Roster
            </Link>
            <button onClick={openTemplateModal} className="btn-secondary">Save as Template</button>
            <button onClick={openEditModal} className="btn-secondary">Edit</button>
            <button onClick={() => setShowDeleteModal(true)} className="btn-danger">Delete</button>
          </div>
        </div>
      </div>

      {event.description && (
        <div className="card mb-6">
          <div className="card-body">
            <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
          </div>
        </div>
      )}

      {(slotsError || signupsError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">
            {slotsError || signupsError}
          </p>
        </div>
      )}

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('slots')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'slots'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Slots ({slots.length})
          </button>
          <button
            onClick={() => setActiveTab('signups')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'signups'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Signups ({signups.length})
          </button>
        </nav>
      </div>

      {activeTab === 'slots' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Volunteer Slots</h2>
            <button onClick={() => openSlotModal()} className="btn-primary">Add Slot</button>
          </div>

          {slotsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-700"></div>
            </div>
          ) : slots.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-8">
                <p className="text-gray-500 mb-4">No slots yet. Add slots for volunteers to sign up.</p>
                <button onClick={() => openSlotModal()} className="btn-primary">Add First Slot</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(slotsByCategory).map(([category, categorySlots]) => (
                <section key={category}>
                  <h3 className="text-md font-medium text-gray-700 mb-3">{category}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {categorySlots.map((slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        adminView
                        onEdit={() => openSlotModal(slot.id)}
                        onDuplicate={() => duplicateSlot(slot.id)}
                        onDelete={() => {
                          setDeletingSlotId(slot.id);
                          setShowDeleteSlotModal(true);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'signups' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Signups</h2>
          {signupsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-700"></div>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <SignupList
                signups={signups}
                onCheckIn={checkIn}
                onUndoCheckIn={undoCheckIn}
                onCancel={cancelSignup}
                adminView
              />
            </div>
          )}
        </div>
      )}

      {/* Edit Event Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Event" size="lg">
        <form onSubmit={handleUpdateEvent} className="space-y-4">
          <div>
            <label className="label">Event Title *</label>
            <input type="text" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input type="datetime-local" required value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="datetime-local" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="input mt-1" />
            </div>
          </div>
          <div>
            <label className="label">Location</label>
            <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="input mt-1" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="input mt-1" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" checked={editIsPublic} onChange={(e) => setEditIsPublic(e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
            <label className="ml-2 text-sm text-gray-700">Public event</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Event Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteEvent}
        title="Delete Event"
        message="Are you sure you want to delete this event? All slots and signups will be permanently removed."
        confirmText="Delete Event"
        danger
      />

      {/* Slot Modal */}
      <Modal isOpen={showSlotModal} onClose={() => { setShowSlotModal(false); resetSlotForm(); }} title={editingSlot ? 'Edit Slot' : 'Add Slot'} size="lg">
        <form onSubmit={handleSaveSlot} className="space-y-4">
          <div>
            <label className="label">Slot Name *</label>
            <input type="text" required value={slotName} onChange={(e) => setSlotName(e.target.value)} placeholder="e.g., Face Painting Helper" className="input mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <input type="text" value={slotCategory} onChange={(e) => setSlotCategory(e.target.value)} placeholder="e.g., Setup, Activities" className="input mt-1" />
            </div>
            <div>
              <label className="label">Quantity Needed *</label>
              <input type="number" min="1" required value={slotQuantity} onChange={(e) => setSlotQuantity(e.target.value)} className="input mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Time</label>
              <input type="time" value={slotStartTime} onChange={(e) => setSlotStartTime(e.target.value)} className="input mt-1" />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="time" value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} className="input mt-1" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={2} value={slotDescription} onChange={(e) => setSlotDescription(e.target.value)} placeholder="What will volunteers do?" className="input mt-1" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setShowSlotModal(false); resetSlotForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={savingSlot} className="btn-primary">{savingSlot ? 'Saving...' : editingSlot ? 'Save Changes' : 'Add Slot'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Slot Modal */}
      <ConfirmModal
        isOpen={showDeleteSlotModal}
        onClose={() => { setShowDeleteSlotModal(false); setDeletingSlotId(null); }}
        onConfirm={handleDeleteSlot}
        title="Delete Slot"
        message="Are you sure you want to delete this slot? Any signups for this slot will also be removed."
        confirmText="Delete Slot"
        danger
      />

      {/* Save as Template Modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Save as Template"
      >
        <form onSubmit={handleSaveAsTemplate} className="space-y-4">
          <p className="text-sm text-gray-600">
            Create a reusable template from this event. The template will include the event details and {slots.length} slot{slots.length !== 1 ? 's' : ''}.
          </p>

          <div>
            <label className="label">Template Name *</label>
            <input
              type="text"
              required
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Weekly Volunteer Event"
              className="input mt-1"
            />
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="What is this template for?"
              rows={2}
              className="input mt-1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowTemplateModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingTemplate || !templateName.trim()}
              className="btn-primary"
            >
              {savingTemplate ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
