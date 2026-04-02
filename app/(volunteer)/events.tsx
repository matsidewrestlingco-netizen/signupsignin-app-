import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import { useSlots } from '../../hooks/useSlots';
import { useSignups, useMySignups } from '../../hooks/useSignups';
import { EventCard } from '../../components/EventCard';
import { StatusBadge } from '../../components/StatusBadge';
import { formatEventDate } from '../../lib/dateUtils';
import type { Event, Slot } from '../../lib/types';

export default function VolunteerEvents() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [signingUp, setSigningUp] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  const { currentUser, userProfile } = useAuth();
  const { currentOrg } = useOrg();
  const { events, loading: eventsLoading } = useEvents(currentOrg?.id);
  const { slots, loading: slotsLoading } = useSlots(currentOrg?.id, selectedEvent?.id);
  const { signups: eventSignups, createSignup } = useSignups(currentOrg?.id, selectedEvent?.id);
  const { signups: mySignups } = useMySignups(currentOrg?.id, currentUser?.uid);

  const publicEvents = events
    .filter((e) => e.isPublic)
    .slice()
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  async function handleSignUp(slot: Slot) {
    if (!currentUser || !selectedEvent || !currentOrg) return;
    setSigningUp(slot.id);
    setSignupError(null);
    try {
      await createSignup({
        eventId: selectedEvent.id,
        slotId: slot.id,
        userId: currentUser.uid,
        userName: userProfile?.name ?? (currentUser as { email?: string }).email ?? 'Volunteer',
        userEmail: userProfile?.email ?? (currentUser as { email?: string }).email ?? '',
        note: '',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to sign up';
      setSignupError(msg);
      setTimeout(() => setSignupError(null), 3000);
    } finally {
      setSigningUp(null);
    }
  }

  if (view === 'detail' && selectedEvent) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.container}>
          {/* Detail Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setView('list');
                setSelectedEvent(null);
                setSignupError(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.detailHeaderTitle} numberOfLines={1}>
              {selectedEvent.title}
            </Text>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Event Info Card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoDate}>
                {formatEventDate(selectedEvent.startTime, true)}
              </Text>
              <Text style={styles.infoLocation}>{'📍 ' + selectedEvent.location}</Text>
              {!!selectedEvent.description && (
                <Text style={styles.infoDescription}>{selectedEvent.description}</Text>
              )}
              <View style={styles.publicBadge}>
                <Text style={styles.publicBadgeText}>Public Event</Text>
              </View>
            </View>

            {/* Slots Section */}
            <Text style={styles.slotsHeader}>Available Slots</Text>

            {signupError ? (
              <Text style={styles.errorText}>{signupError}</Text>
            ) : null}

            {slotsLoading ? (
              <ActivityIndicator color="#059669" style={styles.centered} />
            ) : slots.length === 0 ? (
              <Text style={styles.emptyText}>
                No slots have been added to this event yet.
              </Text>
            ) : (
              slots.map((slot) => {
                const isFull = slot.quantityFilled >= slot.quantityTotal;
                const isSignedUp = mySignups.some((s) => s.slotId === slot.id);

                return (
                  <View key={slot.id} style={styles.slotCard}>
                    <View style={styles.slotTitleRow}>
                      <Text style={styles.slotName}>{slot.name}</Text>
                      <View style={styles.categoryChip}>
                        <Text style={styles.categoryChipText}>{slot.category}</Text>
                      </View>
                    </View>

                    {!!slot.description && (
                      <Text style={styles.slotDescription}>{slot.description}</Text>
                    )}

                    <View style={styles.slotFillRow}>
                      <Text style={styles.slotFillText}>
                        {slot.quantityFilled} / {slot.quantityTotal}
                      </Text>
                      <StatusBadge
                        quantityFilled={slot.quantityFilled}
                        quantityTotal={slot.quantityTotal}
                      />
                    </View>

                    <View style={styles.slotSignupArea}>
                      {isFull ? (
                        <Text style={styles.slotFullText}>Slot Full</Text>
                      ) : isSignedUp ? (
                        <Text style={styles.signedUpText}>✓ Signed Up</Text>
                      ) : signingUp === slot.id ? (
                        <ActivityIndicator color="#059669" />
                      ) : (
                        <TouchableOpacity
                          style={styles.signUpButton}
                          onPress={() => handleSignUp(slot)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.signUpButtonText}>Sign Up</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // List view
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* List Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>Events</Text>
        </View>

        {eventsLoading ? (
          <ActivityIndicator color="#059669" style={styles.centered} />
        ) : (
          <FlatList
            data={publicEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                totalSlots={0}
                filledSlots={0}
                onPress={() => {
                  setSelectedEvent(item);
                  setView('detail');
                }}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No events available right now.</Text>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#059669',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  // List header
  listHeader: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  listHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingVertical: 8,
  },
  // Detail header
  detailHeader: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 32,
  },
  detailHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  // Event info card
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  infoDate: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '500',
  },
  infoLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  publicBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#d1fae5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  publicBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  // Slots
  slotsHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 12,
  },
  slotCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  slotName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  categoryChip: {
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryChipText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  slotDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  slotFillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  slotFillText: {
    fontSize: 13,
    color: '#374151',
  },
  slotSignupArea: {
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 10,
    alignItems: 'flex-start',
  },
  slotFullText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  signedUpText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  signUpButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  signUpButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Shared
  centered: {
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    marginTop: 40,
  },
});
