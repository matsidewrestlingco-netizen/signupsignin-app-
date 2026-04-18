# Apple Sign-In & Delete Account — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sign In with Apple to Login/Signup pages and a Delete Account feature on a new parent Account Settings page.

**Architecture:** `signInWithApple()` follows the exact same Firebase `OAuthProvider` + `signInWithPopup` pattern as the existing `signInWithGoogle()`. The new `/parent/settings` page is a standalone React component in the parent route group, accessible via a new Sidebar nav entry. Delete account calls Firebase Auth `deleteUser` and Firestore `deleteDoc` for the user profile, then navigates to `/`. Existing signup records are left untouched.

**Tech Stack:** React 18, TypeScript, Firebase Auth (`OAuthProvider`), Firebase Firestore, Vitest 4, @testing-library/react, @testing-library/user-event

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/contexts/AuthContext.tsx` | Modify | Add `signInWithApple()` and its type |
| `src/pages/Login.tsx` | Modify | Add Apple sign-in button |
| `src/pages/__tests__/Login.test.tsx` | Create | Verify Apple button renders and invokes handler |
| `src/pages/SignUp.tsx` | Modify | Add Apple sign-up button |
| `src/pages/__tests__/SignUp.test.tsx` | Create | Verify Apple button renders and invokes handler |
| `src/pages/parent/AccountSettings.tsx` | Create | Profile card + Danger Zone with delete confirmation modal |
| `src/pages/parent/__tests__/AccountSettings.test.tsx` | Create | TDD for delete account flow |
| `src/App.tsx` | Modify | Register `/parent/settings` route |
| `src/components/Sidebar.tsx` | Modify | Add "Account Settings" to `parentNavItems`; fix `/parent` `end` flag |

---

## Task 1: Add `signInWithApple` to AuthContext

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

- [ ] **Step 1: Add `OAuthProvider` to the Firebase Auth import and add `signInWithApple` to the context type**

In `src/contexts/AuthContext.tsx`, update the import (line 3) and interface (line 24):

```typescript
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
```

```typescript
interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

- [ ] **Step 2: Implement `signInWithApple` (after the `signInWithGoogle` function, ~line 107)**

```typescript
async function signInWithApple() {
  const provider = new OAuthProvider('apple.com');
  const { user } = await signInWithPopup(auth, provider);

  const docRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    await setDoc(docRef, {
      email: user.email,
      name: user.displayName || '',
      createdAt: serverTimestamp(),
      organizations: {},
    });
  }

  await fetchUserProfile(user);
}
```

- [ ] **Step 3: Expose `signInWithApple` in the context value object (~line 154)**

```typescript
const value = {
  currentUser,
  userProfile,
  isSuperAdmin,
  loading,
  signUp,
  logIn,
  signInWithGoogle,
  signInWithApple,
  logOut,
  resetPassword,
  refreshProfile,
};
```

- [ ] **Step 4: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat: add signInWithApple to AuthContext"
```

---

## Task 2: Apple Sign-In Button on Login Page

**Files:**
- Create: `src/pages/__tests__/Login.test.tsx`
- Modify: `src/pages/Login.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/__tests__/Login.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
}));

import { Login } from '../Login';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as ReturnType<typeof vi.fn>;
const mockUseLocation = useLocation as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseNavigate.mockReturnValue(vi.fn());
  mockUseLocation.mockReturnValue({ state: null, pathname: '/login' });
  mockUseAuth.mockReturnValue({
    logIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
  });
});

describe('Login', () => {
  it('renders the Sign in with Apple button', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeInTheDocument();
  });

  it('calls signInWithApple when the Apple button is clicked', async () => {
    const mockSignInWithApple = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      logIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithApple: mockSignInWithApple,
    });
    render(<Login />);
    await userEvent.click(screen.getByRole('button', { name: /sign in with apple/i }));
    expect(mockSignInWithApple).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/pages/__tests__/Login.test.tsx
```

Expected: FAIL — "Unable to find an accessible element with the role 'button' and name /sign in with apple/i"

- [ ] **Step 3: Add the Apple button to `src/pages/Login.tsx`**

First, destructure `signInWithApple` from `useAuth` (line 12):

```typescript
const { logIn, signInWithGoogle, signInWithApple } = useAuth();
```

Then add the Apple button after the Google button (~line 151), inside the form:

```tsx
<button
  type="button"
  disabled={loading}
  onClick={async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithApple();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Apple');
    } finally {
      setLoading(false);
    }
  }}
  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-black text-sm font-medium text-white hover:bg-gray-900 transition-colors"
