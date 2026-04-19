# Volunteer Names on Signup Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show full volunteer names per slot on the public event signup page, controlled by a per-event `showVolunteerNames` toggle set by org admins at event creation.

**Architecture:** Add `showVolunteerNames: boolean` to the event data model; surface a checkbox in the admin create-event form; in the public `EventDetail` page, conditionally fetch all event signups and build a `slotId → name[]` map; pass the names list to `SlotCard` for rendering below the progress bar.

**Tech Stack:** React 19, TypeScript, Firebase Firestore, Tailwind CSS, Vitest + Testing Library

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/hooks/useEvents.ts` | Add `showVolunteerNames` to `Event` and `EventInput` interfaces and Firestore read mapping |
| Modify | `src/pages/admin/Events.tsx` | Add `showVolunteerNames` state + checkbox in create form |
| Modify | `src/components/SlotCard.tsx` | Accept and render `volunteerNames?: string[]` prop |
| Modify | `src/pages/EventDetail.tsx` | Conditionally fetch signups and pass names to SlotCard |
| Create | `src/components/__tests__/SlotCard.volunteer-names.test.tsx` | Tests for SlotCard name rendering |
| Create | `src/pages/__tests__/EventDetail.volunteer-names.test.tsx` | Tests for EventDetail name fetch and display |

---

## Task 1: Add `showVolunteerNames` to the event data model

**Files:**
- Modify: `src/hooks/useEvents.ts`

- [ ] **Step 1: Add the field to both interfaces**

In `src/hooks/useEvents.ts`, add `showVolunteerNames: boolean` to the `Event` interface (after `isPublic`) and to the `EventInput` interface (after `isPublic`):

```ts
export interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  location: string;
  description: string;
  isPublic: boolean;
  showVolunteerNames: boolean;  // ← add this
  createdAt: Date;
}

export interface EventInput {
  title: string;
  startTime: Date;
  endTime?: Date;
  location: string;
  description: string;
  isPublic: boolean;
  showVolunteerNames: boolean;  // ← add this
}
```

- [ ] **Step 2: Add the field to the Firestore read mapping**

In the `onSnapshot` callback inside `useEvents`, update the `eventList.push({...})` block to include:

```ts
isPublic: data.isPublic ?? true,
showVolunteerNames: data.showVolunteerNames ?? false,  // ← add after isPublic
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app"
npx tsc --noEmit
```

Expected: No errors (the admin form and EventDetail will fail until their tasks are done — fix those TypeScript errors in their respective tasks by also adding the field there).

> Note: `tsc` will produce errors about missing `showVolunteerNames` in the admin form `EventInput` object and in `EventDetail`'s event state read. These are expected at this stage — they will be fixed in Tasks 2 and 3. You can skip this step and come back after Task 3 for a clean compile check.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useEvents.ts
git commit -m "feat: add showVolunteerNames field to Event and EventInput types"
```

---

## Task 2: TDD — SlotCard renders volunteer names

**Files:**
- Create: `src/components/__tests__/SlotCard.volunteer-names.test.tsx`
- Modify: `src/components/SlotCard.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/SlotCard.volunteer-names.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlotCard } from '../SlotCard';

const baseSlot = {
  id: 'slot1',
  name: 'Scorer',
  category: 'Officials',
  quantityTotal: 3,
  quantityFilled: 2,
  description: '',
  createdAt: new Date(),
};

describe('SlotCard volunteer names', () => {
  it('renders each volunteer name when volunteerNames is provided', () => {
    render(
      <SlotCard
        slot={baseSlot}
        volunteerNames={['Daniel Emmons', 'Sarah Johnson']}
      />
    );
    expect(screen.getByText('Daniel Emmons')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
  });

  it('renders nothing extra when volunteerNames is empty', () => {
    const { container } = render(
      <SlotCard slot={baseSlot} volunteerNames={[]} />
    );
    // The names section should not exist
    expect(container.querySelector('[data-testid="volunteer-names"]')).toBeNull();
  });

  it('renders nothing extra when volunteerNames is omitted', () => {
    const { container } = render(<SlotCard slot={baseSlot} />);
    expect(container.querySelector('[data-testid="volunteer-names"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app"
npx vitest run src/components/__tests__/SlotCard.volunteer-names.test.tsx
```

