# SignupSignin iOS App — Phase 2: Admin Screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phase 1 complete — working auth, role routing, and tab bar skeletons.

**Goal:** Implement all admin screens with full functionality: Dashboard, Events list + detail + create/edit, Templates, Check-In (QR scanner + manual list), Reports, and Settings.

**Architecture:** Each screen consumes hooks that mirror the web app exactly (`useEvents`, `useSlots`, `useSignups`, `useTemplates`). Hooks are copied from the web app's `src/hooks/` with only the import path changed (`../lib/firebase` → stays the same). QR scanning uses `expo-camera` with `useCameraPermissions`. All Firestore writes use the same collection paths as the web app.

**Tech Stack:** Expo Router, React Native, Firebase JS SDK, expo-camera, expo-barcode-scanner, react-native-qrcode-svg, date-fns

---

## File Map

| File | Purpose |
|---|---|
| `hooks/useEvents.ts` | Events CRUD with Firestore `onSnapshot` |
| `hooks/useSlots.ts` | Slots CRUD per event |
| `hooks/useSignups.ts` | Signups + check-in operations |
| `hooks/useTemplates.ts` | Event templates CRUD |
| `components/EventCard.tsx` | Event summary card (shared admin + volunteer) |
| `components/StatusBadge.tsx` | Colored status pill |
| `app/(admin)/dashboard.tsx` | Stats + upcoming events + quick check-in shortcut |
| `app/(admin)/events.tsx` | Events list with upcoming/past toggle |
| `app/(admin)/events/[id].tsx` | Event detail — slots, signups, edit, delete |
| `app/(admin)/events/create.tsx` | Create event modal-style screen |
| `app/(admin)/templates.tsx` | Templates list + create/delete |
| `app/(admin)/checkin.tsx` | Event selector for check-in |
| `app/(admin)/checkin/[eventId]/scanner.tsx` | QR scanner screen |
| `app/(admin)/checkin/[eventId]/manual.tsx` | Manual check-in list |
| `app/(admin)/reports.tsx` | Per-event attendance report + export |
| `app/(admin)/settings.tsx` | Org settings + sign out |

---

## Task 1: Data hooks (copy + adapt from web app)

**Files:**
- Create: `hooks/useEvents.ts`
- Create: `hooks/useSlots.ts`
- Create: `hooks/useSignups.ts`
- Create: `hooks/useTemplates.ts`
- Create: `__tests__/hooks/useEvents.test.ts`

- [ ] **Step 1: Write the failing useEvents test**

Create `__tests__/hooks/useEvents.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useEvents } from '../../hooks/useEvents';

// Mock firebase
jest.mock('../../lib/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn((q, cb) => {
    cb({ forEach: (fn: (d: unknown) => void) => [] });
    return jest.fn(); // unsubscribe
  }),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: { fromDate: jest.fn((d) => d) },
}));

describe('useEvents', () => {
  it('returns empty array and loading false when orgId is undefined', async () => {
    const { result } = renderHook(() => useEvents(undefined));
    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('exposes createEvent, updateEvent, deleteEvent functions', () => {
    const { result } = renderHook(() => useEvents('org123'));
    expect(typeof result.current.createEvent).toBe('function');
    expect(typeof result.current.updateEvent).toBe('function');
    expect(typeof result.current.deleteEvent).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/hooks/useEvents.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../hooks/useEvents'`

- [ ] **Step 3: Create hooks/useEvents.ts**

This is an exact copy of the web app's `src/hooks/useEvents.ts` with one import change:

```typescript
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Event, EventInput } from '../lib/types';

export function useEvents(orgId: string | undefined) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    const eventsRef = collection(db, 'organizations', orgId, 'events');
    const q = query(eventsRef, orderBy('startTime', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eventList: Event[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          eventList.push({
            id: doc.id,
            title: data.title,
            startTime: (data.startTime as Timestamp)?.toDate() || new Date(),
            endTime: data.endTime ? (data.endTime as Timestamp).toDate() : undefined,
            location: data.location || '',
            description: data.description || '',
            isPublic: data.isPublic ?? true,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        });
        setEvents(eventList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [orgId]);

  async function createEvent(data: EventInput): Promise<string> {
    if (!orgId) throw new Error('No organization selected');
    const eventsRef = collection(db, 'organizations', orgId, 'events');
    const docRef = await addDoc(eventsRef, {
      ...data,
      startTime: Timestamp.fromDate(data.startTime),
      endTime: data.endTime ? Timestamp.fromDate(data.endTime) : null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async function updateEvent(eventId: string, data: Partial<EventInput>): Promise<void> {
    if (!orgId) throw new Error('No organization selected');
    const eventRef = doc(db, 'organizations', orgId, 'events', eventId);
    const updateData: Record<string, unknown> = { ...data };
    if (data.startTime) updateData.startTime = Timestamp.fromDate(data.startTime);
    if (data.endTime) updateData.endTime = Timestamp.fromDate(data.endTime);
    await updateDoc(eventRef, updateData);
  }

  async function deleteEvent(eventId: string): Promise<void> {
    if (!orgId) throw new Error('No organization selected');
    await deleteDoc(doc(db, 'organizations', orgId, 'events', eventId));
  }

  return { events, loading, error, createEvent, updateEvent, deleteEvent };
}
```

- [ ] **Step 4: Create hooks/useSlots.ts**

Exact copy of web app's `src/hooks/useSlots.ts`, changing only the import path:

