# iOS Volunteer Names on Event Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an event has `showVolunteerNames` enabled, display signed-up volunteer names inline below each slot row on the iOS volunteer event detail screen.

**Architecture:** The `Event` type in the mobile app's `lib/types.ts` is missing the `showVolunteerNames` field — add it first. Then add a standalone `fetchEventSignups` helper function (not a hook) in `hooks/useSignups.ts` that issues a one-time `getDocs` query against `/organizations/{orgId}/signups` filtered by `eventId`, returning a `Record<string, string[]>` map of `slotId → userName[]`. In `app/(volunteer)/events.tsx`, call this helper on entry to the detail view when `selectedEvent.showVolunteerNames === true`, store the result in local state, and render the names below each slot's fill-count row.

**Tech Stack:** React Native, Expo, TypeScript, Firebase Firestore

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/lib/types.ts` | Add optional `showVolunteerNames?: boolean` field to the `Event` interface |
| Modify | `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/hooks/useSignups.ts` | Export new `fetchEventSignups(orgId, eventId)` async function that returns `Record<string, string[]>` |
| Modify | `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/app/(volunteer)/events.tsx` | Add `volunteerNames` state, call `fetchEventSignups` on detail view entry, render names below each slot fill row, add styles |
| Modify | `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/__tests__/screens/VolunteerEvents.test.tsx` | Update `useSignups` mock to expose `fetchEventSignups`, add four new test cases |

---

## Task 1: Add `showVolunteerNames` to the `Event` type

**Files:**
- Modify: `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/lib/types.ts`

- [ ] **Step 1: Add the optional field to the `Event` interface**

Open `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/lib/types.ts`.

Locate the `Event` interface:

```ts
export interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  location: string;
  description: string;
  isPublic: boolean;
  createdAt: Date;
}
```

Replace it with:

```ts
export interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  location: string;
  description: string;
  isPublic: boolean;
  showVolunteerNames?: boolean;
  createdAt: Date;
}
```

---

## Task 2: Write failing tests

**Files:**
- Modify: `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/__tests__/screens/VolunteerEvents.test.tsx`

- [ ] **Step 1: Add `mockFetchEventSignups` and update the `useSignups` mock**

Open `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/__tests__/screens/VolunteerEvents.test.tsx`.

After the existing `const mockCreateSignup = jest.fn().mockResolvedValue('signup1');` line, add:

```ts
const mockFetchEventSignups = jest.fn().mockResolvedValue({});
```

Replace the existing `jest.mock('../../hooks/useSignups', ...)` block with:

```ts
jest.mock('../../hooks/useSignups', () => ({
  useSignups: () => ({ signups: [], loading: false, createSignup: mockCreateSignup }),
  useMySignups: () => ({ signups: [], loading: false }),
  fetchEventSignups: (...args: unknown[]) => mockFetchEventSignups(...args),
}));
```

- [ ] **Step 2: Add an `afterEach` reset and four new test cases**

After the last closing `});` of the existing test cases (inside the `describe` block, before its closing `}`), add:

```ts
  afterEach(() => {
    mockFetchEventSignups.mockReset();
    mockFetchEventSignups.mockResolvedValue({});
  });

  it('does not call fetchEventSignups when showVolunteerNames is false', () => {
    // Default mock events have no showVolunteerNames field (treated as false)
    const { getByText } = render(<VolunteerEvents />);
    fireEvent.press(getByText('Spring Tournament'));
    expect(mockFetchEventSignups).not.toHaveBeenCalled();
  });

  it('calls fetchEventSignups with orgId and eventId when showVolunteerNames is true', async () => {
    // Override useEvents to return an event with showVolunteerNames: true
    jest.resetModules();
    const { useEvents } = require('../../hooks/useEvents');
    (useEvents as jest.Mock).mockReturnValueOnce({
      events: [
        { id: 'e1', title: 'Spring Tournament', startTime: new Date('2026-04-05T14:00:00'),
          location: 'Main Gym', description: 'Annual event', isPublic: true,
          showVolunteerNames: true, createdAt: new Date() },
      ],
      loading: false,
    });
    const { getByText } = render(<VolunteerEvents />);
    fireEvent.press(getByText('Spring Tournament'));
    await waitFor(() => {
      expect(mockFetchEventSignups).toHaveBeenCalledWith('org1', 'e1');
    });
  });

  it('renders volunteer names below a slot when showVolunteerNames is true and names are returned', async () => {
    mockFetchEventSignups.mockResolvedValue({ slot1: ['Alice Smith', 'Bob Jones'] });
    const { useEvents } = require('../../hooks/useEvents');
    (useEvents as jest.Mock).mockReturnValueOnce({
      events: [
        { id: 'e1', title: 'Spring Tournament', startTime: new Date('2026-04-05T14:00:00'),
          location: 'Main Gym', description: 'Annual event', isPublic: true,
          showVolunteerNames: true, createdAt: new Date() },
      ],
      loading: false,
    });
    const { getByText } = render(<VolunteerEvents />);
    fireEvent.press(getByText('Spring Tournament'));
    await waitFor(() => {
      expect(getByText('Alice Smith')).toBeTruthy();
      expect(getByText('Bob Jones')).toBeTruthy();
    });
  });

  it('renders no volunteer names for a slot when showVolunteerNames is true but slot has no signups', async () => {
    mockFetchEventSignups.mockResolvedValue({ slot1: [] });
    const { useEvents } = require('../../hooks/useEvents');
    (useEvents as jest.Mock).mockReturnValueOnce({
      events: [
        { id: 'e1', title: 'Spring Tournament', startTime: new Date('2026-04-05T14:00:00'),
          location: 'Main Gym', description: 'Annual event', isPublic: true,
          showVolunteerNames: true, createdAt: new Date() },
      ],
      loading: false,
    });
    const { getByText, queryByTestId } = render(<VolunteerEvents />);
    fireEvent.press(getByText('Spring Tournament'));
    await waitFor(() => {
      // slot renders normally (fill count visible), no name text nodes injected
      expect(getByText('1 / 3')).toBeTruthy();
    });
    expect(queryByTestId('volunteer-name-slot1-0')).toBeNull();
  });
