# Day-Of Roster (Check-In Mode) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-first "Day-Of Roster" page that shows admins who signed up for each slot and lets them check people in with one tap.

**Architecture:** New page at `/admin/events/:eventId/checkin` rendered without the admin sidebar. Uses existing `useSlots` and `useSignups` hooks (both already real-time). Entry point is a "Day-Of Roster" button added to the existing `AdminEventDetail` header. No new hooks, no new Firestore queries.

**Tech Stack:** React 19, TypeScript, React Router 7, Tailwind CSS, Firebase 12 (existing `useSlots` + `useSignups` hooks)

**Prerequisite:** Complete the P&R Audit plan first (dev environment must be set up).

---

## Workflow

**Edit on Mac → Sync to Pi → Test in browser at `http://192.168.8.198:5173`**

Sync command (run from Mac after each task):
```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
```

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/admin/EventCheckIn.tsx` | Create | The Day-Of Roster page — slots grouped by category, names + check-in per slot |
| `src/App.tsx` | Modify | Add `/admin/events/:eventId/checkin` route (outside AdminLayout, inside ProtectedRoute) |
| `src/pages/admin/EventDetail.tsx` | Modify | Add "Day-Of Roster" button linking to the check-in route |

---

## Task 1: Create the EventCheckIn Page

**Files:**
- Create: `src/pages/admin/EventCheckIn.tsx`

- [ ] **Step 1: Create `src/pages/admin/EventCheckIn.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useOrg } from '../../contexts/OrgContext';
import { useSlots } from '../../hooks/useSlots';
import { useSignups } from '../../hooks/useSignups';
import type { Event } from '../../hooks/useEvents';
import type { Signup } from '../../hooks/useSignups';