```typescript
import { useState, useEffect } from 'react';
import {
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, Timestamp, getCountFromServer, where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Slot, SlotInput } from '../lib/types';

export function useSlots(orgId: string | undefined, eventId: string | undefined) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !eventId) { setSlots([]); setLoading(false); return; }
    const slotsRef = collection(db, 'organizations', orgId, 'events', eventId, 'slots');
    const unsubscribe = onSnapshot(slotsRef, async (snapshot) => {
      try {
        const slotList: Slot[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          let quantityFilled = 0;
          try {
            const signupsRef = collection(db, 'organizations', orgId, 'signups');
            const q = query(signupsRef, where('eventId', '==', eventId), where('slotId', '==', docSnap.id));
            const countSnap = await getCountFromServer(q);
            quantityFilled = countSnap.data().count;
          } catch { /* use 0 */ }
          slotList.push({
            id: docSnap.id,
            name: data.name,
            category: data.category || 'General',
            quantityTotal: data.quantityTotal || 1,
            quantityFilled,
            startTime: data.startTime ? (data.startTime as Timestamp).toDate() : undefined,
            endTime: data.endTime ? (data.endTime as Timestamp).toDate() : undefined,
            description: data.description || '',
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        }
        slotList.sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category);
          if (a.startTime && b.startTime) return a.startTime.getTime() - b.startTime.getTime();
          return 0;
        });
        setSlots(slotList);
        setLoading(false);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load slots');
        setLoading(false);
      }
    }, (err) => { setError(err.message); setLoading(false); });
    return () => unsubscribe();
  }, [orgId, eventId]);

  async function createSlot(data: SlotInput): Promise<string> {
    if (!orgId || !eventId) throw new Error('No organization or event selected');
    const slotsRef = collection(db, 'organizations', orgId, 'events', eventId, 'slots');
    const docRef = await addDoc(slotsRef, {
      ...data,
      startTime: data.startTime ? Timestamp.fromDate(data.startTime) : null,
      endTime: data.endTime ? Timestamp.fromDate(data.endTime) : null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async function updateSlot(slotId: string, data: Partial<SlotInput>): Promise<void> {
    if (!orgId || !eventId) throw new Error('No organization or event selected');
    const slotRef = doc(db, 'organizations', orgId, 'events', eventId, 'slots', slotId);
    const updateData: Record<string, unknown> = { ...data };
    if (data.startTime) updateData.startTime = Timestamp.fromDate(data.startTime);
    if (data.endTime) updateData.endTime = Timestamp.fromDate(data.endTime);
    await updateDoc(slotRef, updateData);
  }

  async function deleteSlot(slotId: string): Promise<void> {
    if (!orgId || !eventId) throw new Error('No organization or event selected');
    await deleteDoc(doc(db, 'organizations', orgId, 'events', eventId, 'slots', slotId));
  }

  return { slots, loading, error, createSlot, updateSlot, deleteSlot };
}
```

- [ ] **Step 5: Create hooks/useSignups.ts**

Exact copy of web app's `src/hooks/useSignups.ts`, changing only the import path:

```typescript
import { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, updateDoc, deleteDoc,
  doc, getDoc, serverTimestamp, Timestamp, getDocs, increment, runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Signup, SignupInput } from '../lib/types';

export function useSignups(orgId: string | undefined, eventId?: string) {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !eventId) { setSignups([]); setLoading(false); return; }
    const signupsRef = collection(db, 'organizations', orgId, 'signups');
    const q = query(signupsRef, where('eventId', '==', eventId), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Signup[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id, eventId: data.eventId, slotId: data.slotId,
          userId: data.userId, userName: data.userName, userEmail: data.userEmail,
          note: data.note || '', checkedIn: data.checkedIn ?? false,
          checkedInAt: data.checkedInAt ? (data.checkedInAt as Timestamp).toDate() : undefined,
          createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        });
      });
      setSignups(list); setLoading(false); setError(null);
    }, (err) => { setError(err.message); setLoading(false); });
    return () => unsubscribe();
  }, [orgId, eventId]);

  async function createSignup(data: SignupInput): Promise<string> {
    if (!orgId) throw new Error('No organization selected');
    const signupsRef = collection(db, 'organizations', orgId, 'signups');
    const slotRef = doc(db, 'organizations', orgId, 'events', data.eventId, 'slots', data.slotId);
    const existingQuery = query(signupsRef, where('slotId', '==', data.slotId), where('userId', '==', data.userId));
    const existingDocs = await getDocs(existingQuery);
    if (!existingDocs.empty) throw new Error('You have already signed up for this slot');
    const newSignupRef = doc(signupsRef);
    await runTransaction(db, async (transaction) => {
      const slotSnap = await transaction.get(slotRef);
      if (!slotSnap.exists()) throw new Error('Slot not found');
      const { quantityFilled = 0, quantityTotal = 1 } = slotSnap.data();
      if (quantityFilled >= quantityTotal) throw new Error('This slot is full');
      transaction.set(newSignupRef, { ...data, note: data.note || '', checkedIn: false, createdAt: serverTimestamp() });
      transaction.update(slotRef, { quantityFilled: increment(1) });
    });
    return newSignupRef.id;
  }

  async function checkIn(signupId: string): Promise<void> {
    if (!orgId) throw new Error('No organization selected');
    await updateDoc(doc(db, 'organizations', orgId, 'signups', signupId), {
      checkedIn: true, checkedInAt: serverTimestamp(),
    });
  }

  async function undoCheckIn(signupId: string): Promise<void> {
    if (!orgId) throw new Error('No organization selected');
    await updateDoc(doc(db, 'organizations', orgId, 'signups', signupId), {
      checkedIn: false, checkedInAt: null,
    });
  }

  async function cancelSignup(signupId: string): Promise<void> {
    if (!orgId) throw new Error('No organization selected');
    const signupRef = doc(db, 'organizations', orgId, 'signups', signupId);
    const signupSnap = await getDoc(signupRef);
    if (!signupSnap.exists()) return;
    const { eventId: eId, slotId } = signupSnap.data();
    await deleteDoc(signupRef);
    await updateDoc(doc(db, 'organizations', orgId, 'events', eId, 'slots', slotId), {
      quantityFilled: increment(-1),
    });
  }

  return { signups, loading, error, createSignup, checkIn, undoCheckIn, cancelSignup };
}

export function useMySignups(orgId: string | undefined, userId: string | undefined) {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !userId) { setSignups([]); setLoading(false); return; }
    const signupsRef = collection(db, 'organizations', orgId, 'signups');
    const q = query(signupsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Signup[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id, eventId: data.eventId, slotId: data.slotId,
          userId: data.userId, userName: data.userName, userEmail: data.userEmail,
          note: data.note || '', checkedIn: data.checkedIn ?? false,
          checkedInAt: data.checkedInAt ? (data.checkedInAt as Timestamp).toDate() : undefined,
          createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        });
      });
      setSignups(list); setLoading(false); setError(null);
    }, (err) => { setError(err.message); setLoading(false); });
    return () => unsubscribe();
  }, [orgId, userId]);

  async function cancelSignup(signupId: string): Promise<void> {
    if (!orgId) throw new Error('No organization selected');
    const signupRef = doc(db, 'organizations', orgId, 'signups', signupId);
    const signupSnap = await getDoc(signupRef);
    if (!signupSnap.exists()) return;
    const { eventId: eId, slotId } = signupSnap.data();
    await deleteDoc(signupRef);
    await updateDoc(doc(db, 'organizations', orgId, 'events', eId, 'slots', slotId), {
      quantityFilled: increment(-1),
    });
  }

  return { signups, loading, error, cancelSignup };
}
```

