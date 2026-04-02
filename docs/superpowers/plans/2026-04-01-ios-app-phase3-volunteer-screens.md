# SignupSignin iOS App — Phase 3: Volunteer Screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phase 2 complete — all hooks, shared components, and admin screens implemented.

**Goal:** Implement all volunteer screens: Dashboard, Browse Events + Signup, My Signups (with iOS Calendar integration), Check-In QR code display, and Profile.

**Architecture:** Volunteer screens use the same hooks as admin (`useEvents`, `useSlots`, `useMySignups`). The QR code display uses `react-native-qrcode-svg` to render the user's Firebase UID as a QR code. Calendar integration uses `expo-calendar`. All check-in state updates in real time via Firestore `onSnapshot`.

**Tech Stack:** Expo Router, React Native, Firebase JS SDK, react-native-qrcode-svg, expo-calendar, date-fns

---

## File Map

| File | Purpose |
|---|---|
| `components/QRCodeDisplay.tsx` | Renders user's UID as a QR code for admin scanning |
| `app/(volunteer)/dashboard.tsx` | Upcoming signups, next event countdown, QR shortcut |
| `app/(volunteer)/events.tsx` | Browse all public events |
| `app/(volunteer)/events/[id].tsx` | Event detail + slot list + signup/cancel |
| `app/(volunteer)/my-signups.tsx` | My upcoming + past signups, calendar add |
| `app/(volunteer)/checkin.tsx` | QR code display for active events |
| `app/(volunteer)/profile.tsx` | Edit profile + notification prefs + sign out |

---

## Task 1: QRCodeDisplay component

**Files:**
- Create: `components/QRCodeDisplay.tsx`
- Create: `__tests__/components/QRCodeDisplay.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/QRCodeDisplay.test.tsx`:

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { QRCodeDisplay } from '../../components/QRCodeDisplay';

jest.mock('react-native-qrcode-svg', () => {
  const { View } = require('react-native');
  return ({ value, testID }: { value: string; testID?: string }) => (
    <View testID={testID ?? 'qr-code'} accessibilityLabel={value} />
  );
});

