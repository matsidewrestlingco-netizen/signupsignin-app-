import { useState } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { useTemplates } from '../../hooks/useTemplates';
import type { EventTemplate, SlotTemplate } from '../../hooks/useTemplates';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { format } from 'date-fns';

export function AdminTemplates() {
  const { currentOrg } = useOrg();
  const { templates, loading, createTemplate, deleteTemplate } = useTemplates(
    currentOrg?.id
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [durationHours, setDurationHours] = useState<number | ''>('');
  const [slots, setSlots] = useState<SlotTemplate[]>([]);

  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTemplateName('');
    setTemplateDescription('');
    setEventTitle('');
    setEventDescription('');
    setEventLocation('');
    setDurationHours('');
    setSlots([]);
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !eventTitle.trim()) return;

    setSaving(true);
    try {
      await createTemplate({
        name: templateName.trim(),
        description: templateDescription.trim(),
        eventTitle: eventTitle.trim(),
        eventDescription: eventDescription.trim(),
        eventLocation: eventLocation.trim(),
        durationHours: durationHours || undefined,
        slots,
      });
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId);
      setShowDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const addSlot = () => {
    setSlots([
      ...slots,
      {
        name: '',
        category: 'General',
        quantityTotal: 1,
        description: '',
      },
    ]);
  };

  const updateSlot = (index: number, field: keyof SlotTemplate, value: string | number) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    setSlots(updated);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Event Templates</h1>
          <p className="page-subtitle">
            Create reusable templates to quickly set up events
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          Create Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-gray-500 mb-4">No templates yet</p>
            <p className="text-sm text-gray-400">
              Create a template to quickly set up similar events with pre-defined slots.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="card">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {template.eventTitle}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded">
                    {template.slots.length} slot{template.slots.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {template.description && (
                  <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Created {format(template.createdAt, 'MMM d, yyyy')}
                  </p>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="flex-1 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(template.id)}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Event Template"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Template Name *</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="input mt-1"
              placeholder="e.g., Weekly Volunteer Event"
            />
          </div>

          <div>
            <label className="label">Template Description</label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              className="input mt-1"
              rows={2}
              placeholder="What is this template for?"
            />
          </div>

          <hr className="my-4" />

          <h4 className="font-medium text-gray-900">Event Details</h4>

          <div>
            <label className="label">Event Title *</label>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="input mt-1"
              placeholder="e.g., School Carnival"
            />
          </div>

          <div>
            <label className="label">Event Description</label>
            <textarea
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              className="input mt-1"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Location</label>
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Duration (hours)</label>
              <input
                type="number"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value ? parseInt(e.target.value) : '')}
                className="input mt-1"
                min="1"
              />
            </div>
          </div>

          <hr className="my-4" />

          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">Slots ({slots.length})</h4>
            <button
              type="button"
              onClick={addSlot}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              + Add Slot
            </button>
          </div>

          {slots.map((slot, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-gray-700">
                  Slot {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeSlot(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Name</label>
                  <input
                    type="text"
                    value={slot.name}
                    onChange={(e) => updateSlot(index, 'name', e.target.value)}
                    className="input mt-1 text-sm"
                    placeholder="e.g., Ticket Sales"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Category</label>
                  <input
                    type="text"
                    value={slot.category}
                    onChange={(e) => updateSlot(index, 'category', e.target.value)}
                    className="input mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Quantity</label>
                  <input
                    type="number"
                    value={slot.quantityTotal}
                    onChange={(e) => updateSlot(index, 'quantityTotal', parseInt(e.target.value) || 1)}
                    className="input mt-1 text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Description</label>
                  <input
                    type="text"
                    value={slot.description}
                    onChange={(e) => updateSlot(index, 'description', e.target.value)}
                    className="input mt-1 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

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
            <button
              onClick={handleCreateTemplate}
              disabled={saving || !templateName.trim() || !eventTitle.trim()}
              className="btn-primary"
            >
              {saving ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Template Modal */}
      <Modal
        isOpen={!!selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        title={selectedTemplate?.name || 'Template Details'}
      >
        {selectedTemplate && (
          <div className="space-y-4">
            {selectedTemplate.description && (
              <p className="text-gray-600">{selectedTemplate.description}</p>
            )}

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900">Event Details</h4>
              <div>
                <span className="text-sm text-gray-500">Title:</span>
                <p className="font-medium">{selectedTemplate.eventTitle}</p>
              </div>
              {selectedTemplate.eventDescription && (
                <div>
                  <span className="text-sm text-gray-500">Description:</span>
                  <p>{selectedTemplate.eventDescription}</p>
                </div>
              )}
              {selectedTemplate.eventLocation && (
                <div>
                  <span className="text-sm text-gray-500">Location:</span>
                  <p>{selectedTemplate.eventLocation}</p>
                </div>
              )}
              {selectedTemplate.durationHours && (
                <div>
                  <span className="text-sm text-gray-500">Duration:</span>
                  <p>{selectedTemplate.durationHours} hours</p>
                </div>
              )}
            </div>

            {selectedTemplate.slots.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Slots ({selectedTemplate.slots.length})
                </h4>
                <div className="space-y-2">
                  {selectedTemplate.slots.map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{slot.name}</p>
                        <p className="text-sm text-gray-500">
                          {slot.category} &bull; {slot.quantityTotal} needed
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDeleteTemplate(showDeleteConfirm)}
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone."
        confirmText="Delete"
        danger
      />
    </div>
  );
}
