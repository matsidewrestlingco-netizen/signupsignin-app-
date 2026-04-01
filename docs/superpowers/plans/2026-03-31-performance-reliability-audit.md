# Performance & Reliability Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 reliability issues and 2 performance issues, including the reported blank-page bug on event pages.

**Architecture:** Targeted fixes to existing files — no new pages, no new routes, no new hooks. Each fix is independent and can be committed separately. All work is done on the Mac and synced to the Pi dev environment for testing against Firebase Emulators.

**Tech Stack:** React 19, TypeScript, Vite 7, Firebase 12, Vitest, React Testing Library

---

## Workflow

**Edit on Mac → Sync to Pi → Test in browser at `http://192.168.8.198:5173`**

Sync command (run from Mac after each task group):
```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
```

Pi dev commands (run once via SSH, keep running):
```bash
# Terminal 1
cd ~/signupsignin-app && firebase emulators:start --only firestore,auth

# Terminal 2
cd ~/signupsignin-app && npm run dev -- --host
```

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `firebase.json` | Modify | Add emulator config |
| `src/lib/firebase.ts` | Modify | Connect to emulators when `VITE_USE_EMULATOR=true` |
| `vite.config.ts` | Modify | Add Vitest test config |
| `package.json` | Modify | Add test deps + `test` script |
| `src/test/setup.ts` | Create | Vitest + jest-dom setup |
| `src/components/ErrorBoundary.tsx` | Create | Catches render errors, shows friendly UI |
| `src/components/__tests__/ErrorBoundary.test.tsx` | Create | Unit tests for ErrorBoundary |
| `src/components/__tests__/ProtectedRoute.test.tsx` | Create | Unit tests for ProtectedRoute |
| `src/App.tsx` | Modify | Wrap route layouts with ErrorBoundary |
| `src/hooks/useSignups.ts` | Modify | R2: transaction for createSignup; R3: fix cancelSignup stale state |
| `src/components/ProtectedRoute.tsx` | Modify | R5: hold spinner when requireOrg=true and userProfile is null |
| `src/pages/admin/EventDetail.tsx` | Modify | R4: show error banner when signups or slots fail to load |
| `src/pages/parent/Dashboard.tsx` | Modify | R4: show error banner; P1: parallelize reads with Promise.all |
| `src/contexts/OrgContext.tsx` | Modify | P2: parallelize org reads with Promise.all |

---

## Task 0: Configure Dev Environment

**Files:**
- Modify: `firebase.json`
- Modify: `src/lib/firebase.ts`

- [ ] **Step 1: Add emulator config to `firebase.json`**

Replace the entire contents of `firebase.json` with:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "emulators": {
    "auth": { "port": 9099, "host": "0.0.0.0" },
    "firestore": { "port": 8080, "host": "0.0.0.0" },
    "ui": { "enabled": true, "port": 4000, "host": "0.0.0.0" }
  }
}
```

- [ ] **Step 2: Update `src/lib/firebase.ts` to connect to emulators**

Replace the entire file with:

```ts
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  const host = import.meta.env.VITE_EMULATOR_HOST || 'localhost';
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
}

export default app;
```

- [ ] **Step 3: Create `.env.development.local` on the Pi via SSH**

```bash
ssh emmons_house@192.168.8.198 "cat > ~/signupsignin-app/.env.development.local << 'EOF'
VITE_USE_EMULATOR=true
VITE_EMULATOR_HOST=192.168.8.198
EOF"
```

- [ ] **Step 4: Sync Mac → Pi**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
```

- [ ] **Step 5: Start emulators on Pi (SSH — keep this terminal open)**

```bash
ssh emmons_house@192.168.8.198
cd ~/signupsignin-app
firebase emulators:start --only firestore,auth
```

Expected output: `✔  All emulators ready! It is now safe to connect your app.`

- [ ] **Step 6: Start Vite dev server on Pi (SSH — second terminal, keep open)**

```bash
ssh emmons_house@192.168.8.198
cd ~/signupsignin-app
npm run dev -- --host
```

Expected output: `Local: http://localhost:5173/` and `Network: http://192.168.8.198:5173/`

- [ ] **Step 7: Verify in browser**

Open `http://192.168.8.198:5173` on your Mac. The app should load. The login form should work against the emulator (create a test account). Check the browser console — there should be no Firebase connection errors.

- [ ] **Step 8: Commit**

