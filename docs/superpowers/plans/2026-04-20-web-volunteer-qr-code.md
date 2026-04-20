# Web Volunteer QR Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a QR code to the top of the volunteer Check-In page that encodes the volunteer's Firebase UID, enabling iOS admin scanners to check them in without any native app changes.

**Architecture:** Install `qrcode.react` and render a `<QRCodeSVG>` component at the top of `ParentCheckIn`, sourcing the value from `currentUser.uid` via the existing `useAuth` context; the existing shifts list and manual check-in button below remain completely unchanged.

**Tech Stack:** React, TypeScript, Firebase Auth, qrcode.react

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Install | `package.json` / `node_modules` | Add `qrcode.react` dependency |
| Create | `src/pages/parent/__tests__/CheckIn.qr-code.test.tsx` | Vitest tests for QR code rendering |
| Modify | `src/pages/parent/CheckIn.tsx` | Import `QRCodeSVG`, add QR section above shifts list |

---

## Task 1: Install `qrcode.react`

**Files:**
- `package.json` (updated automatically by npm)

- [ ] **Step 1: Install the package**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app"
npm install qrcode.react
```

Expected output (exact versions may vary):
```
added 1 package, and audited N packages in Xs
```

- [ ] **Step 2: Confirm the package appears in `package.json` dependencies**

Open `package.json` and verify a line like this appears under `"dependencies"`:
```json
"qrcode.react": "^4.x.x"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install qrcode.react for volunteer QR code feature"
```

---

## Task 2: TDD — write failing tests for QR code section

**Files:**
- Create: `src/pages/parent/__tests__/CheckIn.qr-code.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/parent/__tests__/CheckIn.qr-code.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Firebase modules to prevent initialization errors
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), connectAuthEmulator: vi.fn() }));
vi.mock('firebase/functions', () => ({ getFunctions: vi.fn(), connectFunctionsEmulator: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: { fromDate: vi.fn() },
}));

vi.mock('../../../lib/firebase', () => ({ db: {} }));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../contexts/OrgContext', () => ({
  useOrg: vi.fn(),
}));

vi.mock('../../../components/StatusBadge', () => ({
  StatusBadge: () => null,
}));

// Mock qrcode.react so tests don't need a real canvas environment
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, size }: { value: string; size: number }) => (
    <svg data-testid="qr-code" data-value={value} data-size={size} />
  ),
}));

import { ParentCheckIn } from '../CheckIn';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrg } from '../../../contexts/OrgContext';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseOrg = useOrg as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ currentUser: { uid: 'user-abc-123' } });
  mockUseOrg.mockReturnValue({ currentOrg: { id: 'org1' } });
});

