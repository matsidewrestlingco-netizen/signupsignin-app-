# iOS Admin Cancel Signups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Cancel" button to unchecked-in volunteer cards in the Manual List mode of the admin check-in screen, with confirmation before deleting the signup document from Firestore.

**Architecture:** The `useSignups` hook already exposes a `cancelSignup(signupId)` function that deletes the Firestore document and decrements `quantityFilled` on the slot; the feature wires that function to the UI by adding a `cancelSignup` prop to `ManualListView`, rendering a destructive "Cancel" button next to "Check In" on unchecked-in cards, and gating deletion behind `Alert.alert()`. The existing `onSnapshot` listener removes the card from the list automatically on successful deletion.

**Tech Stack:** React Native, Expo, TypeScript, Firebase Firestore

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `app/(admin)/checkin.tsx` | Add `cancelSignup` prop to `ManualListViewProps`, render "Cancel" button in unchecked-in card row, add `cancelBtn` / `cancelBtnText` styles to `ml` StyleSheet |
| Modify | `__tests__/screens/AdminCheckIn.test.tsx` | Expose `mockCancelSignup` in the `useSignups` mock, add three new test cases covering Cancel button visibility, alert text, and Firestore call |

---

## Task 1: Write failing tests

**Files:**
- Modify: `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/__tests__/screens/AdminCheckIn.test.tsx`

- [ ] **Step 1: Add `mockCancelSignup` to the existing `useSignups` mock and write three new test cases**

Open `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/__tests__/screens/AdminCheckIn.test.tsx`.

Add `mockCancelSignup` alongside the existing `mockCheckIn` and `mockUndoCheckIn` declarations (after line 20):

```ts
const mockCancelSignup = jest.fn().mockResolvedValue(undefined);
```

Update the `useSignups` mock return value to expose `cancelSignup` (replace the existing `jest.mock('../../hooks/useSignups', ...)` block):

```ts
jest.mock('../../hooks/useSignups', () => ({
  useSignups: () => ({
    signups: [
      { id: 's1', eventId: 'e1', slotId: 'slot1', userId: 'user1',
        userName: 'Alice Smith', userEmail: 'alice@test.com',
        note: '', checkedIn: false, createdAt: new Date() },
      { id: 's2', eventId: 'e1', slotId: 'slot1', userId: 'user2',
        userName: 'Bob Jones', userEmail: 'bob@test.com',
        note: '', checkedIn: true, checkedInAt: new Date('2026-04-05T14:30:00'), createdAt: new Date() },
    ],
    loading: false,
    checkIn: mockCheckIn,
    undoCheckIn: mockUndoCheckIn,
    cancelSignup: mockCancelSignup,
  }),
}));
```

Add a top-level import for `Alert` from `react-native` (add after the existing `import React` line at the top of the test file):

```ts
import { Alert } from 'react-native';
```

Append the following three `it` blocks inside the existing `describe('AdminCheckIn', () => { ... })` block, after the last existing test:

```ts
  it('shows a Cancel button on unchecked-in cards in manual list mode', () => {
    const { getByText, getAllByText } = render(<AdminCheckIn />);
    fireEvent.press(getByText('Manual List'));
    // Alice is unchecked-in — Cancel should be present
    expect(getAllByText('Cancel').length).toBeGreaterThanOrEqual(1);
  });

  it('does not show a Cancel button on already-checked-in cards', () => {
    const { getByText, queryAllByText } = render(<AdminCheckIn />);
    fireEvent.press(getByText('Manual List'));
    // Bob is checked-in — only one Cancel button (Alice's), not two
    expect(queryAllByText('Cancel').length).toBe(1);
  });

  it('calls cancelSignup with the signup id after confirming the alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _message, buttons) => {
        // Simulate tapping the destructive "Remove Signup" button
        const removeBtn = buttons?.find(b => b.text === 'Remove Signup');
        removeBtn?.onPress?.();
      }
    );

    const { getByText } = render(<AdminCheckIn />);
    fireEvent.press(getByText('Manual List'));
    fireEvent.press(getByText('Cancel'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Cancel Signup',
      "Cancel Alice Smith's signup? This will remove them from this slot.",
      expect.arrayContaining([
        expect.objectContaining({ text: 'Dismiss' }),
        expect.objectContaining({ text: 'Remove Signup', style: 'destructive' }),
      ])
    );
    expect(mockCancelSignup).toHaveBeenCalledWith('s1');

    alertSpy.mockRestore();
  });
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
npx jest __tests__/screens/AdminCheckIn.test.tsx --no-coverage
```