- [ ] **Step 6: Create hooks/useTemplates.ts**

```typescript
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { EventTemplate } from '../lib/types';

export function useTemplates(orgId: string | undefined) {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) { setTemplates([]); setLoading(false); return; }
    const templatesRef = collection(db, 'organizations', orgId, 'templates');
    const q = query(templatesRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: EventTemplate[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id, name: data.name, description: data.description || '',
          eventTitle: data.eventTitle, eventDescription: data.eventDescription || '',
          eventLocation: data.eventLocation || '', durationHours: data.durationHours,
          slots: data.slots || [], createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        });
      });
      setTemplates(list); setLoading(false); setError(null);
    }, (err) => { setError('Failed to load templates'); setLoading(false); });
    return () => unsubscribe();
  }, [orgId]);

  async function createTemplate(data: Omit<EventTemplate, 'id' | 'createdAt'>) {
    if (!orgId) throw new Error('No organization selected');
    await addDoc(collection(db, 'organizations', orgId, 'templates'), {
      ...data, createdAt: Timestamp.now(),
    });
  }

  async function deleteTemplate(templateId: string) {
    if (!orgId) throw new Error('No organization selected');
    await deleteDoc(doc(db, 'organizations', orgId, 'templates', templateId));
  }

  return { templates, loading, error, createTemplate, deleteTemplate };
}
```

- [ ] **Step 7: Run hook tests**

```bash
npx jest __tests__/hooks/ --no-coverage
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add hooks/ __tests__/hooks/
git commit -m "feat: add data hooks (events, slots, signups, templates)"
```

---

## Task 2: Shared components

**Files:**
- Create: `components/EventCard.tsx`
- Create: `components/StatusBadge.tsx`

- [ ] **Step 1: Create components/EventCard.tsx**

```typescript
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import type { Event } from '../lib/types';

interface EventCardProps {
  event: Event;
  onPress: () => void;
  rightContent?: React.ReactNode;
}

export function EventCard({ event, onPress, rightContent }: EventCardProps) {
  const isPast = event.startTime < new Date();
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <Text style={[styles.title, isPast && styles.pastTitle]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.date}>
          {format(event.startTime, 'EEE, MMM d • h:mm a')}
        </Text>
        {event.location ? (
          <Text style={styles.location} numberOfLines={1}>📍 {event.location}</Text>
        ) : null}
      </View>
      {rightContent ? <View style={styles.right}>{rightContent}</View> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  left: { flex: 1 },
  right: { marginLeft: 12 },
  title: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 3 },
  pastTitle: { color: '#6b7280' },
  date: { fontSize: 13, color: '#4b5563', marginBottom: 2 },
  location: { fontSize: 12, color: '#9ca3af' },
});
```

- [ ] **Step 2: Create components/StatusBadge.tsx**

```typescript
import { View, Text, StyleSheet } from 'react-native';

type Status = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const colors: Record<Status, { bg: string; text: string }> = {
  success: { bg: '#dcfce7', text: '#166534' },
  warning: { bg: '#fef3c7', text: '#92400e' },
  error:   { bg: '#fee2e2', text: '#991b1b' },
  info:    { bg: '#dbeafe', text: '#1e40af' },
  neutral: { bg: '#f3f4f6', text: '#374151' },
};

interface StatusBadgeProps {
  label: string;
  status?: Status;
}

export function StatusBadge({ label, status = 'neutral' }: StatusBadgeProps) {
  const { bg, text } = colors[status];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 12, fontWeight: '600' },
});
```

- [ ] **Step 3: Commit**

```bash
git add components/EventCard.tsx components/StatusBadge.tsx
git commit -m "feat: add EventCard and StatusBadge components"
```

---

## Task 3: Admin Dashboard screen

**Files:**
- Modify: `app/(admin)/dashboard.tsx` (replace placeholder)

- [ ] **Step 1: Replace app/(admin)/dashboard.tsx**

