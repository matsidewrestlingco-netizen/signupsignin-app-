# Apple App Store Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sign in with Apple and in-app account deletion to satisfy Apple App Store guidelines 4.8 and 5.1.1(v).

**Architecture:** Extend `AuthContext` with two new functions — `signInWithApple` (generates a SHA-256 nonce via `expo-crypto`, presents the native Apple sheet, exchanges the credential with Firebase `OAuthProvider`) and `deleteAccount` (deletes the Firebase Auth user first, then the Firestore user document; signs the user out and re-throws on `requires-recent-login` so the caller owns the UI). Wire both into existing screens: Apple button on the login screen, Delete Account button on the volunteer account screen.

**Tech Stack:** Expo SDK 54, `expo-apple-authentication`, `expo-crypto` (already installed), Firebase Auth `OAuthProvider` + `deleteUser`, Firestore `deleteDoc`, `@testing-library/react-native`, `jest-expo`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Add `expo-apple-authentication` dependency |
| `app.json` | Modify | `usesAppleSignIn: true` under `ios`, add plugin |
| `contexts/AuthContext.tsx` | Modify | Add `signInWithApple`, `deleteAccount`, update interface |
| `app/(auth)/login.tsx` | Modify | Conditional Apple Sign In button + error handler |
| `app/(volunteer)/account.tsx` | Modify | Delete Account button with two-step confirmation |
| `__tests__/auth.test.tsx` | Modify | Add mocks for new native modules to prevent breakage |
| `__tests__/auth.signInWithApple.test.tsx` | Create | Unit tests for `signInWithApple` |
| `__tests__/auth.deleteAccount.test.tsx` | Create | Unit tests for `deleteAccount` |
| `__tests__/login.test.tsx` | Modify | Add tests for Apple button rendering and handler |
| `__tests__/screens/VolunteerAccount.test.tsx` | Modify | Add tests for Delete Account flow |

---

## Task 1: Install expo-apple-authentication and update configuration

**Files:**
- Modify: `package.json`
- Modify: `app.json`

- [ ] **Step 1: Install the package**

```bash
npm install expo-apple-authentication
```

Expected: `expo-apple-authentication` appears in `package.json` dependencies and `node_modules/`.

- [ ] **Step 2: Update app.json — add usesAppleSignIn and plugin**

In `app.json`, add `"usesAppleSignIn": true` inside the `"ios"` object. Add `"expo-apple-authentication"` as the second entry in `"plugins"`.

The `"ios"` section should now include:
```json
"supportsTablet": false,
"bundleIdentifier": "com.matsidewrestling.signupsignin",
"buildNumber": "1",
"usesAppleSignIn": true,
```

The `"plugins"` array should now read:
```json
"plugins": [
  "expo-router",
  "expo-apple-authentication",
  [
    "expo-camera",
    { "cameraPermission": "Allow SignupSignin to access your camera to scan volunteer QR codes." }
  ],
  [
    "expo-notifications",
    { "icon": "./assets/icon.png", "color": "#1a56db" }
  ],
  [
    "expo-calendar",
    { "calendarPermission": "Allow SignupSignin to add events to your calendar." }
  ]
]
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "feat: install expo-apple-authentication and enable usesAppleSignIn"
```

---

## Task 2: Add signInWithApple to AuthContext (TDD)

**Files:**
- Create: `__tests__/auth.signInWithApple.test.tsx`
- Modify: `__tests__/auth.test.tsx`
- Modify: `contexts/AuthContext.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/auth.signInWithApple.test.tsx`:

```typescript
jest.mock('../lib/firebase', () => ({ auth: {}, db: {} }));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth, cb) => { cb(null); return jest.fn(); }),
  signInWithCredential: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  OAuthProvider: jest.fn().mockImplementation(() => ({
    credential: jest.fn().mockReturnValue('apple-credential'),
  })),
  GoogleAuthProvider: { credential: jest.fn() },
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn().mockReturnValue('mock-ref'),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  onSnapshot: jest.fn().mockReturnValue(jest.fn()),
  serverTimestamp: jest.fn().mockReturnValue('ts'),
  deleteDoc: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(32).fill(1)),
  digestStringAsync: jest.fn().mockResolvedValue('hashed-nonce'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
  AppleAuthenticationButtonStyle: { BLACK: 'BLACK' },
}));

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

describe('signInWithApple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { signInAsync } = require('expo-apple-authentication');
    (signInAsync as jest.Mock).mockResolvedValue({
      identityToken: 'id-token',
      fullName: { givenName: 'Jane', familyName: 'Doe' },
      email: 'jane@appleid.com',
    });
    const { signInWithCredential } = require('firebase/auth');
    (signInWithCredential as jest.Mock).mockResolvedValue({
      user: { uid: 'apple-uid', email: 'jane@appleid.com', displayName: null },
    });
  });

  function renderWithCapture() {
    let fn: (() => Promise<void>) | undefined;
    function Capture() {
      fn = useAuth().signInWithApple;
      return <Text>test</Text>;
    }
    render(<AuthProvider><Capture /></AuthProvider>);
    return { getFn: () => fn! };
  }

  it('calls signInAsync with the hashed nonce', async () => {
    const { signInAsync } = require('expo-apple-authentication');
    const { getDoc } = require('firebase/firestore');
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
    const { getFn } = renderWithCapture();
    await act(async () => { await getFn()(); });
    expect(signInAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: 'hashed-nonce' })
    );
  });

  it('creates a Firestore doc for a first-time Apple user', async () => {
    const { getDoc, setDoc } = require('firebase/firestore');
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    const { getFn } = renderWithCapture();
    await act(async () => { await getFn()(); });
    expect(setDoc).toHaveBeenCalledWith(
      'mock-ref',
      expect.objectContaining({ name: 'Jane Doe', email: 'jane@appleid.com' }),
    );
  });

  it('skips Firestore doc creation for a returning Apple user', async () => {
    const { getDoc, setDoc } = require('firebase/firestore');
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => true });
    const { getFn } = renderWithCapture();
    await act(async () => { await getFn()(); });
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('re-throws so the caller can detect ERR_REQUEST_CANCELED', async () => {
    const { signInAsync } = require('expo-apple-authentication');
    const cancelErr = Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' });
    (signInAsync as jest.Mock).mockRejectedValue(cancelErr);
    const { getFn } = renderWithCapture();
    await expect(act(async () => { await getFn()(); })).rejects.toThrow('canceled');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=auth.signInWithApple --watchAll=false
```

Expected: FAIL — `signInWithApple` is not a function (or not in the context).

- [ ] **Step 3: Update imports in contexts/AuthContext.tsx**

Replace the three Firebase import lines at the top of `contexts/AuthContext.tsx`:

```typescript
// Remove these three lines:
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

// Replace with:
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  OAuthProvider,
  deleteUser,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
```

Replace the `firebase/firestore` import line:

```typescript
// Remove:
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Replace with:
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';
```

Add new imports directly after the Firebase imports:

```typescript
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
```

- [ ] **Step 4: Update the AuthContextType interface**

Replace the existing `AuthContextType` interface in `contexts/AuthContext.tsx`:

```typescript
interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: (idToken: string | null, accessToken?: string | null) => Promise<void>;
  signInWithApple: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}
```

- [ ] **Step 5: Add buildAppleNonce helper above AuthProvider**

Add this function directly above the `export function AuthProvider` line:

```typescript
async function buildAppleNonce(): Promise<{ raw: string; hashed: string }> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const raw = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
}
```

- [ ] **Step 6: Add signInWithApple function inside AuthProvider**

Add this function after the `signInWithGoogle` function inside `AuthProvider`:

```typescript
async function signInWithApple() {
  const { raw, hashed } = await buildAppleNonce();
  const appleResult = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashed,
  });
  if (!appleResult.identityToken) throw new Error('Apple sign-in failed: no identity token');
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: appleResult.identityToken, rawNonce: raw });
  const { user } = await signInWithCredential(auth, credential);
  const docRef = doc(db, 'users', user.uid);
  const existing = await getDoc(docRef);
  if (!existing.exists()) {
    const { fullName, email } = appleResult;
    const name = fullName
      ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ')
      : '';
    await setDoc(docRef, {
      email: email ?? user.email ?? '',
      name: name || email ?? user.email ?? '',
      createdAt: serverTimestamp(),
      organizations: {},
      superAdmin: false,
    });
  }
}
```

- [ ] **Step 7: Add placeholder deleteAccount and update the context value**

Add a placeholder `deleteAccount` after `signInWithApple` (will be replaced in Task 4):

```typescript
async function deleteAccount(): Promise<void> {
  throw new Error('not yet implemented');
}
```

Update the `value` object at the bottom of `AuthProvider` to include both new functions:

```typescript
const value: AuthContextType = {
  currentUser,
  userProfile,
  isSuperAdmin: userProfile?.superAdmin === true,
  loading,
  signUp,
  logIn,
  logOut,
  resetPassword,
  refreshProfile,
  signInWithGoogle,
  signInWithApple,
  deleteAccount,
};
```

- [ ] **Step 8: Update __tests__/auth.test.tsx to add missing mocks**

The existing `auth.test.tsx` will now fail because `AuthContext` imports `expo-apple-authentication` and `expo-crypto`, which aren't mocked. Add these mocks to the TOP of `__tests__/auth.test.tsx` (before the existing `jest.mock('../lib/firebase', ...)` line):

```typescript
jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
  AppleAuthenticationButtonStyle: { BLACK: 'BLACK' },
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(32)),
  digestStringAsync: jest.fn().mockResolvedValue('hashed'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));
```

Also update the `firebase/auth` mock in `auth.test.tsx` to include the new functions (add after `sendPasswordResetEmail`):

```typescript
OAuthProvider: jest.fn().mockImplementation(() => ({ credential: jest.fn() })),
GoogleAuthProvider: { credential: jest.fn() },
signInWithCredential: jest.fn(),
deleteUser: jest.fn(),
```

And update the `firebase/firestore` mock in `auth.test.tsx` to include the new functions:

```typescript
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  onSnapshot: jest.fn().mockReturnValue(jest.fn()),
  serverTimestamp: jest.fn(),
  deleteDoc: jest.fn(),
}));
```

- [ ] **Step 9: Run both test files to confirm they pass**

```bash
npm test -- --testPathPattern="auth.test|auth.signInWithApple" --watchAll=false
```

Expected: PASS — all tests in both files green.

- [ ] **Step 10: Commit**

```bash
git add contexts/AuthContext.tsx __tests__/auth.signInWithApple.test.tsx __tests__/auth.test.tsx
git commit -m "feat: add signInWithApple to AuthContext"
```

---

## Task 3: Add Apple Sign In button to login screen (TDD)

**Files:**
- Modify: `__tests__/login.test.tsx`
- Modify: `app/(auth)/login.tsx`

- [ ] **Step 1: Add failing tests to __tests__/login.test.tsx**

Add `signInWithApple` to the existing `useAuth` mock and add `expo-apple-authentication` mock at the top of `__tests__/login.test.tsx`. Replace the file content with:

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../app/(auth)/login';

const mockSignInWithApple = jest.fn();
const mockIsAvailableAsync = jest.fn();

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    logIn: jest.fn().mockRejectedValue(new Error('auth/invalid-credential')),
    signInWithGoogle: jest.fn(),
    signInWithApple: mockSignInWithApple,
    loading: false,
  }),
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  AppleAuthenticationButton: ({
    onPress,
    testID,
  }: {
    onPress: () => void;
    testID?: string;
  }) =>
    React.createElement(
      require('react-native').TouchableOpacity,
      { onPress, testID: testID ?? 'apple-sign-in-btn' },
      React.createElement(require('react-native').Text, null, 'Sign in with Apple')
    ),
  AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
  AppleAuthenticationButtonStyle: { BLACK: 'BLACK' },
}));

