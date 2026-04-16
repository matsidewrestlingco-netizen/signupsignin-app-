import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import { EventCard } from '../../components/EventCard';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useEventSlotCounts } from '../../hooks/useEventSlotCounts';

export default function AdminDashboard() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { currentOrg, organizations, loading: orgLoading, setCurrentOrg } = useOrg();
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const { events, loading: eventsLoading } = useEvents(currentOrg?.id);
  const slotCounts = useEventSlotCounts(currentOrg?.id, events.map((e) => e.id));

  if (orgLoading) {
    return <LoadingScreen />;
  }

  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => e.startTime > now);
  const thisWeekEvents = events.filter(
    (e) => e.startTime > now && e.startTime <= oneWeekFromNow
  );

  // Up to 3 upcoming events sorted ascending by startTime
  const upcomingPreview = [...upcomingEvents]
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, 3);

  const orgName = currentOrg?.name ?? 'My Organization';
  const welcomeName = userProfile?.name ? `Welcome back, ${userProfile.name}` : 'Welcome back';

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        {organizations.length > 1 ? (
          <TouchableOpacity style={styles.orgPickerRow} onPress={() => setShowOrgPicker(true)} activeOpacity={0.75}>
            <Text style={styles.headerTitle}>{orgName}</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" style={{ marginLeft: 4, marginTop: 2 }} />
          </TouchableOpacity>
        ) : (
          <Text style={styles.headerTitle}>{orgName}</Text>
        )}
        <Text style={styles.headerSubtitle}>{welcomeName}</Text>
      </View>

      <Modal visible={showOrgPicker} transparent animationType="fade" onRequestClose={() => setShowOrgPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowOrgPicker(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Switch Organization</Text>
            {organizations.map((org) => (
              <TouchableOpacity
                key={org.id}
                style={[styles.orgOption, currentOrg?.id === org.id && styles.orgOptionActive]}
                onPress={() => { setCurrentOrg(org); setShowOrgPicker(false); }}
              >
                <Text style={[styles.orgOptionText, currentOrg?.id === org.id && styles.orgOptionTextActive]}>
                  {org.name}
                </Text>
                {currentOrg?.id === org.id && <Ionicons name="checkmark" size={18} color="#1a56db" />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalEvents}</Text>
            <Text style={styles.statLabel}>Total Events</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{upcomingEvents.length}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{thisWeekEvents.length}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/(admin)/events')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnPrimaryText}>+ Create Event</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push('/(admin)/checkin')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnSecondaryText}>QR Check-In</Text>
        </TouchableOpacity>

        {/* Upcoming Events Section */}
        <Text style={styles.sectionTitle}>Upcoming Events</Text>

        {eventsLoading ? (
          <ActivityIndicator size="small" color="#1a56db" style={styles.eventsLoader} />
        ) : upcomingPreview.length === 0 ? (
          <Text style={styles.emptyText}>No upcoming events</Text>
        ) : (
          upcomingPreview.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              totalSlots={slotCounts[event.id]?.total ?? 0}
              filledSlots={slotCounts[event.id]?.filled ?? 0}
              onPress={() => router.push('/(admin)/events')}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#1a56db',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  orgPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.88,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  orgOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orgOptionActive: {
    backgroundColor: '#eff6ff',
  },
  orgOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  orgOptionTextActive: {
    color: '#1a56db',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a56db',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  btnPrimary: {
    backgroundColor: '#1a56db',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  btnSecondary: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1a56db',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  btnSecondaryText: {
    color: '#1a56db',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  eventsLoader: {
    marginTop: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 16,
  },
});