```typescript
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEvents } from '../../hooks/useEvents';
import { EventCard } from '../../components/EventCard';

export default function AdminDashboard() {
  const { currentOrg } = useOrg();
  const { userProfile, logOut } = useAuth();
  const { events, loading } = useEvents(currentOrg?.id);
  const router = useRouter();

  const now = new Date();
  const upcoming = events.filter((e) => isAfter(e.startTime, now)).reverse();
  const today = events.filter(
    (e) => isBefore(e.startTime, addDays(now, 1)) && isAfter(e.startTime, new Date(now.setHours(0,0,0,0)))
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{userProfile?.name ?? 'Admin'}</Text>
          {currentOrg && <Text style={styles.orgName}>{currentOrg.name}</Text>}
        </View>
        <TouchableOpacity onPress={logOut} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{upcoming.length}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{today.length}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <TouchableOpacity
          style={[styles.statCard, styles.checkInCard]}
          onPress={() => router.push('/(admin)/checkin')}
        >
          <Text style={styles.statNumWhite}>📲</Text>
          <Text style={styles.statLabelWhite}>Check-In</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming events */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/events')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : upcoming.length === 0 ? (
          <Text style={styles.muted}>No upcoming events.</Text>
        ) : (
          upcoming.slice(0, 5).map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push(`/(admin)/events/${event.id}`)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 14, color: '#6b7280' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  orgName: { fontSize: 13, color: '#1a56db', marginTop: 2 },
  logoutBtn: { paddingTop: 4 },
  logoutText: { color: '#6b7280', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  checkInCard: { backgroundColor: '#1a56db' },
  statNum: { fontSize: 24, fontWeight: '700', color: '#111827' },
  statNumWhite: { fontSize: 24 },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statLabelWhite: { fontSize: 12, color: '#bfdbfe', marginTop: 2 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 14, color: '#1a56db' },
  muted: { color: '#9ca3af', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
});
```

- [ ] **Step 2: Install date-fns**

```bash
npx expo install date-fns
```

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/dashboard.tsx
git commit -m "feat: implement admin dashboard screen"
```

---

## Task 4: Admin Events list + Event Detail

**Files:**
- Modify: `app/(admin)/events.tsx`
- Create: `app/(admin)/events/[id].tsx`
- Create: `app/(admin)/events/create.tsx`

- [ ] **Step 1: Replace app/(admin)/events.tsx**

```typescript
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { isAfter } from 'date-fns';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import { EventCard } from '../../components/EventCard';