```

- [ ] **Step 3: Run the tests to confirm all four new cases fail**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
npx jest __tests__/screens/VolunteerEvents.test.tsx --no-coverage
```

Expected output (four failures, four passes):

```
FAIL __tests__/screens/VolunteerEvents.test.tsx
  VolunteerEvents
    ✓ shows public event but not private event
    ✓ navigates to detail on event tap
    ✓ shows slot with Sign Up button when not full and not signed up
    ✓ calls createSignup when Sign Up is pressed
    ✗ does not call fetchEventSignups when showVolunteerNames is false
    ✗ calls fetchEventSignups with orgId and eventId when showVolunteerNames is true
    ✗ renders volunteer names below a slot when showVolunteerNames is true and names are returned
    ✗ renders no volunteer names for a slot when showVolunteerNames is true but slot has no signups
```

---

## Task 3: Add `fetchEventSignups` to `hooks/useSignups.ts`

**Files:**
- Modify: `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/hooks/useSignups.ts`

- [ ] **Step 1: Export `fetchEventSignups` at the bottom of the file**

Open `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/hooks/useSignups.ts`.

After the closing `}` of the `useMySignups` export (the last line of the file), add:

```ts

/**
 * One-time fetch of signups for a single event, grouped by slotId.
 * Returns a map of slotId → array of volunteer names.
 * Used by the volunteer event detail screen when showVolunteerNames is enabled.
 */
export async function fetchEventSignups(
  orgId: string,
  eventId: string
): Promise<Record<string, string[]>> {
  const signupsRef = collection(db, 'organizations', orgId, 'signups');
  const q = query(signupsRef, where('eventId', '==', eventId));
  const snapshot = await getDocs(q);
  const result: Record<string, string[]> = {};
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const slotId: string = data.slotId;
    const userName: string = data.userName ?? '';
    if (!result[slotId]) result[slotId] = [];
    result[slotId].push(userName);
  });
  return result;
}
```