>
  <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.2-152.3-108.8C27.3 727.5 0 620.3 0 514.7c0-190.6 124.6-291.3 247.3-291.3 65.2 0 119.6 43.8 160.4 43.8 38.9 0 101-46.5 173.1-46.5zm-171.8-100.9C650 206.9 683.6 156 683.6 105.2c0-6.8-.6-14.3-1.2-21.2-59.3 2.3-127.3 42.1-168.3 88.9-36.2 41.9-71.6 101.8-71.6 164.7 0 7.4 1.2 14.8 1.8 17.1 3.5.6 9.3 1.2 15.1 1.2 54.7 0 117.5-36.8 148.9-95.9z"/>
  </svg>
  Sign in with Apple
</button>
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/pages/__tests__/Login.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/Login.tsx src/pages/__tests__/Login.test.tsx
git commit -m "feat: add Apple sign-in button to Login page"
```

---

## Task 3: Apple Sign-Up Button on SignUp Page

**Files:**
- Create: `src/pages/__tests__/SignUp.test.tsx`
- Modify: `src/pages/SignUp.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/__tests__/SignUp.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
}));

import { SignUp } from '../SignUp';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as ReturnType<typeof vi.fn>;
const mockUseLocation = useLocation as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseNavigate.mockReturnValue(vi.fn());
  mockUseLocation.mockReturnValue({ state: null, pathname: '/signup' });
  mockUseAuth.mockReturnValue({
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
  });
});

describe('SignUp', () => {
  it('renders the Sign up with Apple button', () => {
    render(<SignUp />);
    expect(screen.getByRole('button', { name: /sign up with apple/i })).toBeInTheDocument();
  });

  it('calls signInWithApple when the Apple button is clicked', async () => {
    const mockSignInWithApple = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithApple: mockSignInWithApple,
    });
    render(<SignUp />);
    await userEvent.click(screen.getByRole('button', { name: /sign up with apple/i }));
    expect(mockSignInWithApple).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/pages/__tests__/SignUp.test.tsx
```

Expected: FAIL — "Unable to find an accessible element with the role 'button' and name /sign up with apple/i"

- [ ] **Step 3: Add the Apple button to `src/pages/SignUp.tsx`**

Destructure `signInWithApple` from `useAuth` (line 14):

```typescript
const { signUp, signInWithGoogle, signInWithApple } = useAuth();
```

Add the Apple button after the Google button (~line 182), inside the form:

```tsx
<button
  type="button"
  disabled={loading}
  onClick={async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithApple();
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up with Apple');
    } finally {
      setLoading(false);
    }
  }}
  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-black text-sm font-medium text-white hover:bg-gray-900 transition-colors"
>
  <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.2-152.3-108.8C27.3 727.5 0 620.3 0 514.7c0-190.6 124.6-291.3 247.3-291.3 65.2 0 119.6 43.8 160.4 43.8 38.9 0 101-46.5 173.1-46.5zm-171.8-100.9C650 206.9 683.6 156 683.6 105.2c0-6.8-.6-14.3-1.2-21.2-59.3 2.3-127.3 42.1-168.3 88.9-36.2 41.9-71.6 101.8-71.6 164.7 0 7.4 1.2 14.8 1.8 17.1 3.5.6 9.3 1.2 15.1 1.2 54.7 0 117.5-36.8 148.9-95.9z"/>
  </svg>
  Sign up with Apple
</button>
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/pages/__tests__/SignUp.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/SignUp.tsx src/pages/__tests__/SignUp.test.tsx
git commit -m "feat: add Apple sign-up button to SignUp page"
```

---

## Task 4: Account Settings Page with Delete Account

**Files:**
- Create: `src/pages/parent/__tests__/AccountSettings.test.tsx`
- Create: `src/pages/parent/AccountSettings.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/parent/__tests__/AccountSettings.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('firebase/auth', () => ({
  deleteUser: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  deleteDoc: vi.fn(),
  doc: vi.fn(() => 'mock-doc-ref'),
}));