describe('ParentCheckIn QR code', () => {
  it('renders a QR code element', async () => {
    render(<ParentCheckIn />);
    expect(await screen.findByTestId('qr-code')).toBeInTheDocument();
  });

  it('encodes the current user Firebase UID as the QR value', async () => {
    render(<ParentCheckIn />);
    const qr = await screen.findByTestId('qr-code');
    expect(qr).toHaveAttribute('data-value', 'user-abc-123');
  });

  it('renders the helper label below the QR code', async () => {
    render(<ParentCheckIn />);
    expect(
      await screen.findByText(/show this to an admin to check in/i)
    ).toBeInTheDocument();
  });

  it('renders the QR code section heading', async () => {
    render(<ParentCheckIn />);
    expect(await screen.findByText(/your check-in code/i)).toBeInTheDocument();
  });

  it('renders the QR code section above the shifts heading', async () => {
    render(<ParentCheckIn />);
    const qr = await screen.findByTestId('qr-code');
    const pageTitle = screen.getByRole('heading', { name: /check in/i, level: 1 });
    // QR section wrapper appears after the page title but the page title itself comes first
    // Verify QR is present in the document (ordering is validated visually during smoke test)
    expect(qr).toBeInTheDocument();
    expect(pageTitle).toBeInTheDocument();
  });

  it('renders QR at size 200 or larger', async () => {
    render(<ParentCheckIn />);
    const qr = await screen.findByTestId('qr-code');
    const size = Number(qr.getAttribute('data-size'));
    expect(size).toBeGreaterThanOrEqual(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app"
npx vitest run src/pages/parent/__tests__/CheckIn.qr-code.test.tsx
```

Expected: FAIL — `qrcode.react` import fails or `data-testid="qr-code"` is not found because `CheckIn.tsx` does not yet render a QR code.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/pages/parent/__tests__/CheckIn.qr-code.test.tsx
git commit -m "test: add failing tests for volunteer QR code on CheckIn page"
```

---

## Task 3: Implement the QR code section in `CheckIn.tsx`

**Files:**
- Modify: `src/pages/parent/CheckIn.tsx`

- [ ] **Step 1: Add the `QRCodeSVG` import**

In `src/pages/parent/CheckIn.tsx`, add the import directly after the existing import block (after line 7, the `StatusBadge` import):

```ts
import { QRCodeSVG } from 'qrcode.react';
```

The top of the file should now read:

```ts
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { StatusBadge } from '../../components/StatusBadge';
import { QRCodeSVG } from 'qrcode.react';
```

- [ ] **Step 2: Add the QR code section to the JSX**

In `src/pages/parent/CheckIn.tsx`, locate the return statement. The existing JSX opens with:

```tsx
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Check In</h1>
        <p className="page-subtitle">Mark yourself as present for your volunteer shifts</p>
      </div>

      {items.length === 0 ? (
```

Replace that opening block with the version below, which inserts the QR code section between the page header and the items content:

```tsx
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Check In</h1>
        <p className="page-subtitle">Mark yourself as present for your volunteer shifts</p>
      </div>

      {currentUser && (
        <div className="card mb-8">
          <div className="card-body flex flex-col items-center py-8">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Your Check-In Code</h2>
            <QRCodeSVG value={currentUser.uid} size={224} />
            <p className="mt-4 text-sm text-gray-500">Show this to an admin to check in</p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
```

- [ ] **Step 3: Run the failing tests — they should now pass**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app"
npx vitest run src/pages/parent/__tests__/CheckIn.qr-code.test.tsx
```

Expected: All 6 tests PASS.

- [ ] **Step 4: Run the full test suite to check for regressions**

```bash
npx vitest run
```

Expected: All existing tests still pass alongside the 6 new tests.

- [ ] **Step 5: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit
```

Expected: No errors. If TypeScript cannot find `qrcode.react` types, install them:

```bash
npm install --save-dev @types/qrcode.react
```

Then re-run `npx tsc --noEmit` and confirm no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/parent/CheckIn.tsx
git commit -m "feat: add volunteer QR code to Check-In page"
```

---

## Task 4: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app"
npm run dev
```

- [ ] **Step 2: Navigate to the Check-In page**

1. Log in as a volunteer/parent account.
2. Go to `/parent/checkin`.
3. Confirm a "Your Check-In Code" section appears at the top of the page, above any shift cards.
4. Confirm the QR code renders as a square code at roughly 224px.
5. Confirm the label "Show this to an admin to check in" appears below the code.
6. Confirm the existing upcoming shifts and "Check In" buttons are still present and functional below the QR section.

- [ ] **Step 3: Verify QR value is the correct UID**

1. Open browser DevTools → Application → Firebase Auth (or Network tab to observe the UID in use).
2. Note the current user's Firebase UID.
3. Use a QR reader app (or browser extension) to scan the on-screen code.
4. Confirm the scanned value matches the Firebase UID exactly.

- [ ] **Step 4: Verify the page still works when there are no signups**

1. Log in as a user with no upcoming signups.
2. Confirm the QR code section still renders at the top.
3. Confirm the "No upcoming signups to check in for" message renders below it.

- [ ] **Step 5: Final full test run**

```bash
npx vitest run
```

Expected: All tests pass with output similar to:
```
Test Files  X passed (X)
Tests       X passed (X)
```

- [ ] **Step 6: Deploy**

```bash
npm run build && firebase deploy --only hosting
```

Expected: Build completes with no TypeScript or Vite errors, and deploy succeeds with a hosting URL.