```bash
git init && git add firebase.json src/lib/firebase.ts
git commit -m "chore: add Firebase emulator config for dev environment"
```

*(If git isn't initialized yet: `git init` first, then `git add`, then commit.)*

---

## Task 1: Set Up Vitest

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Install test dependencies**

Run on the Mac in the project directory:

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Add test script to `package.json`**

In `package.json`, replace the `"scripts"` block with:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
},
```

- [ ] **Step 3: Update `vite.config.ts` with test config**

Replace the entire file with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Run tests to verify the setup works**

```bash
npm test
```

Expected output: `No test files found` (or `0 tests passed`) — no failures, just nothing to run yet.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/test/setup.ts
git commit -m "chore: add Vitest and React Testing Library"
```

---

## Task 2: R1 — React Error Boundary

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Create: `src/components/__tests__/ErrorBoundary.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/ErrorBoundary.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

function BrokenComponent(): never {
  throw new Error('Test render error');
}

const originalConsoleError = console.error;
beforeEach(() => { console.error = vi.fn(); });
afterEach(() => { console.error = originalConsoleError; });

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>Hello world</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders fallback UI when a child throws during render', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('resets error state when Try again is clicked', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    // BrokenComponent throws again after reset — fallback re-appears
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../ErrorBoundary'`

- [ ] **Step 3: Create `src/components/ErrorBoundary.tsx`**

```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-500 mb-6">
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-800"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS — 3 tests in ErrorBoundary.test.tsx

- [ ] **Step 5: Wrap route layouts in `src/App.tsx`**

Add the import at the top of `src/App.tsx` (after the existing imports):

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';
```

Then wrap each layout in the Routes. Replace the four `<Route element={...}>` opening tags as follows:

Replace:
```tsx
<Route element={<PublicLayout />}>
```
With:
```tsx
<Route element={<ErrorBoundary><PublicLayout /></ErrorBoundary>}>
```

Replace:
```tsx
element={
  <ProtectedRoute requireOrg>
    <AdminLayout />
  </ProtectedRoute>
}
```
With:
```tsx
element={
  <ProtectedRoute requireOrg>
    <ErrorBoundary><AdminLayout /></ErrorBoundary>
  </ProtectedRoute>
}
```

Replace:
```tsx
element={
  <ProtectedRoute>
    <ParentLayout />
  </ProtectedRoute>
}
```
With:
```tsx
element={
  <ProtectedRoute>
    <ErrorBoundary><ParentLayout /></ErrorBoundary>
  </ProtectedRoute>
}
```

Replace:
```tsx
element={
  <SuperAdminRoute>
    <PlatformLayout />
  </SuperAdminRoute>
}
```
With:
```tsx
element={
  <SuperAdminRoute>
    <ErrorBoundary><PlatformLayout /></ErrorBoundary>
  </SuperAdminRoute>
}
```

- [ ] **Step 6: Run tests to verify nothing broke**

```bash
npm test
```

Expected: PASS — same 3 tests

- [ ] **Step 7: Sync to Pi and verify in browser**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
```

Open `http://192.168.8.198:5173` — the app should still load normally. To manually confirm the boundary works: open browser devtools console on the Pi and verify no blank page on any route.

- [ ] **Step 8: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/components/__tests__/ErrorBoundary.test.tsx src/App.tsx
git commit -m "fix: add ErrorBoundary to prevent blank page on render errors"
```

---

## Task 3: R2 — Slot Capacity Race Condition

**Files:**
- Modify: `src/hooks/useSignups.ts`

- [ ] **Step 1: Update imports in `src/hooks/useSignups.ts`**

Replace the existing import block at the top of the file with:

```ts
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
```

- [ ] **Step 2: Replace the `createSignup` function**

Find and replace the entire `createSignup` function (lines 91–118 in the original file) with:

```ts
async function createSignup(data: SignupInput): Promise<string> {
  if (!orgId) throw new Error('No organization selected');

  const signupsRef = collection(db, 'organizations', orgId, 'signups');
  const slotRef = doc(db, 'organizations', orgId, 'events', data.eventId, 'slots', data.slotId);

  // Check for duplicate signup before entering the transaction
  const existingQuery = query(
    signupsRef,
    where('slotId', '==', data.slotId),
    where('userId', '==', data.userId)
  );
  const existingDocs = await getDocs(existingQuery);
  if (!existingDocs.empty) {
    throw new Error('You have already signed up for this slot');
  }

  const newSignupRef = doc(signupsRef);

  await runTransaction(db, async (transaction) => {
    const slotSnap = await transaction.get(slotRef);
    if (!slotSnap.exists()) throw new Error('Slot not found');

    const { quantityFilled = 0, quantityTotal = 1 } = slotSnap.data();
    if (quantityFilled >= quantityTotal) throw new Error('This slot is full');

    transaction.set(newSignupRef, {
      ...data,
      note: data.note || '',
      checkedIn: false,
      createdAt: serverTimestamp(),
    });

    transaction.update(slotRef, { quantityFilled: increment(1) });
  });

  return newSignupRef.id;
}
```

- [ ] **Step 3: Sync to Pi and test manually via browser**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
```