Expected output (three failures, four passes):

```
FAIL __tests__/screens/AdminCheckIn.test.tsx
  AdminCheckIn
    ✓ renders the header
    ✓ shows event name in selector
    ✓ switches to manual list and shows signups
    ✓ calls checkIn when Check In button pressed in manual list
    ✗ shows a Cancel button on unchecked-in cards in manual list mode
    ✗ does not show a Cancel button on already-checked-in cards
    ✗ calls cancelSignup with the signup id after confirming the alert
```

---

## Task 2: Wire `cancelSignup` through `ManualListView`

**Files:**
- Modify: `/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile/app/(admin)/checkin.tsx`

- [ ] **Step 1: Add `Alert` to the React Native import**

Locate the existing import at the top of `app/(admin)/checkin.tsx`:

```ts
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
```

Replace it with:

```ts
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
```

- [ ] **Step 2: Add `cancelSignup` to `ManualListViewProps`**

Locate the `ManualListViewProps` interface:

```ts
interface ManualListViewProps {
  signups: Signup[];
  loading: boolean;
  checkIn: (id: string) => Promise<void>;
  undoCheckIn: (id: string) => Promise<void>;
}
```

Replace it with:

```ts
interface ManualListViewProps {
  signups: Signup[];
  loading: boolean;
  checkIn: (id: string) => Promise<void>;
  undoCheckIn: (id: string) => Promise<void>;
  cancelSignup: (id: string) => Promise<void>;
}
```

- [ ] **Step 3: Destructure `cancelSignup` in the `ManualListView` function signature**

Locate the function signature:

```ts
function ManualListView({ signups, loading, checkIn, undoCheckIn }: ManualListViewProps) {
```

Replace it with:

```ts
function ManualListView({ signups, loading, checkIn, undoCheckIn, cancelSignup }: ManualListViewProps) {
```

- [ ] **Step 4: Add the `handleCancel` function inside `ManualListView`**

Inside `ManualListView`, directly after the `formatTime` function definition (before the `return` statement), add:

```ts
  function handleCancel(signupId: string, volunteerName: string) {
    Alert.alert(
      'Cancel Signup',
      `Cancel ${volunteerName}'s signup? This will remove them from this slot.`,
      [
        { text: 'Dismiss', style: 'cancel' },
        {
          text: 'Remove Signup',
          style: 'destructive',
          onPress: () => cancelSignup(signupId),
        },
      ]
    );
  }
