import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import { useSlots } from '../../hooks/useSlots';
import { useSignups } from '../../hooks/useSignups';
import { useEventSlotCounts } from '../../hooks/useEventSlotCounts';
import { EventCard } from '../../components/EventCard';
import { StatusBadge } from '../../components/StatusBadge';
import type { Event, EventInput, Slot, SlotInput, Signup } from '../../lib/types';
import { formatEventDate } from '../../lib/dateUtils';
import { sendEventNotification } from '../../lib/notifications';

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AdminEvents() {
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'roster'>('list');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { currentOrg } = useOrg();
  const { events, loading: eventsLoading, createEvent, deleteEvent } = useEvents(
    currentOrg?.id
  );
  const { slots, loading: slotsLoading, createSlot, deleteSlot } = useSlots(
    currentOrg?.id,
    selectedEvent?.id
  );
  const { signups, loading: signupsLoading, checkIn, undoCheckIn } = useSignups(
    currentOrg?.id,
    selectedEvent?.id
  );
  const slotCounts = useEventSlotCounts(currentOrg?.id, events.map((e) => e.id));

  // ── List view ──────────────────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        {/* Header */}
        <View style={s.listHeader}>
          <Text style={s.screenTitle}>Events</Text>
          <TouchableOpacity
            testID="create-event-btn"
            style={s.addBtn}
            onPress={() => setView('create')}
            activeOpacity={0.7}
          >
            <Text style={s.addBtnIcon}>+</Text>
          </TouchableOpacity>
        </View>

        {eventsLoading ? (
          <ActivityIndicator style={s.centered} color="#1a56db" />
        ) : events.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>No events yet</Text>
            <Text style={s.emptySubtitle}>Tap + to create your first event.</Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.listContent}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                totalSlots={slotCounts[item.id]?.total ?? 0}
                filledSlots={slotCounts[item.id]?.filled ?? 0}
                onPress={() => {
                  setSelectedEvent(item);
                  setView('detail');
                }}
              />
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Create view ────────────────────────────────────────────────────────────

  if (view === 'create') {
    return <CreateEventView onBack={() => setView('list')} createEvent={createEvent} />;
  }

  // ── Detail view ────────────────────────────────────────────────────────────

  if (view === 'detail' && selectedEvent) {
    return (
      <DetailView
        event={selectedEvent}
        slots={slots}
        slotsLoading={slotsLoading}
        onBack={() => {
          setSelectedEvent(null);
          setView('list');
        }}
        onDelete={async () => {
          await deleteEvent(selectedEvent.id);
          setSelectedEvent(null);
          setView('list');
        }}
        onRoster={() => setView('roster')}
        createSlot={createSlot}
        deleteSlot={deleteSlot}
        sendNotification={(title, body) =>
          sendEventNotification(currentOrg!.id, selectedEvent!.id, title, body)
        }
      />
    );
  }

  if (view === 'roster' && selectedEvent) {
    return (
      <RosterView
        event={selectedEvent}
        slots={slots}
        slotsLoading={slotsLoading}
        signups={signups}
        signupsLoading={signupsLoading}
        onBack={() => setView('detail')}
        checkIn={checkIn}
        undoCheckIn={undoCheckIn}
      />
    );
  }

  return null;
}

// ─── Create Event Form ───────────────────────────────────────────────────────

interface CreateEventViewProps {
  onBack: () => void;
  createEvent: (data: EventInput) => Promise<string>;
}