describe('LoginScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows error when submitting with empty fields', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    render(<LoginScreen />);
    fireEvent.press(screen.getByText('Log In'));
    expect(await screen.findByText('Email is required')).toBeTruthy();
  });

  it('shows error when submitting with empty password', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@test.com');
    fireEvent.press(screen.getByText('Log In'));
    expect(await screen.findByText('Password is required')).toBeTruthy();
  });

  it('renders the Apple Sign In button when Sign in with Apple is available', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    render(<LoginScreen />);
    expect(await screen.findByTestId('apple-sign-in-btn')).toBeTruthy();
  });

  it('does not render the Apple Sign In button when unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    render(<LoginScreen />);
    await waitFor(() =>
      expect(screen.queryByTestId('apple-sign-in-btn')).toBeNull()
    );
  });

  it('calls signInWithApple when the button is pressed', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockSignInWithApple.mockResolvedValue(undefined);
    render(<LoginScreen />);
    const btn = await screen.findByTestId('apple-sign-in-btn');
    fireEvent.press(btn);
    await waitFor(() => expect(mockSignInWithApple).toHaveBeenCalledTimes(1));
  });

  it('shows no error message when user cancels Apple sign-in', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockSignInWithApple.mockRejectedValue(
      Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' })
    );
    render(<LoginScreen />);
    const btn = await screen.findByTestId('apple-sign-in-btn');
    fireEvent.press(btn);
    await waitFor(() =>
      expect(screen.queryByText('Apple sign-in failed. Please try again.')).toBeNull()
    );
  });

  it('shows error message on non-cancellation Apple sign-in failure', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockSignInWithApple.mockRejectedValue(new Error('network error'));
    render(<LoginScreen />);
    const btn = await screen.findByTestId('apple-sign-in-btn');
    fireEvent.press(btn);
    expect(await screen.findByText('Apple sign-in failed. Please try again.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to confirm the new ones fail**

```bash
npm test -- --testPathPattern=__tests__/login --watchAll=false
```

Expected: The two original tests pass. The four new Apple tests FAIL — button not found.

- [ ] **Step 3: Update app/(auth)/login.tsx**

Add the `expo-apple-authentication` import at the top of the file (after `expo-web-browser`):

```typescript
import * as AppleAuthentication from 'expo-apple-authentication';
```

Add `signInWithApple` to the `useAuth()` destructure (line 29 area). Replace:

```typescript
const { signInWithGoogle } = useAuth();
```

With:

```typescript
const { signInWithGoogle, signInWithApple } = useAuth();
```

Add the `appleAvailable` state after the existing state declarations:

```typescript
const [appleAvailable, setAppleAvailable] = useState(false);
```

Add a `useEffect` to check availability after the existing Google response `useEffect`:

```typescript
useEffect(() => {
  AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
}, []);
```

Add the `handleAppleSignIn` function after `handleSubmit`:

```typescript
async function handleAppleSignIn() {
  setError('');
  setSubmitting(true);
  try {
    await signInWithApple();
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? '';
    if (code !== 'ERR_REQUEST_CANCELED') {
      setError('Apple sign-in failed. Please try again.');
    }
  } finally {
    setSubmitting(false);
  }
}
```

Add the Apple button in the JSX, immediately after the closing `</TouchableOpacity>` of the Google button:

```tsx
{appleAvailable && (
  <AppleAuthentication.AppleAuthenticationButton
    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
    cornerRadius={8}
    style={styles.appleButton}
    onPress={handleAppleSignIn}
    testID="apple-sign-in-btn"
  />
)}
```

Add to the `StyleSheet.create` object:

```typescript
appleButton: {
  width: '100%',
  height: 44,
  marginTop: 12,
},
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npm test -- --testPathPattern=__tests__/login --watchAll=false
```

Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/login.tsx __tests__/login.test.tsx
git commit -m "feat: add Sign in with Apple button to login screen"
```

---

## Task 4: Add deleteAccount to AuthContext (TDD)

**Files:**
- Create: `__tests__/auth.deleteAccount.test.tsx`
- Modify: `contexts/AuthContext.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/auth.deleteAccount.test.tsx`:

```typescript
jest.mock('../lib/firebase', () => ({ auth: {}, db: {} }));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth, cb) => {
    cb({ uid: 'uid-to-delete', email: 'user@test.com', displayName: 'Test' });
    return jest.fn();
  }),
  deleteUser: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  signInWithCredential: jest.fn(),
  OAuthProvider: jest.fn().mockImplementation(() => ({ credential: jest.fn() })),
  GoogleAuthProvider: { credential: jest.fn() },
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn().mockReturnValue('mock-ref'),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  onSnapshot: jest.fn((_ref, cb) => {
    cb({
      exists: () => true,
      data: () => ({
        email: 'user@test.com',
        name: 'Test',
        createdAt: null,
        organizations: {},
        superAdmin: false,
      }),
    });
    return jest.fn();
  }),
  serverTimestamp: jest.fn().mockReturnValue('ts'),
  deleteDoc: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(32)),
  digestStringAsync: jest.fn().mockResolvedValue('hashed'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
  AppleAuthenticationButtonStyle: { BLACK: 'BLACK' },
}));

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function renderWithCapture() {
  let fn: (() => Promise<void>) | undefined;
  function Capture() {
    fn = useAuth().deleteAccount;
    return <Text>test</Text>;
  }
  render(<AuthProvider><Capture /></AuthProvider>);
  return { getFn: () => fn! };
}