In the emulator UI at `http://192.168.8.198:4000`:
1. Create a test org, event, and slot with `quantityTotal: 1`
2. Sign up as user A — should succeed
3. Try to sign up as user B for the same slot — should get "This slot is full"

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSignups.ts
git commit -m "fix: use Firestore transaction in createSignup to prevent overbooking"
```

---

## Task 4: R3 — cancelSignup Stale State

**Files:**
- Modify: `src/hooks/useSignups.ts`

- [ ] **Step 1: Replace `cancelSignup` in `useMySignups`**

Find the `cancelSignup` function inside the `useMySignups` function (starting around line 219 in the original file). Replace it with:

```ts
async function cancelSignup(signupId: string): Promise<void> {
  if (!orgId) throw new Error('No organization selected');

  const signupRef = doc(db, 'organizations', orgId, 'signups', signupId);
  const signupSnap = await getDoc(signupRef);

  if (!signupSnap.exists()) return;

  const { eventId, slotId } = signupSnap.data();

  await deleteDoc(signupRef);

  const slotRef = doc(
    db,
    'organizations',
    orgId,
    'events',
    eventId,
    'slots',
    slotId
  );
  await updateDoc(slotRef, { quantityFilled: increment(-1) });
}
```

Also replace the `cancelSignup` function inside the main `useSignups` function (around line 141) with the same pattern (it already uses the `signups` local state to look up slotId):

```ts
async function cancelSignup(signupId: string): Promise<void> {
  if (!orgId) throw new Error('No organization selected');

  const signupRef = doc(db, 'organizations', orgId, 'signups', signupId);
  const signupSnap = await getDoc(signupRef);

  if (!signupSnap.exists()) return;

  const { eventId, slotId } = signupSnap.data();

  await deleteDoc(signupRef);

  const slotRef = doc(
    db,
    'organizations',
    orgId,
    'events',
    eventId,
    'slots',
    slotId
  );
  await updateDoc(slotRef, { quantityFilled: increment(-1) });
}
```

- [ ] **Step 2: Sync to Pi and test manually**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
```

Sign up for a slot as a parent user, then cancel from the Parent Dashboard. Verify in the emulator Firestore UI at `http://192.168.8.198:4000` that:
- The signup document is deleted
- The slot's `quantityFilled` decremented correctly

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSignups.ts
git commit -m "fix: read signup from Firestore before deleting to prevent stale state in cancelSignup"
```

---

## Task 5: R4 — Surface Error States in UI

**Files:**
- Modify: `src/pages/admin/EventDetail.tsx`
- Modify: `src/pages/parent/Dashboard.tsx`

- [ ] **Step 1: Add error banner to `src/pages/admin/EventDetail.tsx`**

In `AdminEventDetail`, the `useSignups` and `useSlots` hooks each return an `error` value that is never rendered. Add destructured error values and banners.

At the top of `AdminEventDetail`, find:
```tsx
const { slots, loading: slotsLoading, createSlot, updateSlot, deleteSlot } = useSlots(currentOrg?.id, eventId);
const { signups, loading: signupsLoading, checkIn, undoCheckIn, cancelSignup } = useSignups(currentOrg?.id, eventId);
```

Replace with:
```tsx
const { slots, loading: slotsLoading, error: slotsError, createSlot, updateSlot, deleteSlot } = useSlots(currentOrg?.id, eventId);
const { signups, loading: signupsLoading, error: signupsError, checkIn, undoCheckIn, cancelSignup } = useSignups(currentOrg?.id, eventId);
```

Then, inside the return, after the `{event.description && (...)}` card block and before the tabs `<div className="border-b border-gray-200 mb-6">`, insert:

```tsx
{(slotsError || signupsError) && (
  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
    <p className="text-sm text-red-700">
      {slotsError || signupsError}
    </p>
  </div>
)}
```

- [ ] **Step 2: Add error banner to `src/pages/parent/Dashboard.tsx`**

At the top of `ParentDashboard`, find:
```tsx
const { signups, loading, cancelSignup } = useMySignups(currentOrg?.id, currentUser?.uid);
```

Replace with:
```tsx
const { signups, loading, error: signupsError, cancelSignup } = useMySignups(currentOrg?.id, currentUser?.uid);
```

Then, inside the return, directly after the outer `<div>` opening tag (before the `<div className="page-header">`), insert:

```tsx
{signupsError && (
  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
    <p className="text-sm text-red-700">{signupsError}</p>
  </div>
)}
```

- [ ] **Step 3: Sync to Pi and verify**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
```