describe('QRCodeDisplay', () => {
  it('renders a QR code with the provided uid', () => {
    render(<QRCodeDisplay uid="user-uid-123" />);
    const qr = screen.getByTestId('qr-code');
    expect(qr.props.accessibilityLabel).toBe('user-uid-123');
  });

  it('renders the user name below the QR code', () => {
    render(<QRCodeDisplay uid="uid" userName="Jane Smith" />);
    expect(screen.getByText('Jane Smith')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/components/QRCodeDisplay.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../../components/QRCodeDisplay'`

- [ ] **Step 3: Create components/QRCodeDisplay.tsx**

```typescript
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeDisplayProps {
  uid: string;
  userName?: string;
  size?: number;
}

export function QRCodeDisplay({ uid, userName, size = 240 }: QRCodeDisplayProps) {
  return (
    <View style={styles.container}>
      <View style={styles.qrWrapper}>
        <QRCode
          value={uid}
          size={size}
          color="#111827"
          backgroundColor="#ffffff"
          testID="qr-code"
        />
      </View>
      {userName && <Text style={styles.name}>{userName}</Text>}
      <Text style={styles.hint}>Show this to the event admin to check in</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  name: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16 },
  hint: { fontSize: 13, color: '#6b7280', marginTop: 6, textAlign: 'center' },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/components/QRCodeDisplay.test.tsx --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add components/QRCodeDisplay.tsx __tests__/components/QRCodeDisplay.test.tsx
git commit -m "feat: add QRCodeDisplay component"
```

---

## Task 2: Volunteer Dashboard

**Files:**
- Modify: `app/(volunteer)/dashboard.tsx`

- [ ] **Step 1: Replace app/(volunteer)/dashboard.tsx**

```typescript
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { format, isAfter, differenceInHours, differenceInDays } from 'date-fns';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMySignups } from '../../hooks/useSignups';
import { useEvents } from '../../hooks/useEvents';

function timeUntil(date: Date): string {
  const hours = differenceInHours(date, new Date());
  if (hours < 1) return 'Starting now!';
  if (hours < 24) return `in ${hours}h`;
  const days = differenceInDays(date, new Date());
  return `in ${days}d`;
}

export default function VolunteerDashboard() {
  const { currentUser, userProfile, logOut } = useAuth();
  const { currentOrg } = useOrg();
  const { signups, loading } = useMySignups(currentOrg?.id, currentUser?.uid);
  const { events } = useEvents(currentOrg?.id);
  const router = useRouter();

  const now = new Date();
  const upcomingSignups = signups
    .filter((s) => {
      const event = events.find((e) => e.id === s.eventId);
      return event && isAfter(event.startTime, now);
    })
    .sort((a, b) => {
      const ea = events.find((e) => e.id === a.eventId);
      const eb = events.find((e) => e.id === b.eventId);
      return (ea?.startTime.getTime() ?? 0) - (eb?.startTime.getTime() ?? 0);
    });

  const nextSignup = upcomingSignups[0];
  const nextEvent = nextSignup ? events.find((e) => e.id === nextSignup.eventId) : null;

  // Active events (started within last 2 hours) that volunteer is signed up for
  const activeSignup = signups.find((s) => {
    const event = events.find((e) => e.id === s.eventId);
    if (!event) return false;
    const hoursAgo = differenceInHours(now, event.startTime);
    return hoursAgo >= 0 && hoursAgo < 3 && !s.checkedIn;
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{userProfile?.name ?? 'Volunteer'}</Text>
          {currentOrg && <Text style={styles.orgName}>{currentOrg.name}</Text>}
        </View>
        <TouchableOpacity onPress={logOut}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Active event — show QR shortcut */}
      {activeSignup && (
        <TouchableOpacity style={styles.activeCard} onPress={() => router.push('/(volunteer)/checkin')}>
          <Text style={styles.activeTitle}>📲 Event in progress — tap to check in</Text>
        </TouchableOpacity>
      )}

      {/* Next event countdown */}
      {nextEvent && (
        <View style={styles.nextCard}>
          <Text style={styles.nextLabel}>Your next event</Text>
          <Text style={styles.nextTitle}>{nextEvent.title}</Text>
          <Text style={styles.nextDate}>{format(nextEvent.startTime, 'EEE, MMM d • h:mm a')}</Text>
          {nextEvent.location ? <Text style={styles.nextLocation}>📍 {nextEvent.location}</Text> : null}
          <Text style={styles.countdown}>{timeUntil(nextEvent.startTime)}</Text>
        </View>
      )}

      {/* Upcoming signups */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Upcoming Signups</Text>
          <TouchableOpacity onPress={() => router.push('/(volunteer)/my-signups')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : upcomingSignups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No upcoming signups.</Text>
            <TouchableOpacity onPress={() => router.push('/(volunteer)/events')}>
              <Text style={styles.browseLink}>Browse events →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          upcomingSignups.slice(0, 3).map((signup) => {
            const event = events.find((e) => e.id === signup.eventId);
            if (!event) return null;
            return (
              <TouchableOpacity
                key={signup.id}
                style={styles.signupRow}
                onPress={() => router.push(`/(volunteer)/events/${event.id}`)}
              >
                <View style={styles.signupInfo}>
                  <Text style={styles.signupTitle}>{event.title}</Text>
                  <Text style={styles.signupDate}>{format(event.startTime, 'EEE, MMM d • h:mm a')}</Text>
                </View>
                <Text style={styles.countdown}>{timeUntil(event.startTime)}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 14, color: '#6b7280' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  orgName: { fontSize: 13, color: '#059669', marginTop: 2 },
  logoutText: { color: '#6b7280', fontSize: 14, paddingTop: 4 },
  activeCard: { backgroundColor: '#059669', borderRadius: 12, padding: 16, marginBottom: 16 },
  activeTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nextCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  nextLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  nextTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  nextDate: { fontSize: 14, color: '#4b5563', marginBottom: 2 },
  nextLocation: { fontSize: 13, color: '#9ca3af' },
  countdown: { fontSize: 13, color: '#059669', fontWeight: '600', marginTop: 6 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 14, color: '#059669' },
  muted: { color: '#9ca3af', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  browseLink: { color: '#059669', fontWeight: '600', fontSize: 14 },
  signupRow: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  signupInfo: { flex: 1 },
  signupTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  signupDate: { fontSize: 13, color: '#4b5563' },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/(volunteer)/dashboard.tsx
git commit -m "feat: implement volunteer dashboard"
```

---

## Task 3: Browse Events + Event Detail + Signup

**Files:**
- Modify: `app/(volunteer)/events.tsx`
- Create: `app/(volunteer)/events/[id].tsx`

- [ ] **Step 1: Replace app/(volunteer)/events.tsx**

```typescript
import { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { isAfter } from 'date-fns';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import { EventCard } from '../../components/EventCard';

export default function VolunteerEvents() {
  const { currentOrg } = useOrg();
  const { events, loading } = useEvents(currentOrg?.id);
  const router = useRouter();
  const [search, setSearch] = useState('');

  const now = new Date();
  const upcoming = events
    .filter((e) => e.isPublic && isAfter(e.startTime, now))
    .filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Events</Text>
      </View>
      <TextInput
        style={styles.search}
        placeholder="Search events…"
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : upcoming.length === 0 ? (
          <Text style={styles.muted}>No upcoming events.</Text>
        ) : (
          upcoming.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push(`/(volunteer)/events/${event.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  headerBar: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  search: { margin: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  content: { paddingHorizontal: 12, paddingBottom: 24 },
  muted: { color: '#9ca3af', textAlign: 'center', paddingVertical: 32, fontSize: 14 },
});
```

- [ ] **Step 2: Create app/(volunteer)/events/[id].tsx**

```typescript
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useOrg } from '../../../contexts/OrgContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useSlots } from '../../../hooks/useSlots';
import { useSignups } from '../../../hooks/useSignups';
import { useMySignups } from '../../../hooks/useSignups';
import { StatusBadge } from '../../../components/StatusBadge';
import type { Event } from '../../../lib/types';

export default function VolunteerEventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentOrg } = useOrg();
  const { currentUser, userProfile } = useAuth();
  const { slots, loading: slotsLoading } = useSlots(currentOrg?.id, id);
  const { signups, createSignup, cancelSignup, loading: signupsLoading } = useSignups(currentOrg?.id, id);
  const { signups: mySignups } = useMySignups(currentOrg?.id, currentUser?.uid);
  const [event, setEvent] = useState<Event | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [actionSlot, setActionSlot] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!currentOrg?.id || !id) { setEventLoading(false); return; }
    getDoc(doc(db, 'organizations', currentOrg.id, 'events', id)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setEvent({ id: snap.id, title: data.title, startTime: (data.startTime as Timestamp).toDate(), endTime: data.endTime ? (data.endTime as Timestamp).toDate() : undefined, location: data.location || '', description: data.description || '', isPublic: data.isPublic ?? true, createdAt: (data.createdAt as Timestamp)?.toDate() || new Date() });
      }
      setEventLoading(false);
    });
  }, [currentOrg?.id, id]);

  // Signups for this event that belong to the current user
  const mySignupsForEvent = mySignups.filter((s) => s.eventId === id);
  const mySignedSlotIds = new Set(mySignupsForEvent.map((s) => s.slotId));

  async function handleSignup(slotId: string) {
    if (!currentUser || !userProfile) return;
    setActionSlot(slotId);
    try {
      await createSignup({
        eventId: id!,
        slotId,
        userId: currentUser.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
      });
    } catch (e) {
      Alert.alert('Sign Up Failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setActionSlot(null);
    }
  }

  async function handleCancel(slotId: string) {
    const signup = mySignupsForEvent.find((s) => s.slotId === slotId);
    if (!signup) return;
    Alert.alert('Cancel Signup', 'Are you sure you want to cancel this signup?', [
      { text: 'Keep Signup', style: 'cancel' },
      {
        text: 'Cancel Signup',
        style: 'destructive',
        onPress: async () => {
          setActionSlot(slotId);
          try { await cancelSignup(signup.id); }
          finally { setActionSlot(null); }
        },
      },
    ]);
  }

  if (eventLoading || slotsLoading || signupsLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#059669" /></View>;
  }

  const signupsBySlot: Record<string, typeof signups> = {};
  signups.forEach((s) => { if (!signupsBySlot[s.slotId]) signupsBySlot[s.slotId] = []; signupsBySlot[s.slotId].push(s); });

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{event?.title}</Text>
        <Text style={styles.date}>{event && format(event.startTime, 'EEEE, MMMM d, yyyy')}</Text>
        <Text style={styles.time}>{event && format(event.startTime, 'h:mm a')}{event?.endTime && ` – ${format(event.endTime, 'h:mm a')}`}</Text>
        {event?.location ? <Text style={styles.location}>📍 {event.location}</Text> : null}
        {event?.description ? <Text style={styles.description}>{event.description}</Text> : null}

        <Text style={styles.sectionTitle}>Available Slots</Text>

        {slots.length === 0 ? (
          <Text style={styles.muted}>No slots available for this event.</Text>
        ) : (
          slots.map((slot) => {
            const slotSignups = signupsBySlot[slot.id] || [];
            const isFull = slotSignups.length >= slot.quantityTotal;
            const isMineInSlot = mySignedSlotIds.has(slot.id);
            const open = slot.quantityTotal - slotSignups.length;

            return (
              <View key={slot.id} style={styles.slotCard}>
                <View style={styles.slotHeader}>
                  <View style={styles.slotMeta}>
                    <Text style={styles.slotName}>{slot.name}</Text>
                    {slot.category !== 'General' && <Text style={styles.slotCategory}>{slot.category}</Text>}
                    {slot.startTime && <Text style={styles.slotTime}>{format(slot.startTime, 'h:mm a')}{slot.endTime && ` – ${format(slot.endTime, 'h:mm a')}`}</Text>}
                  </View>
                  <View style={styles.slotRight}>
                    <StatusBadge
                      label={isFull ? 'Full' : `${open} open`}
                      status={isFull ? 'error' : 'success'}
                    />
                  </View>
                </View>

                {slot.description ? <Text style={styles.slotDesc}>{slot.description}</Text> : null}

                {isMineInSlot ? (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancel(slot.id)}
                    disabled={actionSlot === slot.id}
                  >
                    {actionSlot === slot.id
                      ? <ActivityIndicator size="small" color="#dc2626" />
                      : <Text style={styles.cancelBtnText}>✅ You're signed up — tap to cancel</Text>
                    }
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.signupBtn, (isFull || !!actionSlot) && styles.disabled]}
                    onPress={() => handleSignup(slot.id)}
                    disabled={isFull || !!actionSlot}
                  >
                    {actionSlot === slot.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.signupBtnText}>{isFull ? 'Slot Full' : 'Sign Up'}</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBar: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  back: { color: '#059669', fontSize: 16 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  date: { fontSize: 15, color: '#374151', fontWeight: '500' },
  time: { fontSize: 14, color: '#4b5563', marginBottom: 4 },
  location: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  description: { fontSize: 14, color: '#374151', marginTop: 8, lineHeight: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 10 },
  muted: { color: '#9ca3af', textAlign: 'center', paddingVertical: 20, fontSize: 14 },
  slotCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  slotMeta: { flex: 1 },
  slotRight: { marginLeft: 8 },
  slotName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  slotCategory: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  slotTime: { fontSize: 12, color: '#4b5563', marginTop: 2 },
  slotDesc: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  signupBtn: { backgroundColor: '#059669', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  signupBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelBtn: { backgroundColor: '#fef2f2', borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
  cancelBtnText: { color: '#dc2626', fontWeight: '500', fontSize: 13 },
  disabled: { opacity: 0.5 },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/(volunteer)/events.tsx app/(volunteer)/events/
git commit -m "feat: implement volunteer browse events and event detail with signup"
```

---

## Task 4: My Signups + iOS Calendar integration

**Files:**
- Modify: `app/(volunteer)/my-signups.tsx`

- [ ] **Step 1: Replace app/(volunteer)/my-signups.tsx**

```typescript
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { format, isAfter } from 'date-fns';
import * as Calendar from 'expo-calendar';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMySignups } from '../../hooks/useSignups';
import { useEvents } from '../../hooks/useEvents';
import { StatusBadge } from '../../components/StatusBadge';

async function addToCalendar(title: string, startTime: Date, endTime: Date | undefined, location: string) {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Calendar access is needed to add events.');
    return;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCal = calendars.find((c) => c.allowsModifications) ?? calendars[0];
  if (!defaultCal) { Alert.alert('No calendar found'); return; }

  await Calendar.createEventAsync(defaultCal.id, {
    title,
    startDate: startTime,
    endDate: endTime ?? new Date(startTime.getTime() + 2 * 60 * 60 * 1000), // default 2h
    location,
    notes: `Added from SignupSignin`,
  });

  Alert.alert('Added to Calendar', `"${title}" has been added to your calendar.`);
}

export default function MySignups() {
  const { currentUser } = useAuth();
  const { currentOrg } = useOrg();
  const { signups, loading, cancelSignup } = useMySignups(currentOrg?.id, currentUser?.uid);
  const { events } = useEvents(currentOrg?.id);
  const router = useRouter();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const now = new Date();
  const filtered = signups.filter((s) => {
    const event = events.find((e) => e.id === s.eventId);
    if (!event) return false;
    return tab === 'upcoming' ? isAfter(event.startTime, now) : !isAfter(event.startTime, now);
  }).sort((a, b) => {
    const ea = events.find((e) => e.id === a.eventId);
    const eb = events.find((e) => e.id === b.eventId);
    const ta = ea?.startTime.getTime() ?? 0;
    const tb = eb?.startTime.getTime() ?? 0;
    return tab === 'upcoming' ? ta - tb : tb - ta;
  });

  function handleCancel(signupId: string, eventTitle: string) {
    Alert.alert('Cancel Signup', `Cancel your signup for "${eventTitle}"?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Signup',
        style: 'destructive',
        onPress: async () => {
          setCancelling(signupId);
          try { await cancelSignup(signupId); }
          finally { setCancelling(null); }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>My Signups</Text>
      </View>

      <View style={styles.tabs}>
        {(['upcoming', 'past'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.activeTab]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.muted}>No {tab} signups.</Text>
            {tab === 'upcoming' && (
              <TouchableOpacity onPress={() => router.push('/(volunteer)/events')}>
                <Text style={styles.browseLink}>Browse events →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((signup) => {
            const event = events.find((e) => e.id === signup.eventId);
            if (!event) return null;
            return (
              <View key={signup.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{event.title}</Text>
                    <Text style={styles.cardDate}>{format(event.startTime, 'EEE, MMM d • h:mm a')}</Text>
                    {event.location ? <Text style={styles.cardLocation}>📍 {event.location}</Text> : null}
                  </View>
                  <StatusBadge
                    label={signup.checkedIn ? 'Checked In' : 'Signed Up'}
                    status={signup.checkedIn ? 'success' : 'info'}
                  />
                </View>

                <View style={styles.cardActions}>
                  {tab === 'upcoming' && !signup.checkedIn && (
                    <>
                      <TouchableOpacity
                        style={styles.calendarBtn}
                        onPress={() => addToCalendar(event.title, event.startTime, event.endTime, event.location)}
                      >
                        <Text style={styles.calendarBtnText}>📅 Add to Calendar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cancelBtn, cancelling === signup.id && styles.disabled]}
                        onPress={() => handleCancel(signup.id, event.title)}
                        disabled={cancelling === signup.id}
                      >
                        <Text style={styles.cancelBtnText}>
                          {cancelling === signup.id ? 'Cancelling…' : 'Cancel'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  headerBar: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#059669' },
  tabText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  activeTabText: { color: '#059669', fontWeight: '600' },
  content: { padding: 12, paddingBottom: 40 },
  muted: { color: '#9ca3af', textAlign: 'center', paddingVertical: 32, fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  browseLink: { color: '#059669', fontWeight: '600', fontSize: 14, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 3 },
  cardDate: { fontSize: 13, color: '#4b5563', marginBottom: 2 },
  cardLocation: { fontSize: 12, color: '#9ca3af' },
  cardActions: { flexDirection: 'row', gap: 8 },
  calendarBtn: { flex: 1, backgroundColor: '#f0fdf4', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0' },
  calendarBtnText: { color: '#059669', fontWeight: '600', fontSize: 13 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  cancelBtnText: { color: '#dc2626', fontSize: 13 },
  disabled: { opacity: 0.5 },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/(volunteer)/my-signups.tsx
git commit -m "feat: implement My Signups with iOS calendar integration"
```

---

## Task 5: Volunteer Check-In (QR code display) + Profile

**Files:**
- Modify: `app/(volunteer)/checkin.tsx`
- Create: `app/(volunteer)/profile.tsx`

- [ ] **Step 1: Replace app/(volunteer)/checkin.tsx**

```typescript
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { format, differenceInHours } from 'date-fns';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMySignups } from '../../hooks/useSignups';
import { useEvents } from '../../hooks/useEvents';
import { QRCodeDisplay } from '../../components/QRCodeDisplay';

export default function VolunteerCheckIn() {
  const { currentUser, userProfile } = useAuth();
  const { currentOrg } = useOrg();
  const { signups } = useMySignups(currentOrg?.id, currentUser?.uid);
  const { events } = useEvents(currentOrg?.id);
  const router = useRouter();

  const now = new Date();

  // Events that started within the last 3 hours — "active window"
  const activeSignups = signups.filter((s) => {
    const event = events.find((e) => e.id === s.eventId);
    if (!event) return false;
    const hoursAgo = differenceInHours(now, event.startTime);
    return hoursAgo >= 0 && hoursAgo < 3;
  });

  // If volunteer has already checked in to all active events, show confirmed
  const allCheckedIn = activeSignups.length > 0 && activeSignups.every((s) => s.checkedIn);

  if (!currentUser) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Check-In</Text>
      </View>

      {activeSignups.length === 0 ? (
        <View style={styles.noEvent}>
          <Text style={styles.noEventText}>No active events right now.</Text>
          <Text style={styles.noEventSub}>Your QR code will appear here when an event you're signed up for is in progress.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(volunteer)/events')}>
            <Text style={styles.browseBtnText}>Browse Upcoming Events</Text>
          </TouchableOpacity>
        </View>
      ) : allCheckedIn ? (
        <View style={styles.checkedInState}>
          <Text style={styles.checkedInIcon}>✅</Text>
          <Text style={styles.checkedInTitle}>You're checked in!</Text>
          {activeSignups.map((s) => {
            const event = events.find((e) => e.id === s.eventId);
            if (!event || !s.checkedInAt) return null;
            return (
              <Text key={s.id} style={styles.checkedInDetail}>
                {event.title} · {format(s.checkedInAt, 'h:mm a')}
              </Text>
            );
          })}
        </View>
      ) : (
        <>
          <Text style={styles.instructions}>
            Show this QR code to the event admin to check in.
          </Text>
          <View style={styles.qrContainer}>
            <QRCodeDisplay
              uid={currentUser.uid}
              userName={userProfile?.name}
              size={260}
            />
          </View>

          {activeSignups.map((s) => {
            const event = events.find((e) => e.id === s.eventId);
            if (!event) return null;
            return (
              <View key={s.id} style={styles.eventBadge}>
                <Text style={styles.eventBadgeTitle}>{event.title}</Text>
                <Text style={styles.eventBadgeDate}>{format(event.startTime, 'h:mm a')}</Text>
                <Text style={[styles.eventBadgeStatus, s.checkedIn && styles.checkedInText]}>
                  {s.checkedIn ? '✅ Checked in' : '⏳ Awaiting check-in'}
                </Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingBottom: 40 },
  headerBar: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  instructions: { fontSize: 15, color: '#374151', textAlign: 'center', marginHorizontal: 32, marginBottom: 24 },
  qrContainer: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 24 },
  noEvent: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  noEventText: { fontSize: 18, fontWeight: '600', color: '#374151', textAlign: 'center', marginBottom: 10 },
  noEventSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  browseBtn: { backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  checkedInState: { alignItems: 'center', paddingTop: 80 },
  checkedInIcon: { fontSize: 64, marginBottom: 16 },
  checkedInTitle: { fontSize: 24, fontWeight: '700', color: '#059669', marginBottom: 8 },
  checkedInDetail: { fontSize: 14, color: '#374151', marginTop: 4 },
  eventBadge: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10 },
  eventBadgeTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  eventBadgeDate: { fontSize: 13, color: '#4b5563', marginTop: 2 },
  eventBadgeStatus: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  checkedInText: { color: '#059669' },
});
```

- [ ] **Step 2: Create app/(volunteer)/profile.tsx**

```typescript
import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function VolunteerProfile() {
  const { currentUser, userProfile, logOut, refreshProfile } = useAuth();
  const [name, setName] = useState(userProfile?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { name: name.trim() });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logOut },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{userProfile?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoComplete="name"
        />
        <TouchableOpacity
          style={[styles.saveBtn, (saving || saved) && styles.savedBtn]}
          onPress={handleSave}
          disabled={saving || saved}
        >
          <Text style={styles.saveBtnText}>{saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Name'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingBottom: 40 },
  headerBar: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  section: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 10, marginBottom: 16, padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 15, color: '#374151' },
  rowValue: { fontSize: 15, color: '#6b7280' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827', marginBottom: 12 },
  saveBtn: { backgroundColor: '#059669', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  savedBtn: { backgroundColor: '#6b7280' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  logoutRow: { alignItems: 'center', paddingVertical: 4 },
  logoutText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 3: Add Profile tab to volunteer tab bar**

In `app/(volunteer)/_layout.tsx`, add a Profile screen that is hidden from the tab bar (accessible from header):

```typescript
<Tabs.Screen
  name="profile"
  options={{
    href: null, // Not in tab bar — accessed from dashboard header
  }}
/>
```

Also add a Profile button to the volunteer dashboard header (in `app/(volunteer)/dashboard.tsx`):

```typescript
// In header View, add alongside the log out button:
<TouchableOpacity onPress={() => router.push('/(volunteer)/profile')}>
  <Text style={styles.profileLink}>Edit Profile</Text>
</TouchableOpacity>
```

Add to styles:
```typescript
profileLink: { color: '#059669', fontSize: 14, paddingTop: 4 },
```

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests PASS

- [ ] **Step 5: Smoke test on device**

```bash
npx expo start
```

Verify:
- Volunteer dashboard shows upcoming signups and next event countdown
- Browse Events shows public upcoming events
- Tapping an event shows slots with Sign Up / Cancel buttons
- Signing up adds to My Signups
- My Signups shows upcoming/past toggle with "Add to Calendar" button
- Check-In tab shows "No active events" or QR code if event is in progress
- Profile shows name editor and log out

- [ ] **Step 6: Commit**

```bash
git add app/(volunteer)/checkin.tsx app/(volunteer)/profile.tsx app/(volunteer)/_layout.tsx app/(volunteer)/dashboard.tsx
git commit -m "feat: implement volunteer check-in QR display and profile screens"
```

---

## Phase 3 Complete

All volunteer screens are implemented:
- Dashboard with next event countdown and active event QR shortcut
- Browse Events (public, upcoming) with search
- Event Detail with slot list, signup, and cancel
- My Signups (upcoming/past) with iOS Calendar integration and cancel
- Check-In tab showing personal QR code for admin to scan (updates in real time)
- Profile screen with name edit and log out

**Next:** Proceed to Phase 4 (`2026-04-01-ios-app-phase4-notifications-and-build.md`) for push notifications and EAS Build setup.