function CreateEventView({ onBack, createEvent }: CreateEventViewProps) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('');
  const [endTimeStr, setEndTimeStr] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!startTimeStr.trim()) {
      newErrors.startTime = 'Start time is required';
    } else {
      const parsed = new Date(startTimeStr.trim());
      if (isNaN(parsed.getTime())) {
        newErrors.startTime = 'Invalid date format';
      }
    }
    if (endTimeStr.trim()) {
      const parsed = new Date(endTimeStr.trim());
      if (isNaN(parsed.getTime())) {
        newErrors.endTime = 'Invalid date format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const startTime = new Date(startTimeStr.trim());
    const endTime = endTimeStr.trim() ? new Date(endTimeStr.trim()) : undefined;

    setSubmitting(true);
    setSubmitError('');
    try {
      await createEvent({ title: title.trim(), startTime, endTime, location: location.trim(), description: description.trim(), isPublic });
      onBack();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.detailHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.screenTitle}>Create Event</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView style={s.formScroll} contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <Text style={s.fieldLabel}>Title</Text>
        <TextInput
          style={[s.input, errors.title ? s.inputError : null]}
          value={title}
          onChangeText={setTitle}
          placeholder="Event title"
          placeholderTextColor="#9ca3af"
        />
        {errors.title ? <Text style={s.fieldError}>{errors.title}</Text> : null}

        {/* Location */}
        <Text style={s.fieldLabel}>Location</Text>
        <TextInput
          style={[s.input, errors.location ? s.inputError : null]}
          value={location}
          onChangeText={setLocation}
          placeholder="Venue or address"
          placeholderTextColor="#9ca3af"
        />
        {errors.location ? <Text style={s.fieldError}>{errors.location}</Text> : null}

        {/* Start Date/Time */}
        <Text style={s.fieldLabel}>Start Date/Time</Text>
        <TextInput
          style={[s.input, errors.startTime ? s.inputError : null]}
          value={startTimeStr}
          onChangeText={setStartTimeStr}
          placeholder="2026-04-05T14:00"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
        />
        {errors.startTime ? <Text style={s.fieldError}>{errors.startTime}</Text> : null}

        {/* End Date/Time */}
        <Text style={s.fieldLabel}>End Date/Time (optional)</Text>
        <TextInput
          style={[s.input, errors.endTime ? s.inputError : null]}
          value={endTimeStr}
          onChangeText={setEndTimeStr}
          placeholder="2026-04-05T16:00"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
        />
        {errors.endTime ? <Text style={s.fieldError}>{errors.endTime}</Text> : null}

        {/* Description */}
        <Text style={s.fieldLabel}>Description</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
        />

        {/* Public toggle */}
        <View style={s.switchRow}>
          <Text style={s.fieldLabel}>Public Event</Text>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: '#d1d5db', true: '#1a56db' }}
            thumbColor="#ffffff"
          />
        </View>

        {submitError ? <Text style={s.submitError}>{submitError}</Text> : null}

        <TouchableOpacity
          testID="submit-create-btn"
          style={[s.primaryBtn, submitting ? s.primaryBtnDisabled : null]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={s.primaryBtnText}>Save Event</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Detail View ─────────────────────────────────────────────────────────────

interface DetailViewProps {
  event: Event;
  slots: Slot[];
  slotsLoading: boolean;
  onBack: () => void;
  onDelete: () => Promise<void>;
  onRoster: () => void;
  createSlot: (data: SlotInput) => Promise<string>;
  deleteSlot: (slotId: string) => Promise<void>;
  sendNotification: (title: string, body: string) => Promise<{ sent: number; failed: number }>;
}

function DetailView({
  event,
  slots,
  slotsLoading,
  onBack,
  onDelete,
  onRoster,
  createSlot,
  deleteSlot,
  sendNotification,
}: DetailViewProps) {
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [showNotifyForm, setShowNotifyForm] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);
  const [slotName, setSlotName] = useState('');
  const [slotCategory, setSlotCategory] = useState('');
  const [slotQuantity, setSlotQuantity] = useState('1');
  const [slotDescription, setSlotDescription] = useState('');
  const [slotSubmitting, setSlotSubmitting] = useState(false);
  const [slotError, setSlotError] = useState('');

  function confirmDelete() {
    Alert.alert(
      'Delete Event',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  }

  function confirmDeleteSlot(slotId: string, slotNameLabel: string) {
    Alert.alert(
      'Delete Slot',
      `Remove "${slotNameLabel}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSlot(slotId),
        },
      ]
    );
  }

  async function handleAddSlot() {
    if (!slotName.trim()) {
      setSlotError('Slot name is required');
      return;
    }
    const qty = parseInt(slotQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      setSlotError('Quantity must be a positive number');
      return;
    }

    setSlotSubmitting(true);
    setSlotError('');
    try {
      await createSlot({
        name: slotName.trim(),
        category: slotCategory.trim() || 'General',
        quantityTotal: qty,
        description: slotDescription.trim(),
      });
      // Reset form
      setSlotName('');
      setSlotCategory('');
      setSlotQuantity('1');
      setSlotDescription('');
      setShowAddSlot(false);
    } catch (err) {
      setSlotError(err instanceof Error ? err.message : 'Failed to add slot');
    } finally {
      setSlotSubmitting(false);
    }
  }

  async function handleNotify() {
    if (!notifyMessage.trim()) return;
    setNotifySending(true);
    setNotifyResult(null);
    try {
      const result = await sendNotification(event.title, notifyMessage.trim());
      setNotifyResult(`Sent to ${result.sent} volunteer${result.sent !== 1 ? 's' : ''}`);
      setNotifyMessage('');
      setShowNotifyForm(false);
      setTimeout(() => setNotifyResult(null), 4000);
    } catch {
      setNotifyResult('Failed to send notifications');
      setTimeout(() => setNotifyResult(null), 4000);
    } finally {
      setNotifySending(false);
    }
  }

  const totalSlots = slots.reduce((sum, s) => sum + s.quantityTotal, 0);
  const filledSlots = slots.reduce((sum, s) => sum + s.quantityFilled, 0);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.detailHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.detailTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <TouchableOpacity onPress={confirmDelete} activeOpacity={0.7}>
          <Text style={s.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.detailScroll} contentContainerStyle={s.detailContent}>
        {/* Event info card */}
        <View style={s.infoCard}>
          {/* Date/time row */}
          <Text style={s.infoDateText}>
            {formatEventDate(event.startTime, true)}
            {event.endTime ? ` – ${formatEventDate(event.endTime, true)}` : ''}
          </Text>

          {/* Location */}
          <Text style={s.infoLocation}>{'📍 ' + event.location}</Text>

          {/* Description */}
          {event.description ? (
            <Text style={s.infoDescription}>{event.description}</Text>
          ) : null}

          {/* Public/Private badge */}
          <View style={[s.visibilityBadge, event.isPublic ? s.publicBadge : s.privateBadge]}>
            <Text style={[s.visibilityText, event.isPublic ? s.publicText : s.privateText]}>
              {event.isPublic ? 'Public' : 'Private'}
            </Text>
          </View>
        </View>

        {/* Day-Of Roster */}
        <TouchableOpacity
          style={s.rosterBtn}
          onPress={onRoster}
          activeOpacity={0.7}
        >
          <Text style={s.rosterBtnText}>📋 Day-Of Roster</Text>
        </TouchableOpacity>

        {/* Notify volunteers */}
        {notifyResult ? (
          <Text style={s.notifyResult}>{notifyResult}</Text>
        ) : null}
        {showNotifyForm ? (
          <View style={s.notifyForm}>
            <TextInput
              style={s.notifyInput}
              placeholder="Message to volunteers..."
              value={notifyMessage}
              onChangeText={setNotifyMessage}
              multiline
              numberOfLines={2}
            />
            <View style={s.notifyFormBtns}>
              <TouchableOpacity
                style={s.notifyCancelBtn}
                onPress={() => { setShowNotifyForm(false); setNotifyMessage(''); }}
                activeOpacity={0.7}
              >
                <Text style={s.notifyCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.notifySendBtn, notifySending && s.notifySendBtnDisabled]}
                onPress={handleNotify}
                disabled={notifySending}
                activeOpacity={0.7}
              >
                {notifySending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.notifySendText}>Send</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={s.notifyBtn}
            onPress={() => setShowNotifyForm(true)}
            activeOpacity={0.7}
          >
            <Text style={s.notifyBtnText}>📢 Notify Volunteers</Text>
          </TouchableOpacity>
        )}

        {/* Slots section */}
        <View style={s.slotsSectionHeader}>
          <Text style={s.sectionTitle}>Slots</Text>
          <TouchableOpacity
            style={s.addSlotBtn}
            onPress={() => setShowAddSlot(true)}
            activeOpacity={0.7}
          >
            <Text style={s.addSlotBtnText}>Add Slot</Text>
          </TouchableOpacity>
        </View>

        {/* Add slot form */}
        {showAddSlot && (
          <View style={s.addSlotForm}>
            <Text style={s.fieldLabel}>Slot Name</Text>
            <TextInput
              style={s.input}
              value={slotName}
              onChangeText={setSlotName}
              placeholder="Registration Desk"
              placeholderTextColor="#9ca3af"
            />

            <Text style={s.fieldLabel}>Category</Text>
            <TextInput
              style={s.input}
              value={slotCategory}
              onChangeText={setSlotCategory}
              placeholder="General"
              placeholderTextColor="#9ca3af"
            />

            <Text style={s.fieldLabel}>Quantity</Text>
            <TextInput
              style={s.input}
              value={slotQuantity}
              onChangeText={setSlotQuantity}
              placeholder="1"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />

            <Text style={s.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[s.input, s.textAreaSmall]}
              value={slotDescription}
              onChangeText={setSlotDescription}
              placeholder="Optional description"
              placeholderTextColor="#9ca3af"
              multiline
            />

            {slotError ? <Text style={s.fieldError}>{slotError}</Text> : null}

            <View style={s.slotFormActions}>
              <TouchableOpacity
                style={[s.primaryBtn, s.slotFormBtn, slotSubmitting ? s.primaryBtnDisabled : null]}
                onPress={handleAddSlot}
                disabled={slotSubmitting}
                activeOpacity={0.8}
              >
                {slotSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={s.primaryBtnText}>Add Slot</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.outlineBtn, s.slotFormBtn]}
                onPress={() => {
                  setShowAddSlot(false);
                  setSlotError('');
                }}
                activeOpacity={0.7}
              >
                <Text style={s.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Slots list */}
        {slotsLoading ? (
          <ActivityIndicator style={s.slotsLoader} color="#1a56db" />
        ) : slots.length === 0 ? (
          <Text style={s.emptySlotsText}>
            No slots yet. Add a slot to allow volunteers to sign up.
          </Text>
        ) : (
          slots.map((slot) => (
            <View key={slot.id} style={s.slotRow}>
              <View style={s.slotInfo}>
                <View style={s.slotNameRow}>
                  <Text style={s.slotName}>{slot.name}</Text>
                  <View style={s.categoryChip}>
                    <Text style={s.categoryChipText}>{slot.category}</Text>
                  </View>
                </View>
                <View style={s.slotFillRow}>
                  <Text style={s.slotFillText}>
                    {slot.quantityFilled} / {slot.quantityTotal}
                  </Text>
                  <StatusBadge
                    quantityFilled={slot.quantityFilled}
                    quantityTotal={slot.quantityTotal}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={s.slotDeleteBtn}
                onPress={() => confirmDeleteSlot(slot.id, slot.name)}
                onLongPress={() => confirmDeleteSlot(slot.id, slot.name)}
                activeOpacity={0.7}
              >
                <Text style={s.slotDeleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Roster View ─────────────────────────────────────────────────────────────

interface RosterViewProps {
  event: Event;
  slots: Slot[];
  slotsLoading: boolean;
  signups: Signup[];
  signupsLoading: boolean;
  onBack: () => void;
  checkIn: (signupId: string) => Promise<void>;
  undoCheckIn: (signupId: string) => Promise<void>;
}

function RosterView({
  event,
  slots,
  slotsLoading,
  signups,
  signupsLoading,
  onBack,
  checkIn,
  undoCheckIn,
}: RosterViewProps) {
  const [actioning, setActioning] = useState<string | null>(null);

  const checkedInCount = signups.filter((sg) => sg.checkedIn).length;

  async function handleCheckIn(signupId: string) {
    setActioning(signupId);
    try { await checkIn(signupId); } finally { setActioning(null); }
  }

  async function handleUndoCheckIn(signupId: string) {
    setActioning(signupId);
    try { await undoCheckIn(signupId); } finally { setActioning(null); }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.detailHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.detailTitle} numberOfLines={1}>Day-Of Roster</Text>
        <View style={s.headerSpacer} />
      </View>

      {/* Summary bar */}
      <View style={s.rosterSummaryBar}>
        <Text style={s.rosterSummaryTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={s.rosterSummaryCount}>
          {signups.length} volunteer{signups.length !== 1 ? 's' : ''} · {checkedInCount} checked in
        </Text>
      </View>

      <ScrollView style={s.detailScroll} contentContainerStyle={s.detailContent}>
        {slotsLoading || signupsLoading ? (
          <ActivityIndicator color="#1a56db" style={s.centered} />
        ) : slots.length === 0 ? (
          <Text style={s.emptySlotsText}>No slots have been added to this event yet.</Text>
        ) : (
          slots.map((slot) => {
            const slotSignups = signups.filter((sg) => sg.slotId === slot.id);
            const openSpots = Math.max(0, slot.quantityTotal - slotSignups.length);

            return (
              <View key={slot.id} style={s.rosterSlotBlock}>
                {/* Slot header */}
                <View style={s.rosterSlotHeader}>
                  <View style={s.rosterSlotTitleRow}>
                    <Text style={s.rosterSlotName}>{slot.name}</Text>
                    <View style={s.categoryChip}>
                      <Text style={s.categoryChipText}>{slot.category}</Text>
                    </View>
                  </View>
                  <View style={s.rosterFillBadge}>
                    <Text style={s.rosterFillBadgeText}>
                      {slotSignups.length}/{slot.quantityTotal}
                    </Text>
                  </View>
                </View>

                {/* Signed-up volunteers */}
                {slotSignups.map((signup) => (
                  <View key={signup.id} style={s.rosterPersonRow}>
                    <View style={s.rosterPersonInfo}>
                      <Text style={s.rosterPersonName}>{signup.userName}</Text>
                      {signup.checkedIn && signup.checkedInAt ? (
                        <Text style={s.rosterCheckedInTime}>
                          {signup.checkedInAt.toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Text>
                      ) : null}
                    </View>

                    {actioning === signup.id ? (
                      <ActivityIndicator size="small" color="#1a56db" />
                    ) : signup.checkedIn ? (
                      <View style={s.rosterCheckedInArea}>
                        <Text style={s.rosterCheckedInLabel}>✓ Checked In</Text>
                        <TouchableOpacity
                          onPress={() => handleUndoCheckIn(signup.id)}
                          activeOpacity={0.7}
                          style={s.rosterUndoBtn}
                        >
                          <Text style={s.rosterUndoBtnText}>Undo</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={s.rosterCheckInBtn}
                        onPress={() => handleCheckIn(signup.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.rosterCheckInBtnText}>Check In</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* Open spots */}
                {Array.from({ length: openSpots }).map((_, i) => (
                  <View key={`open-${i}`} style={[s.rosterPersonRow, s.rosterOpenRow]}>
                    <Text style={s.rosterOpenText}>— open —</Text>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  // List header
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    backgroundColor: '#1a56db',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnIcon: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 28,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 32,
  },

  // Empty / loading
  centered: {
    marginTop: 60,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Detail / create header
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  backBtnText: {
    fontSize: 28,
    color: '#1a56db',
    fontWeight: '400',
    lineHeight: 32,
  },
  detailTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  headerSpacer: {
    width: 36,
  },
  deleteText: {
    fontSize: 15,
    color: '#dc2626',
    fontWeight: '600',
    paddingHorizontal: 4,
  },

  // Form
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  textAreaSmall: {
    minHeight: 52,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  fieldError: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 3,
  },
  submitError: {
    fontSize: 13,
    color: '#dc2626',
    marginTop: 12,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#1a56db',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Detail scroll
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Info card
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
  },
  infoDateText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  infoLocation: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  visibilityBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginTop: 4,
  },
  publicBadge: {
    backgroundColor: '#d1fae5',
  },
  privateBadge: {
    backgroundColor: '#e5e7eb',
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  publicText: {
    color: '#059669',
  },
  privateText: {
    color: '#6b7280',
  },

  // Slots section
  slotsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  addSlotBtn: {
    borderWidth: 1.5,
    borderColor: '#1a56db',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  addSlotBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a56db',
  },

  // Add slot form
  addSlotForm: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  slotFormActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  slotFormBtn: {
    flex: 1,
    marginTop: 10,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },

  // Slot row
  slotsLoader: {
    marginVertical: 16,
  },
  emptySlotsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  slotRow: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  slotInfo: {
    flex: 1,
    gap: 6,
  },
  slotNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  slotName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  categoryChip: {
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  categoryChipText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  slotFillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotFillText: {
    fontSize: 13,
    color: '#6b7280',
  },
  slotDeleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  slotDeleteBtnText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '700',
  },

  // Notify volunteers
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1a56db',
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  notifyBtnText: { color: '#1a56db', fontWeight: '600', fontSize: 14 },
  notifyForm: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  notifyInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  notifyFormBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  notifyCancelBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  notifyCancelText: { color: '#6b7280', fontSize: 14 },
  notifySendBtn: { backgroundColor: '#1a56db', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 20 },
  notifySendBtnDisabled: { opacity: 0.6 },
  notifySendText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  notifyResult: { color: '#059669', fontSize: 13, textAlign: 'center', marginBottom: 12 },

  // Day-Of Roster button (in DetailView)
  rosterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a56db',
    borderRadius: 8,
    paddingVertical: 11,
    marginBottom: 10,
  },
  rosterBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Roster view — summary bar
  rosterSummaryBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rosterSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  rosterSummaryCount: {
    fontSize: 13,
    color: '#6b7280',
  },

  // Roster view — slot blocks
  rosterSlotBlock: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  rosterSlotHeader: {
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rosterSlotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rosterSlotName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  rosterFillBadge: {
    backgroundColor: '#1a56db',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rosterFillBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Roster view — person rows
  rosterPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    minHeight: 52,
  },
  rosterPersonInfo: {
    flex: 1,
    gap: 2,
  },
  rosterPersonName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rosterCheckedInTime: {
    fontSize: 12,
    color: '#059669',
  },
  rosterCheckedInArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rosterCheckedInLabel: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  rosterUndoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rosterUndoBtnText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  rosterCheckInBtn: {
    backgroundColor: '#1a56db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  rosterCheckInBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Roster view — open spot rows
  rosterOpenRow: {
    backgroundColor: '#fafafa',
  },
  rosterOpenText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});