```

- [ ] **Step 5: Render the "Cancel" button alongside "Check In" for unchecked-in cards**

Locate the unchecked-in branch inside the `FlatList` `renderItem`. It currently reads:

```tsx
              {!item.checkedIn ? (
                  <TouchableOpacity
                    style={ml.checkInBtn}
                    onPress={() => checkIn(item.id)}
                  >
                    <Text style={ml.checkInBtnText}>Check In</Text>
                  </TouchableOpacity>
                ) : (
```

Replace that unchecked-in branch (the `<TouchableOpacity>` for "Check In" only) with a column group containing both buttons:

```tsx
              {!item.checkedIn ? (
                  <View style={ml.actionGroup}>
                    <TouchableOpacity
                      style={ml.checkInBtn}
                      onPress={() => checkIn(item.id)}
                    >
                      <Text style={ml.checkInBtnText}>Check In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={ml.cancelBtn}
                      onPress={() => handleCancel(item.id, item.userName)}
                    >
                      <Text style={ml.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
```

- [ ] **Step 6: Pass `cancelSignup` from the main screen down to `ManualListView`**

Locate the `useSignups` destructure in `AdminCheckIn`:

```ts
  const { signups, loading: signupsLoading, checkIn, undoCheckIn } = useSignups(
    currentOrg?.id,
    selectedEventId ?? undefined
  );
```

Replace it with:

```ts
  const { signups, loading: signupsLoading, checkIn, undoCheckIn, cancelSignup } = useSignups(
    currentOrg?.id,
    selectedEventId ?? undefined
  );
```

Locate the `ManualListView` JSX call:

```tsx
            <ManualListView
              signups={signups}
              loading={signupsLoading}
              checkIn={checkIn}
              undoCheckIn={undoCheckIn}
            />
```

Replace it with:

```tsx
            <ManualListView
              signups={signups}
              loading={signupsLoading}
              checkIn={checkIn}
              undoCheckIn={undoCheckIn}
              cancelSignup={cancelSignup}
            />
```

- [ ] **Step 7: Add styles for the new button group and Cancel button**

Locate the `ml` StyleSheet. After the existing `checkedGroup` style entry:

```ts
  checkedGroup: {
    alignItems: 'center',
    gap: 6,
  },
```

Add the three new style entries:

```ts
  actionGroup: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
```

---

## Task 3: Run tests and confirm all pass

- [ ] **Step 1: Run the full AdminCheckIn test file**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
npx jest __tests__/screens/AdminCheckIn.test.tsx --no-coverage
```

Expected output:

```
PASS __tests__/screens/AdminCheckIn.test.tsx
  AdminCheckIn
    ✓ renders the header
    ✓ shows event name in selector
    ✓ switches to manual list and shows signups
    ✓ calls checkIn when Check In button pressed in manual list
    ✓ shows a Cancel button on unchecked-in cards in manual list mode
    ✓ does not show a Cancel button on already-checked-in cards
    ✓ calls cancelSignup with the signup id after confirming the alert

Tests: 7 passed, 7 total
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

Expected: No errors.

---

## Task 4: Commit

- [ ] **Step 1: Stage the two changed files**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
git add app/(admin)/checkin.tsx __tests__/screens/AdminCheckIn.test.tsx
```

- [ ] **Step 2: Create the commit**

```bash
git commit -m "feat: add Cancel button to unchecked-in volunteer cards in admin check-in (#9)"
```

Expected:

```
[main <sha>] feat: add Cancel button to unchecked-in volunteer cards in admin check-in (#9)
 2 files changed, ...
```

---

## Task 5: Manual smoke test on device / simulator

- [ ] **Step 1: Start the Expo dev server**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-mobile"
npx expo start --ios
```

- [ ] **Step 2: Verify "Cancel" appears only on unchecked-in cards**

1. Navigate to the Admin tab → Check-In screen.
2. Select an event that has at least one signup.
3. Switch to "Manual List" mode.
4. Confirm: unchecked-in volunteer cards show both a green "Check In" button and a red-outlined "Cancel" button stacked vertically.
5. Confirm: already-checked-in cards (showing "✓ In" + "Undo") show no "Cancel" button.

- [ ] **Step 3: Verify alert text and dismiss path**

1. Tap "Cancel" on an unchecked-in card (e.g. volunteer named "Jane Doe").
2. Confirm alert title reads: `Cancel Signup`
3. Confirm alert message reads: `Cancel Jane Doe's signup? This will remove them from this slot.`
4. Tap "Dismiss" — confirm the card remains, Firestore is unchanged.

- [ ] **Step 4: Verify confirm path removes the card**

1. Tap "Cancel" on an unchecked-in card.
2. Tap "Remove Signup" in the alert.
3. Confirm the card disappears from the list immediately (driven by the `onSnapshot` listener).
4. Open the Firestore console and confirm the signup document no longer exists under `/organizations/{orgId}/signups/`.
5. Confirm the slot's `quantityFilled` decremented by 1 in `/organizations/{orgId}/events/{eventId}/slots/{slotId}`.

- [ ] **Step 5: Verify QR Scanner mode is unchanged**

1. Switch to "QR Scanner" mode.
2. Confirm the scanner UI is identical to before — no Cancel-related elements.