export function EventCheckIn() {
  const { eventId } = useParams<{ eventId: string }>();
  const { currentOrg } = useOrg();
  const { slots, loading: slotsLoading } = useSlots(currentOrg?.id, eventId);
  const { signups, loading: signupsLoading, checkIn, undoCheckIn } = useSignups(
    currentOrg?.id,
    eventId
  );

  const [event, setEvent] = useState<Event | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      if (!currentOrg?.id || !eventId) return;
      try {
        const eventDoc = await getDoc(
          doc(db, 'organizations', currentOrg.id, 'events', eventId)
        );
        if (eventDoc.exists()) {
          const data = eventDoc.data();
          setEvent({
            id: eventDoc.id,
            title: data.title,
            startTime: (data.startTime as Timestamp)?.toDate() || new Date(),
            endTime: data.endTime
              ? (data.endTime as Timestamp).toDate()
              : undefined,
            location: data.location || '',
            description: data.description || '',
            isPublic: data.isPublic ?? true,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        }
      } finally {
        setEventLoading(false);
      }
    }
    fetchEvent();
  }, [currentOrg?.id, eventId]);

  const loading = eventLoading || slotsLoading || signupsLoading;

  async function handleCheckIn(signupId: string) {
    setCheckingIn(signupId);
    try {
      await checkIn(signupId);
    } finally {
      setCheckingIn(null);
    }
  }

  async function handleUndoCheckIn(signupId: string) {
    setCheckingIn(signupId);
    try {
      await undoCheckIn(signupId);
    } finally {
      setCheckingIn(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
      </div>
    );
  }

  const checkedInCount = signups.filter((s) => s.checkedIn).length;

  // Index signups by slotId for fast lookup
  const signupsBySlot: Record<string, Signup[]> = {};
  signups.forEach((signup) => {
    if (!signupsBySlot[signup.slotId]) signupsBySlot[signup.slotId] = [];
    signupsBySlot[signup.slotId].push(signup);
  });

  // Group slots by category (slots are already sorted by category+startTime from useSlots)
  const categories: string[] = [];
  const slotsByCategory: Record<string, typeof slots> = {};
  slots.forEach((slot) => {
    if (!slotsByCategory[slot.category]) {
      categories.push(slot.category);
      slotsByCategory[slot.category] = [];
    }
    slotsByCategory[slot.category].push(slot);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3">
        <Link
          to={`/admin/events/${eventId}`}
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          ← Back to Event
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 mt-1 truncate">
          {event?.title}
        </h1>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-gray-500">
            {event && format(event.startTime, 'EEEE, MMMM d')}
          </p>
          <span className="text-sm font-medium text-gray-700">
            {signups.length} volunteer{signups.length !== 1 ? 's' : ''} ·{' '}
            {checkedInCount} checked in
          </span>
        </div>
      </header>

      <main className="px-4 py-4 space-y-6 max-w-2xl mx-auto">
        {slots.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No one has signed up for this event yet.
          </p>
        ) : (
          categories.map((category) => (
            <section key={category}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {category}
              </h2>
              <div className="space-y-3">
                {slotsByCategory[category].map((slot) => {
                  const slotSignups = signupsBySlot[slot.id] || [];
                  const openCount = Math.max(
                    0,
                    slot.quantityTotal - slotSignups.length
                  );

                  return (
                    <div
                      key={slot.id}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                    >
                      {/* Slot header */}
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">
                            {slot.name}
                          </span>
                          {slot.startTime && (
                            <span className="ml-2 text-sm text-gray-500">
                              {format(slot.startTime, 'h:mm a')}
                              {slot.endTime &&
                                ` – ${format(slot.endTime, 'h:mm a')}`}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 shrink-0 ml-2">
                          {slotSignups.length}/{slot.quantityTotal}
                        </span>
                      </div>

                      {/* Person rows */}
                      <ul className="divide-y divide-gray-100">
                        {slotSignups.map((signup) => (
                          <li
                            key={signup.id}
                            className="flex items-center justify-between px-4 py-3 min-h-[56px]"
                          >
                            <div className="flex items-center gap-3">
                              {signup.checkedIn ? (
                                <span className="text-green-500 text-xl leading-none">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xl leading-none">
                                  ○
                                </span>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">
                                  {signup.userName}
                                </p>
                                {signup.checkedIn && signup.checkedInAt && (
                                  <p className="text-xs text-gray-400">
                                    {format(signup.checkedInAt, 'h:mm a')}
                                  </p>
                                )}
                              </div>
                            </div>

                            {signup.checkedIn ? (
                              <button
                                onClick={() => handleUndoCheckIn(signup.id)}
                                disabled={checkingIn === signup.id}
                                className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2 disabled:opacity-50"
                              >
                                Undo
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCheckIn(signup.id)}
                                disabled={checkingIn === signup.id}
                                className="bg-primary-700 text-white text-sm font-medium px-5 py-2.5 rounded-md min-w-[88px] hover:bg-primary-800 active:bg-primary-900 disabled:opacity-50"
                              >
                                {checkingIn === signup.id ? '...' : 'Check In'}
                              </button>
                            )}
                          </li>
                        ))}

                        {/* Open slots */}
                        {Array.from({ length: openCount }).map((_, i) => (
                          <li
                            key={`open-${i}`}
                            className="px-4 py-3 min-h-[56px] flex items-center"
                          >
                            <span className="text-gray-300 text-sm italic ml-8">
                              — open —
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Sync to Pi**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/EventCheckIn.tsx
git commit -m "feat: add EventCheckIn page for day-of mobile roster"
```

---

## Task 2: Add Route to App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the import**

In `src/App.tsx`, add this import after the existing admin page imports:

```tsx
import { EventCheckIn } from './pages/admin/EventCheckIn';
```

- [ ] **Step 2: Add the route**

The check-in page must render without `AdminLayout` (no sidebar). Add it as a standalone protected route, **outside** the `<Route path="/admin" element={<ProtectedRoute requireOrg>...}>` block.

Find the closing `</Route>` of the admin routes block. It looks like this:

```tsx
            </Route>

            {/* Parent routes */}
```

Insert the new route between the admin block's closing tag and the parent routes comment:

```tsx
            </Route>

            {/* Admin check-in mode — no sidebar */}
            <Route
              path="/admin/events/:eventId/checkin"
              element={
                <ProtectedRoute requireOrg>
                  <ErrorBoundary>
                    <EventCheckIn />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Parent routes */}
```

- [ ] **Step 3: Sync to Pi and verify the route resolves**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
```

Navigate directly to `http://192.168.8.198:5173/admin/events/SOME_EVENT_ID/checkin` (use a real event ID from the emulator). The page should load without a sidebar. Slots and signups should appear if they exist, or "No one has signed up" if empty.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /admin/events/:eventId/checkin route"
```

---

## Task 3: Add Day-Of Roster Button to AdminEventDetail

**Files:**
- Modify: `src/pages/admin/EventDetail.tsx`

- [ ] **Step 1: Add the button to the event header**

In `src/pages/admin/EventDetail.tsx`, find the button group in the header. It currently looks like:

```tsx
          <div className="flex gap-2">
            <button onClick={openTemplateModal} className="btn-secondary">Save as Template</button>
            <button onClick={openEditModal} className="btn-secondary">Edit</button>
            <button onClick={() => setShowDeleteModal(true)} className="btn-danger">Delete</button>
          </div>
```

Replace with:

```tsx
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
```

`Link` is already imported from `react-router-dom` at the top of this file.

- [ ] **Step 2: Sync to Pi and do a full end-to-end test**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
```

Full test on the Pi:
1. Log in as admin at `http://192.168.8.198:5173`
2. Go to an event with at least one slot and one signup
3. Click "Day-Of Roster" — should navigate to the check-in page
4. Verify the slot name, volunteer name, and "Check In" button appear
5. Tap "Check In" — button should momentarily show "..." then the row should show ✓ and a timestamp
6. Tap "Undo" — row should revert to ○
7. Tap "← Back to Event" — should return to AdminEventDetail
8. Test on your phone by opening `http://192.168.8.198:5173` — verify tap targets are comfortable

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/EventDetail.tsx
git commit -m "feat: add Day-Of Roster button to admin event detail"
```

---

## Final Verification Checklist

- [ ] "Day-Of Roster" button appears on admin event detail page
- [ ] Check-in page has no sidebar — full width on mobile
- [ ] Sticky header shows event title, date, and volunteer/checked-in count
- [ ] Slots are grouped by category with slot name and time shown
- [ ] Each volunteer shows name with ○/✓ status indicator
- [ ] "Check In" button is easy to tap on phone (large, full-width on row)
- [ ] Check-in reflects immediately (real-time listener) — test with two browser tabs
- [ ] "Undo" works and reverts check-in
- [ ] Open slots show "— open —" placeholder
- [ ] Back link returns to admin event detail
- [ ] TypeScript compiles without errors: `npm run build`