Note: `collection`, `query`, `where`, and `getDocs` are already imported at the top of `hooks/useSignups.ts` — no new imports are needed.

---

## Task 4: Update `app/(volunteer)/events.tsx`

**Files:**
- Modify: `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/app/(volunteer)/events.tsx`

- [ ] **Step 1: Import `fetchEventSignups`**

Locate the existing import line:

```ts
import { useSignups, useMySignups } from '../../hooks/useSignups';
```

Replace it with:

```ts
import { useSignups, useMySignups, fetchEventSignups } from '../../hooks/useSignups';
```

- [ ] **Step 2: Add `volunteerNames` state**

Locate the existing state declarations block at the top of `VolunteerEvents`:

```ts
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [signingUp, setSigningUp] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
```

Replace it with:

```ts
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [signingUp, setSigningUp] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [volunteerNames, setVolunteerNames] = useState<Record<string, string[]>>({});
```

- [ ] **Step 3: Add `loadVolunteerNames` helper inside the component**

Locate the existing `handleSignUp` function:

```ts
  async function handleSignUp(slot: Slot) {
```

Directly before it, add:

```ts
  async function loadVolunteerNames(event: Event) {
    if (!currentOrg || !event.showVolunteerNames) {
      setVolunteerNames({});
      return;
    }
    try {
      const names = await fetchEventSignups(currentOrg.id, event.id);
      setVolunteerNames(names);
    } catch {
      // Non-fatal: names simply won't appear
      setVolunteerNames({});
    }
  }

```

- [ ] **Step 4: Call `loadVolunteerNames` and reset `volunteerNames` on navigation**

Locate the `onPress` handler of the back button (inside the detail view header):

```ts
              onPress={() => {
                setView('list');
                setSelectedEvent(null);
                setSignupError(null);
              }}
```

Replace it with:

```ts
              onPress={() => {
                setView('list');
                setSelectedEvent(null);
                setSignupError(null);
                setVolunteerNames({});
              }}
```

Locate the `onPress` handler of each `EventCard` in the list view:

```ts
                onPress={() => {
                  setSelectedEvent(item);
                  setView('detail');
                }}
```

Replace it with:

```ts
                onPress={() => {
                  setSelectedEvent(item);
                  setView('detail');
                  loadVolunteerNames(item);
                }}
```

- [ ] **Step 5: Render volunteer names below the fill-count row inside each slot card**

Locate the `slotFillRow` `View` inside the `slots.map(...)` render. It currently reads:

```tsx
                    <View style={styles.slotFillRow}>
                      <Text style={styles.slotFillText}>
                        {slot.quantityFilled} / {slot.quantityTotal}
                      </Text>
                      <StatusBadge
                        quantityFilled={slot.quantityFilled}
                        quantityTotal={slot.quantityTotal}
                      />
                    </View>
```

Replace it with:

```tsx
                    <View style={styles.slotFillRow}>
                      <Text style={styles.slotFillText}>
                        {slot.quantityFilled} / {slot.quantityTotal}
                      </Text>
                      <StatusBadge
                        quantityFilled={slot.quantityFilled}
                        quantityTotal={slot.quantityTotal}
                      />
                    </View>

                    {selectedEvent.showVolunteerNames && (volunteerNames[slot.id] ?? []).length > 0 && (
                      <View style={styles.volunteerNamesContainer}>
                        {(volunteerNames[slot.id] ?? []).map((name, index) => (
                          <Text
                            key={`${slot.id}-${index}`}
                            testID={`volunteer-name-${slot.id}-${index}`}
                            style={styles.volunteerNameText}
                          >
                            {name}
                          </Text>
                        ))}
                      </View>
                    )}
```