export default function AdminEvents() {
  const { currentOrg } = useOrg();
  const { events, loading } = useEvents(currentOrg?.id);
  const router = useRouter();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [search, setSearch] = useState('');

  const now = new Date();
  const filtered = events
    .filter((e) => (tab === 'upcoming' ? isAfter(e.startTime, now) : !isAfter(e.startTime, now)))
    .filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      tab === 'upcoming'
        ? a.startTime.getTime() - b.startTime.getTime()
        : b.startTime.getTime() - a.startTime.getTime()
    );

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/(admin)/events/create')}
        >
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
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

      <TextInput
        style={styles.search}
        placeholder="Search events…"
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.muted}>No {tab} events.</Text>
        ) : (
          filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push(`/(admin)/events/${event.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  createBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#1a56db' },
  tabText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  activeTabText: { color: '#1a56db', fontWeight: '600' },
  search: { margin: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  muted: { color: '#9ca3af', textAlign: 'center', paddingVertical: 32, fontSize: 14 },
});
```

- [ ] **Step 2: Create app/(admin)/events/[id].tsx**

```typescript
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useOrg } from '../../../contexts/OrgContext';
import { useSlots } from '../../../hooks/useSlots';
import { useSignups } from '../../../hooks/useSignups';
import { useEvents } from '../../../hooks/useEvents';
import { StatusBadge } from '../../../components/StatusBadge';
import type { Event } from '../../../lib/types';

export default function AdminEventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentOrg } = useOrg();
  const { deleteEvent } = useEvents(currentOrg?.id);
  const { slots, loading: slotsLoading } = useSlots(currentOrg?.id, id);
  const { signups, loading: signupsLoading } = useSignups(currentOrg?.id, id);
  const [event, setEvent] = useState<Event | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
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

  const checkedInCount = signups.filter((s) => s.checkedIn).length;
  const signupsBySlot: Record<string, typeof signups> = {};
  signups.forEach((s) => { if (!signupsBySlot[s.slotId]) signupsBySlot[s.slotId] = []; signupsBySlot[s.slotId].push(s); });

  function handleDelete() {
    Alert.alert('Delete Event', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteEvent(id!); router.back(); } },
    ]);
  }

  if (eventLoading || slotsLoading || signupsLoading) {
    return <View style={styles.center}><Text style={styles.muted}>Loading…</Text></View>;
  }

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push(`/(admin)/checkin`)} style={styles.checkInBtn}>
            <Text style={styles.checkInBtnText}>Check-In</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{event?.title}</Text>
        <Text style={styles.date}>{event && format(event.startTime, 'EEEE, MMMM d, yyyy • h:mm a')}</Text>
        {event?.endTime && <Text style={styles.date}>Ends {format(event.endTime, 'h:mm a')}</Text>}
        {event?.location ? <Text style={styles.location}>📍 {event.location}</Text> : null}
        {event?.description ? <Text style={styles.description}>{event.description}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statNum}>{signups.length}</Text><Text style={styles.statLabel}>Signed up</Text></View>
          <View style={styles.stat}><Text style={styles.statNum}>{checkedInCount}</Text><Text style={styles.statLabel}>Checked in</Text></View>
          <View style={styles.stat}><Text style={styles.statNum}>{slots.length}</Text><Text style={styles.statLabel}>Slots</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Slots & Signups</Text>
        {slots.map((slot) => {
          const slotSignups = signupsBySlot[slot.id] || [];
          return (
            <View key={slot.id} style={styles.slotCard}>
              <View style={styles.slotHeader}>
                <Text style={styles.slotName}>{slot.name}</Text>
                <Text style={styles.slotCount}>{slotSignups.length}/{slot.quantityTotal}</Text>
              </View>
              {slotSignups.map((signup) => (
                <View key={signup.id} style={styles.signupRow}>
                  <Text style={styles.signupName}>{signup.checkedIn ? '✅' : '⬜'} {signup.userName}</Text>
                  {signup.checkedIn && signup.checkedInAt && (
                    <Text style={styles.checkedInTime}>{format(signup.checkedInAt, 'h:mm a')}</Text>
                  )}
                </View>
              ))}
              {slotSignups.length === 0 && <Text style={styles.empty}>No signups yet</Text>}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  back: { color: '#1a56db', fontSize: 16 },
  headerActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  checkInBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  checkInBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  deleteText: { color: '#dc2626', fontSize: 14 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  date: { fontSize: 14, color: '#4b5563', marginBottom: 2 },
  location: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  description: { fontSize: 14, color: '#374151', marginTop: 8, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginVertical: 16 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  slotCard: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  slotName: { fontWeight: '600', color: '#374151' },
  slotCount: { color: '#6b7280', fontSize: 13 },
  signupRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  signupName: { fontSize: 14, color: '#111827' },
  checkedInTime: { fontSize: 12, color: '#059669' },
  empty: { padding: 12, color: '#9ca3af', fontSize: 13 },
  muted: { color: '#9ca3af', fontSize: 14 },
});
```

- [ ] **Step 3: Create app/(admin)/events/create.tsx**

```typescript
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useOrg } from '../../../contexts/OrgContext';
import { useEvents } from '../../../hooks/useEvents';
import { useTemplates } from '../../../hooks/useTemplates';
import { useSlots } from '../../../hooks/useSlots';

export default function CreateEvent() {
  const { currentOrg } = useOrg();
  const { createEvent } = useEvents(currentOrg?.id);
  const { templates } = useTemplates(currentOrg?.id);
  // Slots hook is initialized with undefined until event is created
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [startDate, setStartDate] = useState('');  // "YYYY-MM-DD HH:MM" format
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function parseDate(str: string): Date | undefined {
    if (!str.trim()) return undefined;
    const d = new Date(str);
    return isNaN(d.getTime()) ? undefined : d;
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setTitle(template.eventTitle);
    setDescription(template.eventDescription);
    setLocation(template.eventLocation);
  }

  async function handleCreate() {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    const startTime = parseDate(startDate);
    if (!startTime) { setError('Enter a valid start date (YYYY-MM-DD HH:MM)'); return; }
    setSubmitting(true);
    try {
      await createEvent({
        title: title.trim(),
        location: location.trim(),
        description: description.trim(),
        isPublic,
        startTime,
        endTime: parseDate(endDate),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>New Event</Text>
        <TouchableOpacity onPress={handleCreate} disabled={submitting}>
          <Text style={[styles.save, submitting && styles.disabled]}>Create</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {templates.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Start from template</Text>
          {templates.map((t) => (
            <TouchableOpacity key={t.id} style={styles.templateRow} onPress={() => applyTemplate(t.id)}>
              <Text style={styles.templateName}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Title *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Event title" />

      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Location" />

      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="Description" multiline numberOfLines={3} />

      <Text style={styles.label}>Start (YYYY-MM-DD HH:MM) *</Text>
      <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2026-06-15 09:00" />

      <Text style={styles.label}>End (YYYY-MM-DD HH:MM)</Text>
      <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2026-06-15 17:00" />

      <View style={styles.row}>
        <Text style={styles.label}>Public event</Text>
        <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: '#1a56db' }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 44, paddingBottom: 16 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  cancel: { color: '#6b7280', fontSize: 16 },
  save: { color: '#1a56db', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  textarea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  error: { color: '#dc2626', backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 },
  section: { marginBottom: 12 },
  templateRow: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginBottom: 6 },
  templateName: { color: '#1e40af', fontWeight: '500' },
});
```

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/events.tsx app/(admin)/events/
git commit -m "feat: implement admin events list, detail, and create screens"
```

---

## Task 5: Admin Check-In (QR + Manual)

**Files:**
- Modify: `app/(admin)/checkin.tsx`
- Create: `app/(admin)/checkin/[eventId]/scanner.tsx`
- Create: `app/(admin)/checkin/[eventId]/manual.tsx`

- [ ] **Step 1: Replace app/(admin)/checkin.tsx (event selector)**

```typescript
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';

export default function CheckInHub() {
  const { currentOrg } = useOrg();
  const { events, loading } = useEvents(currentOrg?.id);
  const router = useRouter();

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = addDays(todayStart, 1);

  // Events today + upcoming within 7 days
  const relevantEvents = events
    .filter((e) => isAfter(e.startTime, todayStart) && isBefore(e.startTime, addDays(now, 7)))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Check-In</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Select an event to check in volunteers</Text>
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : relevantEvents.length === 0 ? (
          <Text style={styles.muted}>No upcoming events in the next 7 days.</Text>
        ) : (
          relevantEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventDate}>{format(event.startTime, 'EEE, MMM d • h:mm a')}</Text>
                {event.location ? <Text style={styles.eventLocation}>📍 {event.location}</Text> : null}
              </View>
              <View style={styles.modeButtons}>
                <TouchableOpacity
                  style={styles.qrBtn}
                  onPress={() => router.push(`/(admin)/checkin/${event.id}/scanner`)}
                >
                  <Text style={styles.qrBtnText}>📷 QR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.listBtn}
                  onPress={() => router.push(`/(admin)/checkin/${event.id}/manual`)}
                >
                  <Text style={styles.listBtnText}>📋 List</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  content: { padding: 16 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  muted: { color: '#9ca3af', textAlign: 'center', paddingVertical: 32 },
  eventCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  eventInfo: { marginBottom: 10 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 3 },
  eventDate: { fontSize: 13, color: '#4b5563' },
  eventLocation: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  modeButtons: { flexDirection: 'row', gap: 8 },
  qrBtn: { flex: 1, backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  qrBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  listBtn: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  listBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
});
```

- [ ] **Step 2: Create app/(admin)/checkin/[eventId]/scanner.tsx**

```typescript
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useOrg } from '../../../../contexts/OrgContext';
import { useSignups } from '../../../../hooks/useSignups';

export default function QRScanner() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { currentOrg } = useOrg();
  const { checkIn } = useSignups(currentOrg?.id, eventId);
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleBarCodeScanned({ data }: { data: string }) {
    if (!scanning || !currentOrg?.id || !eventId) return;
    setScanning(false);

    try {
      // data is a Firebase UID — find the signup for this user + event
      const signupsRef = collection(db, 'organizations', currentOrg.id, 'signups');
      const q = query(signupsRef, where('eventId', '==', eventId), where('userId', '==', data));
      const snap = await getDocs(q);

      if (snap.empty) {
        Vibration.vibrate([0, 200, 100, 200]);
        setLastResult({ success: false, message: 'Not on signup list' });
      } else {
        const signup = snap.docs[0];
        if (signup.data().checkedIn) {
          setLastResult({ success: false, message: `${signup.data().userName} already checked in` });
        } else {
          await checkIn(signup.id);
          Vibration.vibrate(100);
          setLastResult({ success: true, message: `✅ ${signup.data().userName} checked in!` });
        }
      }
    } catch {
      setLastResult({ success: false, message: 'Error — try again' });
    }

    // Re-enable scanning after 2 seconds
    setTimeout(() => { setScanning(true); setLastResult(null); }, 2000);
  }

  if (!permission) return <View style={styles.center}><Text>Requesting camera…</Text></View>;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access is required to scan QR codes.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fallbackBtn} onPress={() => router.replace(`/(admin)/checkin/${eventId}/manual`)}>
          <Text style={styles.fallbackText}>Use manual list instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <TouchableOpacity onPress={() => router.replace(`/(admin)/checkin/${eventId}/manual`)}>
          <Text style={styles.switchText}>Manual</Text>
        </TouchableOpacity>
      </View>

      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.hint}>Point at a volunteer's QR code</Text>
        </View>
      </CameraView>

      {lastResult && (
        <View style={[styles.resultBanner, lastResult.success ? styles.successBanner : styles.errorBanner]}>
          <Text style={styles.resultText}>{lastResult.message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: '#000' },
  back: { color: '#fff', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  switchText: { color: '#93c5fd', fontSize: 15 },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 240, height: 240, borderWidth: 2, borderColor: '#fff', borderRadius: 12, backgroundColor: 'transparent' },
  hint: { color: '#fff', marginTop: 24, fontSize: 14 },
  resultBanner: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, alignItems: 'center' },
  successBanner: { backgroundColor: '#059669' },
  errorBanner: { backgroundColor: '#dc2626' },
  resultText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  permText: { fontSize: 16, textAlign: 'center', color: '#374151', marginBottom: 20 },
  btn: { backgroundColor: '#1a56db', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12, marginBottom: 12 },
  btnText: { color: '#fff', fontWeight: '600' },
  fallbackBtn: { paddingVertical: 10 },
  fallbackText: { color: '#1a56db', fontSize: 14 },
});
```

- [ ] **Step 3: Create app/(admin)/checkin/[eventId]/manual.tsx**

```typescript
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useOrg } from '../../../../contexts/OrgContext';
import { useSlots } from '../../../../hooks/useSlots';
import { useSignups } from '../../../../hooks/useSignups';
import type { Signup } from '../../../../lib/types';