vi.mock('../../../lib/firebase', () => ({
  db: {},
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

import { ParentAccountSettings } from '../AccountSettings';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { deleteUser } from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as ReturnType<typeof vi.fn>;
const mockDeleteUser = deleteUser as ReturnType<typeof vi.fn>;
const mockDeleteDoc = deleteDoc as ReturnType<typeof vi.fn>;
const mockDoc = doc as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteUser.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockDoc.mockReturnValue('mock-doc-ref');
  mockUseNavigate.mockReturnValue(vi.fn());
  mockUseAuth.mockReturnValue({
    currentUser: { uid: 'user-123' },
    userProfile: { name: 'Jane Parent', email: 'jane@example.com' },
    logOut: vi.fn().mockResolvedValue(undefined),
  });
});

describe('ParentAccountSettings', () => {
  it('renders profile name and email', () => {
    render(<ParentAccountSettings />);
    expect(screen.getByText('Jane Parent')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('shows confirmation modal when Delete Account button is clicked', async () => {
    render(<ParentAccountSettings />);
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    expect(screen.getByText('Are you sure you want to delete your account?')).toBeInTheDocument();
  });

  it('hides the confirmation modal when Cancel is clicked', async () => {
    render(<ParentAccountSettings />);
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('calls deleteDoc and deleteUser then navigates to / on confirm', async () => {
    const mockNavigate = vi.fn();
    const mockLogOut = vi.fn().mockResolvedValue(undefined);
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseAuth.mockReturnValue({
      currentUser: { uid: 'user-123' },
      userProfile: { name: 'Jane Parent', email: 'jane@example.com' },
      logOut: mockLogOut,
    });

    render(<ParentAccountSettings />);
    // Open modal
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    // Click confirm (second button with this name — first is the trigger in the card)
    const deleteButtons = screen.getAllByRole('button', { name: /delete account/i });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
      expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'user-123');
      expect(mockDeleteUser).toHaveBeenCalledWith({ uid: 'user-123' });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows re-auth message when auth/requires-recent-login is thrown', async () => {
    const error = Object.assign(new Error('requires-recent-login'), {
      code: 'auth/requires-recent-login',
    });
    mockDeleteDoc.mockRejectedValue(error);

    render(<ParentAccountSettings />);
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    const deleteButtons = screen.getAllByRole('button', { name: /delete account/i });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(
        screen.getByText(/please log out and log back in before deleting your account/i)
      ).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/pages/parent/__tests__/AccountSettings.test.tsx
```

Expected: FAIL — "Cannot find module '../AccountSettings'"

- [ ] **Step 3: Create `src/pages/parent/AccountSettings.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

export function ParentAccountSettings() {
  const { currentUser, userProfile, logOut } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDeleteAccount() {
    if (!currentUser) return;
    setDeleting(true);
    setError('');
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid));
      await deleteUser(currentUser);
      await logOut();
      navigate('/');
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/requires-recent-login') {
        setError('For security, please log out and log back in before deleting your account.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to delete account. Please try again.');
      }
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Account Settings</h1>
        <p className="page-subtitle">Manage your account</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium">Profile</h2>
          </div>
          <div className="card-body space-y-3">
            <div>
              <span className="label">Name</span>
              <p className="mt-1 text-gray-900">{userProfile?.name}</p>
            </div>
            <div>
              <span className="label">Email</span>
              <p className="mt-1 text-gray-900">{userProfile?.email}</p>
            </div>
          </div>
        </div>

        <div className="card border-red-200">
          <div className="card-header">
            <h2 className="text-lg font-medium text-red-700">Danger Zone</h2>
          </div>
          <div className="card-body">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete your account. This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="btn bg-red-600 text-white hover:bg-red-700"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Account</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="btn bg-red-600 text-white hover:bg-red-700"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/pages/parent/__tests__/AccountSettings.test.tsx
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/parent/AccountSettings.tsx src/pages/parent/__tests__/AccountSettings.test.tsx
git commit -m "feat: add AccountSettings page with delete account"
```

---

## Task 5: Wire Up Route and Sidebar Navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Register the `/parent/settings` route in `src/App.tsx`**

Add the import at the top with the other parent page imports (~line 34):

```typescript
import { ParentAccountSettings } from './pages/parent/AccountSettings';
```

Add the route inside the parent `<Route path="/parent">` group, after the `checkin` route (~line 185):

```tsx
<Route path="settings" element={<ParentAccountSettings />} />
```

- [ ] **Step 2: Add "Account Settings" to `parentNavItems` in `src/components/Sidebar.tsx`**

Replace the `parentNavItems` array (lines 13–16):

```typescript
const parentNavItems = [
  { name: 'My Signups', path: '/parent' },
  { name: 'Check In', path: '/parent/checkin' },
  { name: 'Account Settings', path: '/parent/settings' },
];
```

Also update the `end` prop on the NavLink to prevent "My Signups" from staying active on sub-routes. Replace the `end` prop (~line 77):

```tsx
end={item.path === '/platform' || item.path === '/admin' || item.path === '/parent'}
```

- [ ] **Step 3: Run the full test suite to verify no regressions**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Sidebar.tsx
git commit -m "feat: register /parent/settings route and add Account Settings to sidebar nav"
```

---

## Infrastructure Note (for developer)

Before Sign In with Apple works in production, two one-time setup steps are required outside this codebase:

1. **Apple Developer Portal**: Create a Services ID (separate from the iOS app Bundle ID). Enable "Sign In with Apple" on it and add your web domain (`signupsignin.com`) plus the return URL: `https://matsidesystems---signupsignin.web.app/__/auth/handler`

2. **Firebase Console → Authentication → Sign-in method**: Enable Apple, enter the Services ID (e.g. `com.yourcompany.signupsignin.web`), and paste the key ID + private key from your Apple Developer account.

The button will silently fail with a Firebase error until this is configured. Apple sign-in works fine with Google/email sign-in during local development.
