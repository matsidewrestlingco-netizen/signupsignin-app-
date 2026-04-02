import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useMySignups } from '../../hooks/useSignups';
import { useEvents } from '../../hooks/useEvents';
import { formatEventDate } from '../../lib/dateUtils';

export default function VolunteerCheckIn() {
  const { currentUser, userProfile } = useAuth();
  const { currentOrg } = useOrg();
  const { signups } = useMySignups(currentOrg?.id, currentUser?.uid);
  const { events } = useEvents(currentOrg?.id);

  const now = new Date();
  const upcomingSignups = signups
    .map(s => ({ ...s, event: events.find(e => e.id === s.eventId) ?? null }))
    .filter(s => s.event && s.event.startTime > now)
    .sort((a, b) => a.event!.startTime.getTime() - b.event!.startTime.getTime())
    .slice(0, 5);

  return (
    <SafeAreaView edges={['top']} style={s.safeArea}>
      <ScrollView style={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Check-In QR Code</Text>
          <Text style={s.headerSubtitle}>Show this code to an event organizer</Text>
        </View>

        {/* QR Code Card */}
        {currentUser ? (
          <View style={s.card}>
            <QRCode value={currentUser?.uid ?? 'loading'} size={220} />
            <Text style={s.volunteerName}>{userProfile?.name ?? ''}</Text>
            <Text style={s.volunteerEmail}>{userProfile?.email ?? ''}</Text>
            <Text style={s.instruction}>The organizer will scan this code to check you in</Text>
          </View>
        ) : (
          <View style={s.loginPrompt}>
            <Text style={s.loginText}>Please log in</Text>
          </View>
        )}

        {/* My Upcoming Signups */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>My Upcoming Signups</Text>
          {upcomingSignups.length === 0 ? (
            <Text style={s.emptyText}>No upcoming signups. Browse events to sign up.</Text>
          ) : (
            upcomingSignups.map(signup => (
              <View key={signup.id} style={s.signupRow}>
                <View style={s.signupInfo}>
                  <Text style={s.eventTitle}>{signup.event!.title}</Text>
                  <Text style={s.eventDate}>{formatEventDate(signup.event!.startTime, true)}</Text>
                </View>
                <Text style={signup.checkedIn ? s.checkedInIcon : s.notCheckedInIcon}>
                  {signup.checkedIn ? '✓' : '○'}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
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
    color: '#d1fae5',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  volunteerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  volunteerEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  loginPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  loginText: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  signupRow: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  signupInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  eventDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  checkedInIcon: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '700',
    marginLeft: 12,
  },
  notCheckedInIcon: {
    fontSize: 18,
    color: '#6b7280',
    marginLeft: 12,
  },
});
