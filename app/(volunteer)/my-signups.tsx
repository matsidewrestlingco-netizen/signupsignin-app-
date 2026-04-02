import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import { useMySignups } from '../../hooks/useSignups';
import { formatEventDate } from '../../lib/dateUtils';
import type { Event } from '../../lib/types';
import type { Signup } from '../../lib/types';

type EnrichedSignup = Signup & { event: Event | null };

export default function VolunteerMySignups() {
  const { currentUser } = useAuth();
  const { currentOrg } = useOrg();
  const { events } = useEvents(currentOrg?.id);
  const { signups, loading, cancelSignup } = useMySignups(currentOrg?.id, currentUser?.uid);

  const enrichedSignups: EnrichedSignup[] = signups.map((s) => ({
    ...s,
    event: events.find((e) => e.id === s.eventId) ?? null,
  }));

  const now = new Date();
  const upcoming = enrichedSignups
    .filter((s) => s.event && s.event.startTime > now)
    .sort((a, b) => a.event!.startTime.getTime() - b.event!.startTime.getTime());
  const past = enrichedSignups
    .filter((s) => !s.event || s.event.startTime <= now)
    .sort((a, b) => (b.event?.startTime.getTime() ?? 0) - (a.event?.startTime.getTime() ?? 0));

  function handleCancel(signupId: string) {
    Alert.alert(
      'Cancel Signup',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => cancelSignup(signupId),
        },
      ]
    );
  }

  function renderCard(item: EnrichedSignup, isPast: boolean) {
    return (
      <View key={item.id} style={styles.card}>
        <Text style={styles.cardTitle}>{item.event?.title ?? 'Unknown Event'}</Text>
        {item.event && (
          <>
            <Text style={styles.cardMeta}>{'📅 ' + formatEventDate(item.event.startTime, true)}</Text>
            {!!item.event.location && (
              <Text style={styles.cardMeta}>{'📍 ' + item.event.location}</Text>
            )}
          </>
        )}
        <Text style={styles.cardSlot}>Slot registered</Text>

        <View style={styles.cardFooter}>
          {item.checkedIn ? (
            <View style={styles.checkedInBadge}>
              <Text style={styles.checkedInText}>✓ Checked In</Text>
            </View>
          ) : !isPast ? (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Signups</Text>
          <Text style={styles.headerSubtitle}>{upcoming.length} upcoming</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#059669" style={styles.centered} />
        ) : signups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No signups yet</Text>
            <Text style={styles.emptySubtext}>Browse events to sign up as a volunteer.</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {upcoming.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Upcoming</Text>
                {upcoming.map((item) => renderCard(item, false))}
              </>
            )}
            {past.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Past</Text>
                {past.map((item) => renderCard(item, true))}
              </>
            )}
          </ScrollView>
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
  header: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#a7f3d0',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  cardSlot: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 8,
    marginTop: 4,
  },
  checkedInBadge: {
    backgroundColor: '#d1fae5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  checkedInText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065f46',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
  centered: {
    marginTop: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