Expected: FAIL — `volunteerNames` prop does not exist on `SlotCard`.

- [ ] **Step 3: Add `volunteerNames` prop and render names in SlotCard**

In `src/components/SlotCard.tsx`:

1. Update `SlotCardProps` interface to add the optional prop:

```ts
interface SlotCardProps {
  slot: Slot;
  onSignUp?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  isSignedUp?: boolean;
  showActions?: boolean;
  adminView?: boolean;
  volunteerNames?: string[];  // ← add this
}
```

2. Add `volunteerNames` to the destructured props:

```ts
export function SlotCard({
  slot,
  onSignUp,
  onEdit,
  onDuplicate,
  onDelete,
  isSignedUp = false,
  showActions = true,
  adminView = false,
  volunteerNames,  // ← add this
}: SlotCardProps) {
```

3. Add the names list directly after the closing `</div>` of the progress bar section (after the `<div className="w-full bg-gray-200 rounded-full h-2">` block, inside the `<div className="mt-3">` wrapper). The full `mt-3` block becomes:

```tsx
<div className="mt-3">
  <div className="flex justify-between text-sm mb-1">
    <span className="text-gray-600">
      {filledCount} / {slot.quantityTotal} filled
    </span>
    <span
      className={`font-medium ${
        isFull
          ? 'text-red-600'
          : spotsLeft <= 2
          ? 'text-yellow-600'
          : 'text-green-600'
      }`}
    >
      {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
    </span>
  </div>
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className={`h-2 rounded-full transition-all ${
        isFull
          ? 'bg-red-500'
          : fillPercentage >= 75
          ? 'bg-yellow-500'
          : 'bg-green-500'
      }`}
      style={{ width: `${fillPercentage}%` }}
    />
  </div>
  {volunteerNames && volunteerNames.length > 0 && (
    <div className="mt-2 space-y-0.5" data-testid="volunteer-names">
      {volunteerNames.map((name, i) => (
        <p key={i} className="text-xs text-gray-500">{name}</p>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/__tests__/SlotCard.volunteer-names.test.tsx
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npx vitest run
```

Expected: All existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/SlotCard.tsx src/components/__tests__/SlotCard.volunteer-names.test.tsx
git commit -m "feat: SlotCard renders volunteer names below progress bar"
```

---

## Task 3: TDD — EventDetail fetches and surfaces volunteer names

**Files:**
- Create: `src/pages/__tests__/EventDetail.volunteer-names.test.tsx`
- Modify: `src/pages/EventDetail.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/__tests__/EventDetail.volunteer-names.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), connectAuthEmulator: vi.fn() }));
vi.mock('firebase/functions', () => ({ getFunctions: vi.fn(), connectFunctionsEmulator: vi.fn() }));

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(() => ({ orgId: 'org1', eventId: 'event1' })),
  useNavigate: vi.fn(() => vi.fn()),
  useLocation: vi.fn(() => ({ pathname: '/test', state: null })),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('../../lib/firebase', () => ({ db: {} }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ currentUser: null, userProfile: null, refreshProfile: vi.fn() })),
}));
vi.mock('../../hooks/useSignups', () => ({
  useSignups: vi.fn(() => ({ createSignup: vi.fn() })),
}));
vi.mock('../../components/AddToCalendar', () => ({ AddToCalendar: () => null }));

// We need the real SlotCard to verify names are rendered
vi.mock('../../components/SlotCard', () => ({
  SlotCard: ({ volunteerNames }: { volunteerNames?: string[] }) => (
    <div data-testid="slot-card">
      {volunteerNames?.map((name, i) => (
        <span key={i} data-testid="volunteer-name">{name}</span>
      ))}
    </div>
  ),
}));

import { getDocs, getDoc } from 'firebase/firestore';
import { EventDetail } from '../EventDetail';