describe('deleteAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes the Firebase Auth user before the Firestore doc', async () => {
    const { deleteUser } = require('firebase/auth');
    const { deleteDoc } = require('firebase/firestore');
    (deleteUser as jest.Mock).mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
    const { getFn } = renderWithCapture();
    await act(async () => { await getFn()(); });
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteDoc).toHaveBeenCalledWith('mock-ref');
    const deleteUserOrder = (deleteUser as jest.Mock).mock.invocationCallOrder[0];
    const deleteDocOrder = (deleteDoc as jest.Mock).mock.invocationCallOrder[0];
    expect(deleteUserOrder).toBeLessThan(deleteDocOrder);
  });

  it('signs the user out and re-throws on requires-recent-login', async () => {
    const { deleteUser, signOut } = require('firebase/auth');
    const recentLoginError = Object.assign(
      new Error('Firebase: The user must re-authenticate. (auth/requires-recent-login).'),
      { code: 'auth/requires-recent-login' }
    );
    (deleteUser as jest.Mock).mockRejectedValue(recentLoginError);
    const { getFn } = renderWithCapture();
    await expect(
      act(async () => { await getFn()(); })
    ).rejects.toThrow('requires-recent-login');
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('does not delete the Firestore doc if Auth deletion fails', async () => {
    const { deleteUser } = require('firebase/auth');
    const { deleteDoc } = require('firebase/firestore');
    (deleteUser as jest.Mock).mockRejectedValue(new Error('requires-recent-login'));
    const { getFn } = renderWithCapture();
    await act(async () => {
      try { await getFn()(); } catch { /* expected */ }
    });
    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it('does not sign out for non-recent-login errors', async () => {
    const { deleteUser, signOut } = require('firebase/auth');
    (deleteUser as jest.Mock).mockRejectedValue(new Error('network-request-failed'));
    const { getFn } = renderWithCapture();
    await act(async () => {
      try { await getFn()(); } catch { /* expected */ }
    });
    expect(signOut).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=auth.deleteAccount --watchAll=false
```

Expected: FAIL — `deleteAccount` throws "not yet implemented".

- [ ] **Step 3: Replace the placeholder deleteAccount in contexts/AuthContext.tsx**

Find and replace the placeholder `deleteAccount` function inside `AuthProvider`:

```typescript
// Remove:
async function deleteAccount(): Promise<void> {
  throw new Error('not yet implemented');
}

// Replace with:
async function deleteAccount() {
  if (!currentUser) throw new Error('No user is signed in');
  const uid = currentUser.uid;
  try {
    await deleteUser(currentUser);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('requires-recent-login')) {
      await signOut(auth);
    }
    throw e;
  }
  await deleteDoc(doc(db, 'users', uid));
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=auth.deleteAccount --watchAll=false
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add contexts/AuthContext.tsx __tests__/auth.deleteAccount.test.tsx
git commit -m "feat: add deleteAccount to AuthContext"
```

---

## Task 5: Add Delete Account button to volunteer account screen (TDD)

**Files:**
- Modify: `__tests__/screens/VolunteerAccount.test.tsx`
- Modify: `app/(volunteer)/account.tsx`

- [ ] **Step 1: Add failing tests to __tests__/screens/VolunteerAccount.test.tsx**

Add `deleteAccount` to the existing `useAuth` mock and add three new tests at the end of the `VolunteerAccount` describe block. The updated mock section at the top of the file:

```typescript
const mockLogOut = jest.fn().mockResolvedValue(undefined);
const mockDeleteAccount = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user1' },
    userProfile: { name: 'Alice Smith', email: 'alice@test.com', organizations: {} },
    logOut: mockLogOut,
    deleteAccount: mockDeleteAccount,
  }),
}));
```

Add these tests inside the existing `describe('VolunteerAccount', ...)` block, after the last existing test:

```typescript
it('renders a Delete Account button', () => {
  const { getByText } = render(<VolunteerAccount />);
  expect(getByText('Delete Account')).toBeTruthy();
});

it('shows the first confirmation alert when Delete Account is pressed', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  const { getByText } = render(<VolunteerAccount />);
  fireEvent.press(getByText('Delete Account'));
  expect(alertSpy).toHaveBeenCalledWith(
    'Delete Account',
    'Are you sure? This cannot be undone.',
    expect.any(Array)
  );
});