- [ ] **Step 6: Add styles for the volunteer names section**

Locate the end of the `StyleSheet.create({...})` block. Find the last style entry before the closing `});`:

```ts
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    marginTop: 40,
  },
});
```

Replace it with:

```ts
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    marginTop: 40,
  },
  volunteerNamesContainer: {
    marginTop: 6,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#d1d5db',
  },
  volunteerNameText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
});
```

---

## Task 5: Run tests and confirm all pass

- [ ] **Step 1: Run the VolunteerEvents test file**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
npx jest __tests__/screens/VolunteerEvents.test.tsx --no-coverage
```

Expected output:

```
PASS __tests__/screens/VolunteerEvents.test.tsx
  VolunteerEvents
    ✓ shows public event but not private event
    ✓ navigates to detail on event tap
    ✓ shows slot with Sign Up button when not full and not signed up
    ✓ calls createSignup when Sign Up is pressed
    ✓ does not call fetchEventSignups when showVolunteerNames is false
    ✓ calls fetchEventSignups with orgId and eventId when showVolunteerNames is true
    ✓ renders volunteer names below a slot when showVolunteerNames is true and names are returned
    ✓ renders no volunteer names for a slot when showVolunteerNames is true but slot has no signups

Tests: 8 passed, 8 total
```

- [ ] **Step 2: Run the full test suite to check for regressions**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
npx jest --no-coverage
```

Expected output:

```
Test Suites: X passed, X total
Tests:       X passed, X total
```

All pre-existing tests continue to pass.

- [ ] **Step 3: TypeScript compile check**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
npx tsc --noEmit
```

Expected: No errors or warnings.

---

## Task 6: Commit

- [ ] **Step 1: Stage the four changed files**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
git add lib/types.ts hooks/useSignups.ts app/(volunteer)/events.tsx __tests__/screens/VolunteerEvents.test.tsx
```

- [ ] **Step 2: Create the commit**

```bash
git commit -m "feat: show volunteer names inline on iOS event detail when showVolunteerNames is enabled (#8)"
```

Expected:

```
[main <sha>] feat: show volunteer names inline on iOS event detail when showVolunteerNames is enabled (#8)
 4 files changed, ...
```

---

## Task 7: Manual smoke test on device / simulator

- [ ] **Step 1: Start the Expo dev server**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
npx expo start --ios
```

- [ ] **Step 2: Verify feature is hidden when `showVolunteerNames` is false**

1. Log in as a volunteer.
2. Open an event that has `showVolunteerNames: false` (or the field absent).
3. Navigate to the event detail screen.
4. Confirm: slot rows show only the fill count and status badge — no volunteer name section appears below any slot.

- [ ] **Step 3: Verify names appear when `showVolunteerNames` is true**

1. In Firebase Console, set `showVolunteerNames: true` on a test event that has at least one signup.
2. Open that event in the iOS app.
3. Confirm: signed-up volunteer names appear below the fill-count row for the correct slots, indented with a left border.
4. Confirm: slots with zero signups show no name section.

- [ ] **Step 4: Verify slots that are full show all names**

1. Use a test event where one slot is completely filled (e.g. 3/3).
2. Open the event detail.
3. Confirm: all three volunteer names are listed below that slot.

- [ ] **Step 5: Verify Firestore reads succeed without permission errors**

1. Log in as a volunteer who is NOT an admin of the org.
2. Open a `showVolunteerNames: true` event.
3. Confirm no permission-denied errors appear in the Expo console.
4. Confirm names load correctly.

- [ ] **Step 6: Verify back navigation clears names correctly**

1. Open an event with names visible.
2. Tap the back button.
3. Tap a different event (one with `showVolunteerNames: false`).
4. Confirm no stale names from the previous event appear.