const mockGetDoc = getDoc as ReturnType<typeof vi.fn>;
const mockGetDocs = getDocs as ReturnType<typeof vi.fn>;

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  where: vi.fn(),
  updateDoc: vi.fn(),
  getCountFromServer: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
  Timestamp: { fromDate: vi.fn() },
}));

function makeEventDoc(showVolunteerNames: boolean) {
  return {
    exists: () => true,
    data: () => ({
      title: 'Test Tournament',
      startTime: { toDate: () => new Date('2026-06-01T10:00:00') },
      isPublic: true,
      showVolunteerNames,
      name: 'Test Org',
      branding: { primaryColor: '#243c7c' },
    }),
  };
}

const slotDoc = {
  id: 'slot1',
  data: () => ({
    name: 'Scorer',
    category: 'Officials',
    quantityTotal: 2,
    quantityFilled: 1,
    description: '',
    createdAt: { toDate: () => new Date() },
  }),
};

const signupDoc = {
  data: () => ({ slotId: 'slot1', userName: 'Daniel Emmons' }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EventDetail volunteer names', () => {
  it('passes volunteer names to SlotCard when showVolunteerNames is true', async () => {
    // First getDoc = event, second getDoc = org
    mockGetDoc
      .mockResolvedValueOnce(makeEventDoc(true))
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Test Org', branding: { primaryColor: '#243c7c' } }) });

    // First getDocs = slots, second getDocs = signups
    mockGetDocs
      .mockResolvedValueOnce({ docs: [slotDoc] })
      .mockResolvedValueOnce({ forEach: (fn: (d: typeof signupDoc) => void) => fn(signupDoc) });

    render(<EventDetail />);

    const name = await screen.findByTestId('volunteer-name');
    expect(name).toHaveTextContent('Daniel Emmons');
  });

  it('does not fetch signups when showVolunteerNames is false', async () => {
    mockGetDoc
      .mockResolvedValueOnce(makeEventDoc(false))
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Test Org', branding: { primaryColor: '#243c7c' } }) });

    mockGetDocs.mockResolvedValueOnce({ docs: [slotDoc] });

    render(<EventDetail />);

    await screen.findByTestId('slot-card');

    // getDocs should only be called once (slots), not twice (slots + signups)
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });

  it('renders slots normally if signups query throws', async () => {
    mockGetDoc
      .mockResolvedValueOnce(makeEventDoc(true))
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Test Org', branding: { primaryColor: '#243c7c' } }) });

    mockGetDocs
      .mockResolvedValueOnce({ docs: [slotDoc] })
      .mockRejectedValueOnce(new Error('Firestore error'));

    render(<EventDetail />);

    // Slot card still renders despite the failed signups query
    expect(await screen.findByTestId('slot-card')).toBeInTheDocument();
    expect(screen.queryByTestId('volunteer-name')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/pages/__tests__/EventDetail.volunteer-names.test.tsx
```

Expected: FAIL — `EventDetail` does not yet fetch signups or pass `volunteerNames` to `SlotCard`.

- [ ] **Step 3: Update EventDetail to fetch names and pass them to SlotCard**

In `src/pages/EventDetail.tsx`:

1. Add state for the names map after the existing state declarations (around line 36):

```ts
const [slotVolunteerNames, setSlotVolunteerNames] = useState<Record<string, string[]>>({});
```

2. In the `fetchData` function, after `setSlots(slotList)` and before the "Fetch user's signups" block, add the conditional names fetch:

```ts
// Fetch volunteer names if event has showVolunteerNames enabled
if (eventData.showVolunteerNames) {
  try {
    const signupsRef = collection(db, 'organizations', orgId, 'signups');
    const signupsQuery = query(signupsRef, where('eventId', '==', eventId));
    const signupsSnap = await getDocs(signupsQuery);
    const namesBySlot: Record<string, string[]> = {};
    signupsSnap.forEach((doc) => {
      const { slotId, userName } = doc.data();
      if (!namesBySlot[slotId]) namesBySlot[slotId] = [];
      namesBySlot[slotId].push(userName);
    });
    setSlotVolunteerNames(namesBySlot);
  } catch {
    // Names are supplementary — silent failure, slots still render
  }
}
```

3. In the JSX where `SlotCard` is rendered (around line 317), add the `volunteerNames` prop:

```tsx
<SlotCard
  key={slot.id}
  slot={slot}
  isSignedUp={userSignupSlots.has(slot.id)}
  volunteerNames={
    event.showVolunteerNames
      ? (slotVolunteerNames[slot.id] ?? [])
      : undefined
  }
  onSignUp={
    signingUp === slot.id
      ? undefined
      : () => handleSignUp(slot.id)
  }
/>
```

4. The `event` object read from state uses `eventData.showVolunteerNames` during fetch. The `event` state variable (type `Event`) also needs `showVolunteerNames`. Update the `setEvent({...})` call to include:

```ts
showVolunteerNames: eventData.showVolunteerNames ?? false,
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/pages/__tests__/EventDetail.volunteer-names.test.tsx
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit
```

Expected: No errors. If `event.showVolunteerNames` causes a type error, confirm the `Event` interface in `useEvents.ts` was updated in Task 1.

- [ ] **Step 7: Commit**

```bash
git add src/pages/EventDetail.tsx src/pages/__tests__/EventDetail.volunteer-names.test.tsx
git commit -m "feat: fetch and display volunteer names on public event signup page"
```

---

## Task 4: Add `showVolunteerNames` checkbox to admin create-event form

**Files:**
- Modify: `src/pages/admin/Events.tsx`

- [ ] **Step 1: Add the state variable**

In `src/pages/admin/Events.tsx`, add `showVolunteerNames` state alongside the existing form state declarations (around line 30):

```ts
const [isPublic, setIsPublic] = useState(true);
const [showVolunteerNames, setShowVolunteerNames] = useState(false);  // ← add
```

- [ ] **Step 2: Reset it in `resetForm`**

In the `resetForm` function, add:

```ts
setIsPublic(true);
setShowVolunteerNames(false);  // ← add
```

- [ ] **Step 3: Pass it to `createEvent`**

In the `handleCreate` function, update the `eventData` object:

```ts
const eventData: EventInput = {
  title,
  startTime: new Date(startDate),
  endTime: endDate ? new Date(endDate) : undefined,
  location,
  description,
  isPublic,
  showVolunteerNames,  // ← add
};
```

- [ ] **Step 4: Add the checkbox to the form**

In the JSX, directly after the closing `</div>` of the `isPublic` checkbox block (around line 290), add:

```tsx
<div className="flex items-center">
  <input
    id="showVolunteerNames"
    type="checkbox"
    checked={showVolunteerNames}
    onChange={(e) => setShowVolunteerNames(e.target.checked)}
    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
  />
  <label htmlFor="showVolunteerNames" className="ml-2 text-sm text-gray-700">
    Show volunteer names publicly (displays who has signed up for each slot)
  </label>
</div>
```

- [ ] **Step 5: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/Events.tsx
git commit -m "feat: add showVolunteerNames checkbox to admin create event form"
```

---

## Task 5: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app"
npm run dev
```

- [ ] **Step 2: Test names hidden (default)**

1. Log in as an admin.
2. Create a new event — leave "Show volunteer names publicly" **unchecked**.
3. Add a slot with `quantityTotal > 1`.
4. Sign up for the slot as a volunteer.
5. Open the public event URL in an incognito window.
6. Confirm: no volunteer names appear below the progress bar.

- [ ] **Step 3: Test names visible**

1. Create a second event — check "Show volunteer names publicly".
2. Add a slot.
3. Sign up as a volunteer (e.g. "Daniel Emmons").
4. Open the public event URL in an incognito window (no login).
5. Confirm: "Daniel Emmons" appears below the progress bar for that slot.
6. Confirm: slots with zero signups show no name list.

- [ ] **Step 4: Test silent failure path**

Not easily testable manually — covered by unit tests in Task 3.

- [ ] **Step 5: Final full test run**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Final commit (if any fixups)**

```bash
git add -p
git commit -m "fix: address smoke test findings for volunteer names feature"
```

(Skip if no changes needed.)