it('shows the second confirmation alert when first Delete is confirmed', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  const { getByText } = render(<VolunteerAccount />);
  fireEvent.press(getByText('Delete Account'));
  const firstAlertButtons = (alertSpy.mock.calls[0] as unknown[])[2] as Array<{ text: string; style?: string; onPress?: () => void }>;
  const deleteBtn = firstAlertButtons.find(b => b.style === 'destructive');
  deleteBtn!.onPress!();
  expect(alertSpy).toHaveBeenCalledWith(
    'Delete Account',
    'This will permanently delete your account and all your data. This action cannot be reversed.',
    expect.any(Array)
  );
});
```

- [ ] **Step 2: Run tests to confirm the new ones fail**

```bash
npm test -- --testPathPattern=VolunteerAccount --watchAll=false
```

Expected: The existing 8 tests pass. The 3 new Delete Account tests FAIL — "Delete Account" text not found.

- [ ] **Step 3: Update app/(volunteer)/account.tsx**

Add `useState` to the React import:

```typescript
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
```

Add `deleteAccount` to the `useAuth()` destructure:

```typescript
const { userProfile, logOut, deleteAccount } = useAuth();
```

Add the `deleting` state after the `useOrg` line:

```typescript
const [deleting, setDeleting] = useState(false);
```

Add these three handler functions before the `return` statement:

```typescript
function handleDeleteAccount() {
  Alert.alert(
    'Delete Account',
    'Are you sure? This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
    ]
  );
}