Normal operation should be unchanged. To verify the banner: temporarily stop the emulators and reload a page — you should see a red error banner instead of a silent empty list.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/EventDetail.tsx src/pages/parent/Dashboard.tsx
git commit -m "fix: surface hook error states in admin event detail and parent dashboard"
```

---

## Task 6: R5 — ProtectedRoute requireOrg Gap

**Files:**
- Create: `src/components/__tests__/ProtectedRoute.test.tsx`
- Modify: `src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/ProtectedRoute.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('ProtectedRoute', () => {
  it('shows spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ currentUser: null, loading: true, userProfile: null });
    render(
      <MemoryRouter>
        <ProtectedRoute><p>Content</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: '123' },
      loading: false,
      userProfile: { organizations: { org1: 'admin' } },
    });
    render(
      <MemoryRouter>
        <ProtectedRoute><p>Content</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render children when unauthenticated', () => {
    mockUseAuth.mockReturnValue({ currentUser: null, loading: false, userProfile: null });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProtectedRoute><p>Content</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('shows spinner when requireOrg=true but userProfile is still null (not yet loaded)', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: '123' },
      loading: false,
      userProfile: null,
    });
    render(
      <MemoryRouter>
        <ProtectedRoute requireOrg><p>Admin content</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('does not render children when requireOrg=true and user has no orgs', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: '123' },
      loading: false,
      userProfile: { organizations: {} },
    });
    render(
      <MemoryRouter>
        <ProtectedRoute requireOrg><p>Admin content</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('renders children when requireOrg=true and user has an org', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: '123' },
      loading: false,
      userProfile: { organizations: { org1: 'admin' } },
    });
    render(
      <MemoryRouter>
        <ProtectedRoute requireOrg><p>Admin content</p></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — the "shows spinner when requireOrg=true but userProfile is still null" test fails because the current code lets the user through.

- [ ] **Step 3: Update `src/components/ProtectedRoute.tsx`**

Replace the entire file with:

```tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrg?: boolean;
}

export function ProtectedRoute({ children, requireOrg = false }: ProtectedRouteProps) {
  const { currentUser, loading, userProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for profile to finish loading before checking org requirement
  if (requireOrg && userProfile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (requireOrg && userProfile && Object.keys(userProfile.organizations).length === 0) {
    return <Navigate to="/setup/organization" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
npm test
```

Expected: PASS — all 6 tests in ProtectedRoute.test.tsx, all 3 in ErrorBoundary.test.tsx

- [ ] **Step 5: Sync and commit**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
git add src/components/ProtectedRoute.tsx src/components/__tests__/ProtectedRoute.test.tsx
git commit -m "fix: hold spinner in ProtectedRoute when requireOrg=true and userProfile not yet loaded"
```

---

## Task 7: P1 — Parallelize Parent Dashboard Reads

**Files:**
- Modify: `src/pages/parent/Dashboard.tsx`

- [ ] **Step 1: Replace the sequential loop in `fetchDetails`**

In `src/pages/parent/Dashboard.tsx`, find the `fetchDetails` async function inside the `useEffect`. Replace the entire function body with:

```ts
async function fetchDetails() {
  if (!currentOrg?.id || signups.length === 0) {
    setSignupsWithDetails([]);
    setLoadingDetails(false);
    return;
  }

  const results = await Promise.all(
    signups.map(async (signup) => {
      try {
        const [eventDoc, slotDoc] = await Promise.all([
          getDoc(doc(db, 'organizations', currentOrg.id, 'events', signup.eventId)),
          getDoc(doc(db, 'organizations', currentOrg.id, 'events', signup.eventId, 'slots', signup.slotId)),
        ]);

        const eventData = eventDoc.data();
        const slotData = slotDoc.data();

        if (!eventData || !slotData) return null;

        let slotTime: string | undefined;
        if (slotData.startTime) {
          const start = (slotData.startTime as Timestamp).toDate();
          slotTime = format(start, 'h:mm a');
          if (slotData.endTime) {
            const end = (slotData.endTime as Timestamp).toDate();
            slotTime += ` - ${format(end, 'h:mm a')}`;
          }
        }

        return {
          ...signup,
          eventTitle: eventData.title,
          eventDate: (eventData.startTime as Timestamp)?.toDate() || new Date(),
          slotName: slotData.name,
          slotTime,
        } as SignupWithDetails;
      } catch (err) {
        console.error('Error fetching signup details:', err);
        return null;
      }
    })
  );

  const details = results.filter((d): d is SignupWithDetails => d !== null);
  details.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  setSignupsWithDetails(details);
  setLoadingDetails(false);
}
```

- [ ] **Step 2: Sync to Pi and verify Parent Dashboard loads correctly**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
```

Log in as a parent user who has signups. The dashboard should load with the same data as before, just faster. Check the browser Network tab — the event and slot reads should fire in parallel (overlapping timing) rather than sequentially.

- [ ] **Step 3: Commit**

```bash
git add src/pages/parent/Dashboard.tsx
git commit -m "perf: parallelize event and slot reads in Parent Dashboard with Promise.all"
```

---

## Task 8: P2 — Parallelize OrgContext Reads

**Files:**
- Modify: `src/contexts/OrgContext.tsx`

- [ ] **Step 1: Replace `fetchOrganizations` body in `src/contexts/OrgContext.tsx`**

Find the `fetchOrganizations` function and replace its entire body with:

```ts
async function fetchOrganizations() {
  if (!userProfile?.organizations) {
    setOrganizations([]);
    setLoading(false);
    return;
  }

  const orgIds = Object.keys(userProfile.organizations);

  const orgDocs = await Promise.all(
    orgIds.map((id) => getDoc(doc(db, 'organizations', id)))
  );

  const orgs: Organization[] = orgDocs
    .filter((orgDoc) => orgDoc.exists())
    .map((orgDoc) => {
      const data = orgDoc.data()!;
      return {
        id: orgDoc.id,
        name: data.name,
        type: data.type,
        ownerId: data.ownerId,
        createdAt: data.createdAt?.toDate() || new Date(),
        branding: data.branding || { primaryColor: '#243c7c' },
        emailSettings: data.emailSettings || {
          sendConfirmations: true,
          sendReminders: true,
          reminderHoursBefore: 24,
        },
      };
    });

  setOrganizations(orgs);

  if (!currentOrg && orgs.length > 0) {
    setCurrentOrg(orgs[0]);
  }

  setLoading(false);
}
```

- [ ] **Step 2: Sync to Pi and verify the app loads and org context works**

```bash
cd "/Users/danielemmons/Desktop/Matside Software/signupsignin-app" && rsync -avz --exclude node_modules --exclude .firebase --exclude dist . emmons_house@192.168.8.198:~/signupsignin-app/
```

Log in as an admin. The admin dashboard should load with the correct org name. The org switcher (if applicable) should still work.

- [ ] **Step 3: Run full test suite one final time**

```bash
npm test
```

Expected: PASS — all 9 tests (3 ErrorBoundary + 6 ProtectedRoute)

- [ ] **Step 4: Commit**

```bash
git add src/contexts/OrgContext.tsx
git commit -m "perf: parallelize org document reads in OrgContext with Promise.all"
```

---

## Final Verification Checklist

After all tasks are complete, do a full manual smoke test on the Pi emulator:

- [ ] App loads at `http://192.168.8.198:5173` — no blank page
- [ ] Login with email/password works (emulator auth)
- [ ] Admin creates an org, event, and slot
- [ ] Public event page loads and shows the slot
- [ ] Parent signs up — succeeds, slot count increments
- [ ] Second parent signs up for a full slot — gets "This slot is full" error
- [ ] Parent cancels signup — slot count decrements correctly
- [ ] Admin event detail shows signups tab with error banner if Firestore is unavailable
- [ ] Parent dashboard loads signups correctly
- [ ] Navigating to `/admin` without an org profile loaded redirects to setup page