export default function ManualCheckIn() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { currentOrg } = useOrg();
  const { slots, loading: slotsLoading } = useSlots(currentOrg?.id, eventId);
  const { signups, loading: signupsLoading, checkIn, undoCheckIn } = useSignups(currentOrg?.id, eventId);
  const [search, setSearch] = useState('');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const router = useRouter();

  const checkedInCount = signups.filter((s) => s.checkedIn).length;

  const filteredSignups = search
    ? signups.filter((s) => s.userName.toLowerCase().includes(search.toLowerCase()))
    : signups;

  const signupsBySlot: Record<string, Signup[]> = {};
  filteredSignups.forEach((s) => { if (!signupsBySlot[s.slotId]) signupsBySlot[s.slotId] = []; signupsBySlot[s.slotId].push(s); });

  async function handleCheckIn(signupId: string) {
    setCheckingIn(signupId);
    try { await checkIn(signupId); } finally { setCheckingIn(null); }
  }

  async function handleUndo(signupId: string) {
    setCheckingIn(signupId);
    try { await undoCheckIn(signupId); } finally { setCheckingIn(null); }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Manual Check-In</Text>
        <TouchableOpacity onPress={() => router.replace(`/(admin)/checkin/${eventId}/scanner`)}>
          <Text style={styles.switchText}>QR</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>{signups.length} signed up · {checkedInCount} checked in</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search by name…"
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />

      <ScrollView contentContainerStyle={styles.content}>
        {(slotsLoading || signupsLoading) ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : search ? (
          // Flat list when searching
          filteredSignups.map((signup) => (
            <SignupRow key={signup.id} signup={signup} checkingIn={checkingIn} onCheckIn={handleCheckIn} onUndo={handleUndo} />
          ))
        ) : (
          // Grouped by slot
          slots.map((slot) => {
            const slotSignups = signupsBySlot[slot.id] || [];
            return (
              <View key={slot.id} style={styles.slotSection}>
                <View style={styles.slotHeader}>
                  <Text style={styles.slotName}>{slot.name}</Text>
                  <Text style={styles.slotCount}>{slotSignups.filter(s => s.checkedIn).length}/{slotSignups.length}</Text>
                </View>
                {slotSignups.map((signup) => (
                  <SignupRow key={signup.id} signup={signup} checkingIn={checkingIn} onCheckIn={handleCheckIn} onUndo={handleUndo} />
                ))}
                {slotSignups.length === 0 && <Text style={styles.empty}>No signups</Text>}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function SignupRow({ signup, checkingIn, onCheckIn, onUndo }: {
  signup: Signup;
  checkingIn: string | null;
  onCheckIn: (id: string) => void;
  onUndo: (id: string) => void;
}) {
  return (
    <View style={styles.signupRow}>
      <View style={styles.signupInfo}>
        <Text style={styles.signupName}>{signup.userName}</Text>
        {signup.checkedIn && signup.checkedInAt && (
          <Text style={styles.checkedTime}>{format(signup.checkedInAt, 'h:mm a')}</Text>
        )}
      </View>
      {signup.checkedIn ? (
        <TouchableOpacity onPress={() => onUndo(signup.id)} disabled={checkingIn === signup.id} style={styles.undoBtn}>
          <Text style={styles.undoText}>Undo</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => onCheckIn(signup.id)} disabled={checkingIn === signup.id} style={[styles.checkBtn, checkingIn === signup.id && styles.disabled]}>
          <Text style={styles.checkBtnText}>{checkingIn === signup.id ? '…' : 'Check In'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  back: { color: '#1a56db', fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  switchText: { color: '#1a56db', fontSize: 15 },
  statsBar: { backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 8 },
  statsText: { fontSize: 13, color: '#1e40af', fontWeight: '500' },
  search: { margin: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  content: { paddingBottom: 40 },
  muted: { color: '#9ca3af', textAlign: 'center', paddingVertical: 32 },
  slotSection: { marginBottom: 8 },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f3f4f6' },
  slotName: { fontWeight: '600', color: '#374151', fontSize: 13 },
  slotCount: { color: '#6b7280', fontSize: 13 },
  signupRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  signupInfo: { flex: 1 },
  signupName: { fontSize: 15, color: '#111827', fontWeight: '500' },
  checkedTime: { fontSize: 12, color: '#059669', marginTop: 2 },
  checkBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  checkBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  undoBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  undoText: { color: '#9ca3af', fontSize: 13 },
  disabled: { opacity: 0.5 },
  empty: { paddingHorizontal: 16, paddingVertical: 10, color: '#9ca3af', fontSize: 13 },
});
```

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/checkin.tsx app/(admin)/checkin/
git commit -m "feat: implement admin check-in hub, QR scanner, and manual list"
```

---

## Task 6: Admin Reports + Settings + Templates screens

**Files:**
- Modify: `app/(admin)/reports.tsx`
- Create: `app/(admin)/settings.tsx`
- Create: `app/(admin)/templates.tsx`

- [ ] **Step 1: Replace app/(admin)/reports.tsx**

```typescript
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useOrg } from '../../contexts/OrgContext';
import { useEvents } from '../../hooks/useEvents';
import { useSignups } from '../../hooks/useSignups';

function EventReport({ orgId, eventId, eventTitle, eventDate }: {
  orgId: string; eventId: string; eventTitle: string; eventDate: Date;
}) {
  const { signups, loading } = useSignups(orgId, eventId);
  if (loading) return null;
  const checkedIn = signups.filter((s) => s.checkedIn).length;

  async function handleExport() {
    const rows = signups.map((s) =>
      `${s.userName},${s.userEmail},${s.checkedIn ? 'Yes' : 'No'},${s.checkedInAt ? format(s.checkedInAt, 'h:mm a') : ''}`
    ).join('\n');
    const csv = `Name,Email,Checked In,Check-In Time\n${rows}`;
    await Share.share({ message: csv, title: `${eventTitle} — Attendance` });
  }

  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View>
          <Text style={styles.reportTitle}>{eventTitle}</Text>
          <Text style={styles.reportDate}>{format(eventDate, 'MMM d, yyyy')}</Text>
        </View>
        <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
          <Text style={styles.exportText}>Export CSV</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.reportStats}>
        <Text style={styles.statItem}>👥 {signups.length} signed up</Text>
        <Text style={styles.statItem}>✅ {checkedIn} checked in</Text>
        <Text style={styles.statItem}>📊 {signups.length > 0 ? Math.round((checkedIn / signups.length) * 100) : 0}% attendance</Text>
      </View>
    </View>
  );
}

export default function AdminReports() {
  const { currentOrg } = useOrg();
  const { events, loading } = useEvents(currentOrg?.id);
  const pastEvents = events.filter((e) => e.startTime < new Date()).slice(0, 20);

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : pastEvents.length === 0 ? (
          <Text style={styles.muted}>No past events yet.</Text>
        ) : (
          pastEvents.map((event) => (
            currentOrg?.id ? (
              <EventReport
                key={event.id}
                orgId={currentOrg.id}
                eventId={event.id}
                eventTitle={event.title}
                eventDate={event.startTime}
              />
            ) : null
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
  content: { padding: 16, paddingBottom: 40 },
  muted: { color: '#9ca3af', textAlign: 'center', paddingVertical: 32 },
  reportCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  reportTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  reportDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  exportBtn: { backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  exportText: { color: '#1a56db', fontWeight: '600', fontSize: 12 },
  reportStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statItem: { fontSize: 13, color: '#374151' },
});
```

- [ ] **Step 2: Create app/(admin)/settings.tsx**

```typescript
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Switch } from 'react-native';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminSettings() {
  const { currentOrg, updateOrganization } = useOrg();
  const { logOut } = useAuth();

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logOut },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {currentOrg && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organization</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Name</Text>
            <Text style={styles.rowValue}>{currentOrg.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Type</Text>
            <Text style={styles.rowValue}>{currentOrg.type}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Send confirmations</Text>
          <Switch
            value={currentOrg?.emailSettings?.sendConfirmations ?? true}
            onValueChange={(v) =>
              currentOrg && updateOrganization(currentOrg.id, {
                emailSettings: { ...currentOrg.emailSettings!, sendConfirmations: v },
              })
            }
            trackColor={{ true: '#1a56db' }}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Send reminders</Text>
          <Switch
            value={currentOrg?.emailSettings?.sendReminders ?? true}
            onValueChange={(v) =>
              currentOrg && updateOrganization(currentOrg.id, {
                emailSettings: { ...currentOrg.emailSettings!, sendReminders: v },
              })
            }
            trackColor={{ true: '#1a56db' }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
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
  section: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 10, marginBottom: 16, overflow: 'hidden' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#6b7280', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  rowLabel: { fontSize: 15, color: '#374151' },
  rowValue: { fontSize: 15, color: '#6b7280' },
  logoutBtn: { padding: 16, alignItems: 'center' },
  logoutText: { fontSize: 16, color: '#dc2626', fontWeight: '600' },
});
```

- [ ] **Step 3: Create app/(admin)/templates.tsx**

```typescript
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useOrg } from '../../contexts/OrgContext';
import { useTemplates } from '../../hooks/useTemplates';

export default function AdminTemplates() {
  const { currentOrg } = useOrg();
  const { templates, loading, createTemplate, deleteTemplate } = useTemplates(currentOrg?.id);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !eventTitle.trim()) return;
    setSubmitting(true);
    try {
      await createTemplate({ name: name.trim(), description: '', eventTitle: eventTitle.trim(), eventDescription: '', eventLocation: eventLocation.trim(), slots: [] });
      setName(''); setEventTitle(''); setEventLocation(''); setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(templateId: string, templateName: string) {
    Alert.alert('Delete Template', `Delete "${templateName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(templateId) },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Templates</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>{showForm ? 'Cancel' : '+ New'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Template name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Default event title" value={eventTitle} onChangeText={setEventTitle} />
          <TextInput style={styles.input} placeholder="Default location" value={eventLocation} onChangeText={setEventLocation} />
          <TouchableOpacity style={[styles.createBtn, submitting && styles.disabled]} onPress={handleCreate} disabled={submitting}>
            <Text style={styles.createBtnText}>Create Template</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : templates.length === 0 ? (
          <Text style={styles.muted}>No templates yet. Create one to speed up event creation.</Text>
        ) : (
          templates.map((template) => (
            <View key={template.id} style={styles.templateCard}>
              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateDetail}>"{template.eventTitle}"</Text>
                {template.eventLocation ? <Text style={styles.templateDetail}>📍 {template.eventLocation}</Text> : null}
                <Text style={styles.templateDetail}>{template.slots.length} slot{template.slots.length !== 1 ? 's' : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(template.id, template.name)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  addBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  form: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 10 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  createBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '600' },
  disabled: { opacity: 0.5 },
  content: { padding: 16, paddingBottom: 40 },
  muted: { color: '#9ca3af', textAlign: 'center', paddingVertical: 32 },
  templateCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  templateDetail: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  deleteText: { color: '#dc2626', fontSize: 13 },
});
```

- [ ] **Step 4: Add Templates to admin tab bar in app/(admin)/_layout.tsx**

Add a fifth tab after Reports:

```typescript
<Tabs.Screen
  name="settings"
  options={{
    title: 'Settings',
    tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
  }}
/>
<Tabs.Screen
  name="templates"
  options={{
    href: null, // Hidden from tab bar — accessed from Events screen
  }}
/>
```

- [ ] **Step 5: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests PASS

- [ ] **Step 6: Smoke test on device**

```bash
npx expo start
```

Verify:
- Admin tab bar shows Dashboard, Events, Check-In, Reports, Settings
- Events list loads from Firebase, shows upcoming/past toggle
- Tapping an event opens Event Detail
- Check-In hub shows today's events with QR and Manual buttons
- QR scanner opens camera (or asks permission)
- Reports shows past events with Export CSV button

- [ ] **Step 7: Commit**

```bash
git add app/(admin)/reports.tsx app/(admin)/settings.tsx app/(admin)/templates.tsx app/(admin)/_layout.tsx
git commit -m "feat: implement admin reports, settings, and templates screens"
```

---

## Phase 2 Complete

All admin screens are implemented:
- Dashboard with stats and upcoming events
- Events list (upcoming/past) + Event Detail + Create Event
- Templates (create/delete)
- Check-In hub → QR Scanner (camera) + Manual list
- Reports with CSV export via iOS share sheet
- Settings with org config and log out

**Next:** Proceed to Phase 3 (`2026-04-01-ios-app-phase3-volunteer-screens.md`) to implement volunteer screens.