function confirmDelete() {
  Alert.alert(
    'Delete Account',
    'This will permanently delete your account and all your data. This action cannot be reversed.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Delete My Account', style: 'destructive', onPress: performDelete },
    ]
  );
}

async function performDelete() {
  setDeleting(true);
  try {
    await deleteAccount();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('requires-recent-login')) {
      Alert.alert(
        'Sign In Required',
        'For security, please sign in again and then delete your account from the Account page.'
      );
    } else {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    }
  } finally {
    setDeleting(false);
  }
}
```

In the JSX, inside the Actions card, add the Delete Account button immediately after the closing `</TouchableOpacity>` of the Sign Out button:

```tsx
<TouchableOpacity
  style={[styles.deleteBtn, deleting && styles.btnDisabled]}
  onPress={handleDeleteAccount}
  disabled={deleting}
  activeOpacity={0.8}
>
  <Text style={styles.deleteBtnText}>Delete Account</Text>
</TouchableOpacity>
```

Add to `StyleSheet.create`:

```typescript
deleteBtn: {
  borderWidth: 1,
  borderColor: '#dc2626',
  borderRadius: 10,
  paddingVertical: 14,
  alignItems: 'center',
  marginTop: 12,
},
deleteBtnText: {
  color: '#dc2626',
  fontSize: 15,
  fontWeight: '600',
},
btnDisabled: {
  opacity: 0.5,
},
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npm test -- --testPathPattern=VolunteerAccount --watchAll=false
```

Expected: PASS — all 11 tests green.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npm test -- --watchAll=false
```

Expected: All tests pass. If any test fails, investigate before continuing — do not proceed to commit with failing tests.

- [ ] **Step 6: Commit**

```bash
git add app/(volunteer)/account.tsx __tests__/screens/VolunteerAccount.test.tsx
git commit -m "feat: add Delete Account flow to volunteer account screen"
```

---

## Task 6: Manual configuration checklist

These steps cannot be automated. They must be completed in the Apple Developer and Firebase consoles before submitting to the App Store. Check each off once done.

- [ ] **Step 1: Enable Sign in with Apple in Apple Developer portal**

Go to [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles → Identifiers → Select `com.matsidewrestling.signupsignin` → Scroll to "Sign In with Apple" → Enable → Save.

- [ ] **Step 2: Create a Services ID for Apple OAuth redirect**

In Apple Developer portal → Identifiers → Click "+" → Select "Services IDs" → Continue. Set identifier (e.g. `com.matsidewrestling.signupsignin.service`). After creating, click on it → Enable "Sign In with Apple" → Configure → set primary App ID to `com.matsidewrestling.signupsignin` → Add your Firebase OAuth redirect domain (found in the next step) → Save.

- [ ] **Step 3: Create an Apple private key**

In Apple Developer portal → Keys → Click "+" → Name it (e.g. "Firebase Sign in with Apple") → Enable "Sign In with Apple" → Configure → set primary App ID to `com.matsidewrestling.signupsignin` → Save → Register → Download the `.p8` key file (you can only download this once).

- [ ] **Step 4: Configure Apple as a Firebase Auth provider**

Go to Firebase console → Authentication → Sign-in method → Add new provider → Apple.

Enter:
- **Services ID**: the identifier from Step 2 (e.g. `com.matsidewrestling.signupsignin.service`)
- **Apple Team ID**: found at the top right of developer.apple.com (10-character code)
- **Key ID**: the key ID shown when you created the key in Step 3
- **Private key**: paste the full contents of the `.p8` file downloaded in Step 3

Copy the **OAuth redirect URL** that Firebase shows you — you need to add this to the Services ID configuration in Step 2 if you haven't already. Save.

- [ ] **Step 5: Update App Store Connect screenshots**

Per Apple's review feedback, update the login screen screenshots in App Store Connect to include the Sign in with Apple button before resubmitting.
