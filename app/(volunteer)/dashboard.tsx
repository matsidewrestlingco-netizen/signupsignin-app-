import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import { useMySignups } from '../../hooks/useSignups';
import { EventCard } from '../../components/EventCard';
import { LoadingScreen } from '../../components/LoadingScreen';
import { formatEventDate } from '../../lib/dateUtils';

export default function VolunteerDashboard() {
  const router = useRouter();
  const { currentUser, userProfile } = useAuth();
  const { currentOrg, loading: orgLoading } = useOrg();
  const { events, loading: eventsLoading } = useEvents(currentOrg?.id);
  const { signups } = useMySignups(currentOrg?.id, currentUser?.uid);

  if (orgLoading) {
    return <LoadingScreen />;
  }

  const now = new Date();

  const upcomingPublicEvents = events
    .filter((e) => e.isPublic && e.startTime > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, 3);

  const myUpcomingSignups = signups
    .filter((s) => {
      const event = events.find((e) => e.id === s.eventId);
      return event && event.startTime > now;
    })
    .slice(0, 2);

  const orgName = currentOrg?.name ?? 'My Organization';
  const volunteerName = userProfile?.name ?? 'Volunteer';

  const nextSignup = myUpcomingSignups.length > 0 ? myUpcomingSignups[0] : null;
  const nextSignupEvent = nextSignup ? events.find((e) => e.id === nextSignup.eventId) : null;

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.flex}>
        {/* Green Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{orgName}</Text>
          <Text style={styles.headerSubtitle}>{`Welcome, ${volunteerName}`}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* My Next Signup */}
          {nextSignup && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>My Next Signup</Text>
              <View style={styles.nextSignupCard}>
                <Text style={styles.nextSignupTitle}>{nextSignupEvent?.title ?? ''}</Text>
                {nextSignupEvent && (
                  <Text style={styles.nextSignupDate}>
                    {formatEventDate(nextSignupEvent.startTime)}
                  </Text>
                )}
                {nextSignup.checkedIn ? (
                  <Text style={styles.checkedInText}>Checked in ✓</Text>
                ) : null}
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => router.push('/(volunteer)/events')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnPrimaryText}>Browse Events</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => router.push('/(volunteer)/my-signups')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnSecondaryText}>My Signups</Text>
            </TouchableOpacity>
          </View>

          {/* Upcoming Events */}
          <Text style={styles.sectionLabel}>Upcoming Events</Text>

          {eventsLoading ? (
            <ActivityIndicator size="small" color="#059669" style={styles.loader} />
          ) : upcomingPublicEvents.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming events</Text>
          ) : (
            upcomingPublicEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                totalSlots={0}
                filledSlots={0}
                onPress={() => router.push('/(volunteer)/events')}
              />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  flex: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.88,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  nextSignupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  nextSignupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  nextSignupDate: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  checkedInText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: '#059669',
  },
  actionBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  actionBtnSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#059669',
  },
  actionBtnSecondaryText: {
    color: '#059669',
    fontSize: 15,
    fontWeight: '600',
  },
  loader: {
    marginTop: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    marginTop: 16,
  },
});
