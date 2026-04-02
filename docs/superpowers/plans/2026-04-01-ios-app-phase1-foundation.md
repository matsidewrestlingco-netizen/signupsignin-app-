# SignupSignin iOS App — Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the `signupsignin-mobile` Expo project with Firebase auth, role-based navigation, and working login/signup screens — a runnable skeleton where an admin lands on the admin tab bar and a volunteer lands on the volunteer tab bar.

**Architecture:** Expo Router (file-based routing) with two route groups — `(admin)` and `(volunteer)` — each defining their own tab bar in `_layout.tsx`. The root `_layout.tsx` watches Firebase auth state and redirects to the correct group based on `userProfile.organizations`. All Firebase SDK calls mirror the web app's patterns exactly.

**Tech Stack:** React Native, Expo SDK 51+, Expo Router v3, Firebase JS SDK v10, `@react-native-async-storage/async-storage`, Jest + React Native Testing Library

---

## Firestore Data Model (reference)

```
users/{uid}
  email: string
  name: string
  createdAt: Timestamp
  organizations: Record<string, 'admin' | 'member'>   ← has keys = admin role, empty = volunteer
  superAdmin?: boolean

organizations/{orgId}
  name: string
  type: string
  ownerId: string
  createdAt: Timestamp
  branding?: { primaryColor: string; logoUrl?: string }
  emailSettings?: { sendConfirmations: boolean; sendReminders: boolean; reminderHoursBefore: number }

organizations/{orgId}/events/{eventId}
  title, startTime, endTime?, location, description, isPublic, createdAt

organizations/{orgId}/events/{eventId}/slots/{slotId}
  name, category, quantityTotal, quantityFilled, startTime?, endTime?, description, createdAt

organizations/{orgId}/signups/{signupId}
  eventId, slotId, userId, userName, userEmail, note, checkedIn, checkedInAt?, createdAt

organizations/{orgId}/templates/{templateId}
  name, description, eventTitle, eventDescription, eventLocation, durationHours?, slots: SlotTemplate[], createdAt
```

---

## File Map

| File | Purpose |
|---|---|
| `app.json` | Expo config — scheme, plugins, iOS bundle ID |
| `package.json` | Dependencies + Jest config |
| `tsconfig.json` | TypeScript config with path alias |
| `.env` | Firebase config vars (gitignored) |
| `lib/firebase.ts` | Firebase init with AsyncStorage auth persistence |
| `lib/types.ts` | Shared TypeScript interfaces mirroring web app |
| `contexts/AuthContext.tsx` | Firebase auth state + signUp/logIn/logOut/resetPassword |
| `contexts/OrgContext.tsx` | Organization loading + setCurrentOrg |
| `app/_layout.tsx` | Root layout — wraps providers, handles auth redirect |
| `app/index.tsx` | Entry point redirect |
| `app/(auth)/_layout.tsx` | Auth stack layout (no tab bar) |
| `app/(auth)/login.tsx` | Login screen |
| `app/(auth)/signup.tsx` | Sign up screen |
| `app/(auth)/forgot-password.tsx` | Forgot password screen |
| `app/(admin)/_layout.tsx` | Admin tab bar |
| `app/(admin)/dashboard.tsx` | Admin dashboard placeholder |
| `app/(volunteer)/_layout.tsx` | Volunteer tab bar |
| `app/(volunteer)/dashboard.tsx` | Volunteer dashboard placeholder |
| `components/LoadingScreen.tsx` | Full-screen loading spinner |
| `__tests__/auth.test.tsx` | Auth context unit tests |
| `__tests__/navigation.test.tsx` | Role routing unit tests |

---

## Task 1: Scaffold Expo project and install dependencies

**Files:**
- Create: `signupsignin-mobile/` (new directory, run from parent of desired location)
- Modify: `package.json` (add jest config)
- Create: `tsconfig.json`
- Create: `.env` (gitignored)
- Create: `.gitignore`

- [ ] **Step 1: Create the Expo project**

Run from the directory where you want the project to live (e.g., `~/Desktop/Matside Software/`):

```bash
npx create-expo-app@latest signupsignin-mobile --template blank-typescript
cd signupsignin-mobile
```

Expected: project created with `app.json`, `App.tsx`, `package.json`.

- [ ] **Step 2: Install Expo Router and navigation deps**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

Expected: packages added to `node_modules`, no errors.

- [ ] **Step 3: Install Firebase and storage**

```bash
npx expo install firebase @react-native-async-storage/async-storage
```

- [ ] **Step 4: Install camera, notifications, and calendar**

```bash
npx expo install expo-camera expo-barcode-scanner expo-notifications expo-calendar
```

- [ ] **Step 5: Install QR code display library**

```bash
npx expo install react-native-svg react-native-qrcode-svg
```

- [ ] **Step 6: Install test dependencies**

```bash
npx expo install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 7: Delete the default App.tsx**

```bash
rm App.tsx
```

- [ ] **Step 8: Update package.json**

Replace the `"main"` field and add jest config. Open `package.json` and make these changes:

```json
{
  "main": "expo-router/entry",
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ]
  }
}
```

- [ ] **Step 9: Write tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 10: Write .env**

Copy Firebase config values from the web app's `.env` file (located at `/Users/danielemmons/Desktop/Matside Software/signupsignin-app/.env`). Expo uses `EXPO_PUBLIC_` prefix instead of `VITE_`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=<value from VITE_FIREBASE_API_KEY>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<value from VITE_FIREBASE_AUTH_DOMAIN>
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<value from VITE_FIREBASE_PROJECT_ID>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<value from VITE_FIREBASE_STORAGE_BUCKET>
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<value from VITE_FIREBASE_MESSAGING_SENDER_ID>
EXPO_PUBLIC_FIREBASE_APP_ID=<value from VITE_FIREBASE_APP_ID>
```

- [ ] **Step 11: Write .gitignore**

```
node_modules/
.expo/
dist/
npm-debug.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
.env.local
```

- [ ] **Step 12: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Expo project with dependencies"
```

---

## Task 2: Update app.json and write Firebase lib

**Files:**
- Modify: `app.json`
- Create: `lib/firebase.ts`
- Create: `lib/types.ts`

- [ ] **Step 1: Write the failing test for Firebase initialization**

Create `__tests__/firebase.test.ts`:

```typescript
import { auth, db } from '../lib/firebase';

describe('Firebase initialization', () => {
  it('exports auth instance', () => {
    expect(auth).toBeDefined();
    expect(typeof auth.currentUser).not.toBe('undefined');
  });

  it('exports db instance', () => {
    expect(db).toBeDefined();
    expect(typeof db.type).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/firebase.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../lib/firebase'`

- [ ] **Step 3: Update app.json**

Replace contents of `app.json`:

```json
{
  "expo": {
    "name": "SignupSignin",
    "slug": "signupsignin-mobile",
    "version": "1.0.0",
    "scheme": "signupsignin",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.matsidewrestling.signupsignin"
    },
    "plugins": [
      "expo-router",
      [
        "expo-camera",
        {
          "cameraPermission": "Allow SignupSignin to access your camera to scan volunteer QR codes."
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
          "color": "#1a56db"
        }
      ],
      [
        "expo-calendar",
        {
          "calendarPermission": "Allow SignupSignin to add events to your calendar."
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 4: Create lib/types.ts**

```typescript
// Mirrors web app interfaces exactly

export interface UserProfile {
  email: string;
  name: string;
  createdAt: Date;
  organizations: Record<string, 'admin' | 'member'>;
  superAdmin?: boolean;
}

export interface OrgBranding {
  primaryColor: string;
  logoUrl?: string;
}

export interface EmailSettings {
  sendConfirmations: boolean;
  sendReminders: boolean;
  reminderHoursBefore: number;
}

export interface Organization {
  id: string;
  name: string;
  type: string;
  ownerId: string;
  createdAt: Date;
  branding?: OrgBranding;
  emailSettings?: EmailSettings;
}

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

export interface EventInput {
  title: string;
  startTime: Date;
  endTime?: Date;
  location: string;
  description: string;
  isPublic: boolean;
}

export interface Slot {
  id: string;
  name: string;
  category: string;
  quantityTotal: number;
  quantityFilled: number;
  startTime?: Date;
  endTime?: Date;
  description: string;
  createdAt: Date;
}

export interface SlotInput {
  name: string;
  category: string;
  quantityTotal: number;
  startTime?: Date;
  endTime?: Date;
  description: string;
}

export interface Signup {
  id: string;
  eventId: string;
  slotId: string;
  userId: string;
  userName: string;
  userEmail: string;
  note: string;
  checkedIn: boolean;
  checkedInAt?: Date;
  createdAt: Date;
}

export interface SignupInput {
  eventId: string;
  slotId: string;
  userId: string;
  userName: string;
  userEmail: string;
  note?: string;
}

export interface SlotTemplate {
  name: string;
  category: string;
  quantityTotal: number;
  description: string;
  durationMinutes?: number;
  offsetFromEventStart?: number;
}

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  eventTitle: string;
  eventDescription: string;
  eventLocation: string;
  durationHours?: number;
  slots: SlotTemplate[];
  createdAt: Date;
}
```

- [ ] **Step 5: Create lib/firebase.ts**

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Use initializeAuth with AsyncStorage persistence on first init;
// fall back to getAuth on subsequent calls (e.g., during hot reload)
export const auth = getApps().length > 1
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx jest __tests__/firebase.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/firebase.ts lib/types.ts app.json __tests__/firebase.test.ts
git commit -m "feat: add Firebase initialization and shared types"
```

---

## Task 3: AuthContext

**Files:**
- Create: `contexts/AuthContext.tsx`
- Create: `__tests__/auth.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/auth.test.tsx`:

```typescript
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function TestConsumer() {
  const { loading, currentUser } = useAuth();
  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="user">{currentUser ? currentUser.email : 'null'}</Text>
    </>
  );
}

describe('AuthContext', () => {
  it('renders without crashing and starts in loading state', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });
    // loading may be true initially; component should not throw
    expect(screen.getByTestId('user')).toBeTruthy();
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/auth.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../contexts/AuthContext'`

- [ ] **Step 3: Create contexts/AuthContext.tsx**

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../lib/types';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserProfile(user: User) {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setUserProfile({
        email: data.email,
        name: data.name,
        createdAt: data.createdAt?.toDate() || new Date(),
        organizations: data.organizations || {},
        superAdmin: data.superAdmin || false,
      });
    } else {
      setUserProfile(null);
    }
  }

  async function signUp(email: string, password: string, name: string) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', user.uid), {
      email,
      name,
      createdAt: serverTimestamp(),
      organizations: {},
    });
    await fetchUserProfile(user);
  }

  async function logIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logOut() {
    await signOut(auth);
    setUserProfile(null);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function refreshProfile() {
    if (currentUser) {
      await fetchUserProfile(currentUser);
    }
  }

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      setCurrentUser(user);
      if (user) setLoading(true);
      if (user) {
        try {
          await fetchUserProfile(user);
        } catch {
          if (active) setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/auth.test.tsx --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add contexts/AuthContext.tsx __tests__/auth.test.tsx
git commit -m "feat: add AuthContext with email/password auth"
```

---

## Task 4: OrgContext

**Files:**
- Create: `contexts/OrgContext.tsx`

- [ ] **Step 1: Create contexts/OrgContext.tsx**

```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import type { Organization } from '../lib/types';

interface OrgContextType {
  currentOrg: Organization | null;
  organizations: Organization[];
  loading: boolean;
  setCurrentOrg: (org: Organization | null) => void;
  createOrganization: (name: string, type: string) => Promise<Organization>;
  updateOrganization: (
    orgId: string,
    data: Partial<Pick<Organization, 'name' | 'branding' | 'emailSettings'>>
  ) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

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
      .filter((d) => d.exists())
      .map((d) => {
        const data = d.data()!;
        return {
          id: d.id,
          name: data.name,
          type: data.type,
          ownerId: data.ownerId,
          createdAt: data.createdAt?.toDate() || new Date(),
          branding: data.branding || { primaryColor: '#1a56db' },
          emailSettings: data.emailSettings || {
            sendConfirmations: true,
            sendReminders: true,
            reminderHoursBefore: 24,
          },
        };
      });
    setOrganizations(orgs);
    if (!currentOrg && orgs.length > 0) setCurrentOrg(orgs[0]);
    setLoading(false);
  }

  async function createOrganization(name: string, type: string): Promise<Organization> {
    if (!currentUser) throw new Error('Must be logged in to create an organization');
    const orgRef = await addDoc(collection(db, 'organizations'), {
      name,
      type,
      ownerId: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(
      userRef,
      { organizations: { ...userProfile?.organizations, [orgRef.id]: 'admin' } },
      { merge: true }
    );
    await refreshProfile();
    const newOrg: Organization = {
      id: orgRef.id,
      name,
      type,
      ownerId: currentUser.uid,
      createdAt: new Date(),
    };
    setOrganizations((prev) => [...prev, newOrg]);
    setCurrentOrg(newOrg);
    return newOrg;
  }

  async function updateOrganization(
    orgId: string,
    data: Partial<Pick<Organization, 'name' | 'branding' | 'emailSettings'>>
  ) {
    await setDoc(doc(db, 'organizations', orgId), data, { merge: true });
    setOrganizations((prev) =>
      prev.map((org) => (org.id === orgId ? { ...org, ...data } : org))
    );
    if (currentOrg?.id === orgId) setCurrentOrg({ ...currentOrg, ...data });
  }

  useEffect(() => {
    if (userProfile) {
      fetchOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrg(null);
      setLoading(false);
    }
  }, [userProfile]);

  return (
    <OrgContext.Provider
      value={{
        currentOrg,
        organizations,
        loading,
        setCurrentOrg,
        createOrganization,
        updateOrganization,
        refreshOrganizations: fetchOrganizations,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add contexts/OrgContext.tsx
git commit -m "feat: add OrgContext"
```

---

## Task 5: LoadingScreen component + root layout

**Files:**
- Create: `components/LoadingScreen.tsx`
- Create: `app/_layout.tsx`
- Create: `app/index.tsx`

- [ ] **Step 1: Create components/LoadingScreen.tsx**

```typescript
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1a56db" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
```

- [ ] **Step 2: Create app/_layout.tsx**

```typescript
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { OrgProvider } from '../contexts/OrgContext';
import { LoadingScreen } from '../components/LoadingScreen';

function RootLayoutNav() {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inAdmin = segments[0] === '(admin)';
    const inVolunteer = segments[0] === '(volunteer)';

    if (!currentUser) {
      // Not logged in — send to login
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (!userProfile) return; // Still loading profile

    const isAdmin = Object.keys(userProfile.organizations ?? {}).length > 0;

    if (inAuth) {
      // Logged in and on auth screen — redirect to correct tab bar
      router.replace(isAdmin ? '/(admin)/dashboard' : '/(volunteer)/dashboard');
    } else if (isAdmin && inVolunteer) {
      router.replace('/(admin)/dashboard');
    } else if (!isAdmin && inAdmin) {
      router.replace('/(volunteer)/dashboard');
    }
  }, [currentUser, userProfile, loading, segments]);

  if (loading) return <LoadingScreen />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <OrgProvider>
        <RootLayoutNav />
      </OrgProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 3: Create app/index.tsx**

```typescript
import { Redirect } from 'expo-router';

// Immediately redirect to login; _layout.tsx will handle the real routing
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
```

- [ ] **Step 4: Commit**

```bash
git add components/LoadingScreen.tsx app/_layout.tsx app/index.tsx
git commit -m "feat: add root layout with auth-aware role routing"
```

---

## Task 6: Auth screens

**Files:**
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/login.tsx`
- Create: `app/(auth)/signup.tsx`
- Create: `app/(auth)/forgot-password.tsx`
- Create: `__tests__/login.test.tsx`

- [ ] **Step 1: Write the failing login screen test**

Create `__tests__/login.test.tsx`:

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../app/(auth)/login';

// Mock useAuth so we don't need a real Firebase connection
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    logIn: jest.fn().mockRejectedValue(new Error('auth/invalid-credential')),
    loading: false,
  }),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe('LoginScreen', () => {
  it('shows error when submitting with empty fields', async () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText('Log In'));
    expect(await screen.findByText('Email is required')).toBeTruthy();
  });

  it('shows error when submitting with empty password', async () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@test.com');
    fireEvent.press(screen.getByText('Log In'));
    expect(await screen.findByText('Password is required')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/login.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../app/(auth)/login'`

- [ ] **Step 3: Create app/(auth)/_layout.tsx**

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
```

- [ ] **Step 4: Create app/(auth)/login.tsx**

```typescript
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export function LoginScreen() {
  const { logIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    setSubmitting(true);
    try {
      await logIn(email.trim(), password);
      // _layout.tsx handles redirect after login
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        setError('Invalid email or password.');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>SignupSignin</Text>
        <Text style={styles.subtitle}>Volunteer Event Management</Text>

        <View style={styles.form}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Log In</Text>
            }
          </TouchableOpacity>

          <Link href="/(auth)/forgot-password" style={styles.link}>
            Forgot password?
          </Link>

          <View style={styles.row}>
            <Text style={styles.mutedText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" style={styles.link}>Sign up</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default LoginScreen;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#1a56db' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#bfdbfe', textAlign: 'center', marginTop: 4, marginBottom: 32 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#1a56db',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
  },
  link: { color: '#1a56db', fontSize: 14, fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  mutedText: { color: '#6b7280', fontSize: 14 },
});
```

- [ ] **Step 5: Run login tests to verify they pass**

```bash
npx jest __tests__/login.test.tsx --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 6: Create app/(auth)/signup.tsx**

```typescript
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      await signUp(email.trim(), password, name.trim());
      // _layout.tsx handles redirect
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists.');
      } else {
        setError('Sign up failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join SignupSignin</Text>

        <View style={styles.form}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} autoComplete="name" />

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="Password (min 6 characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />

          <TouchableOpacity style={[styles.button, submitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={styles.mutedText}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.link}>Log in</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#1a56db' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#bfdbfe', textAlign: 'center', marginTop: 4, marginBottom: 32 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 16, color: '#111827' },
  button: { backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 12, backgroundColor: '#fef2f2', padding: 10, borderRadius: 8 },
  link: { color: '#1a56db', fontSize: 14, fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  mutedText: { color: '#6b7280', fontSize: 14 },
});
```

- [ ] **Step 7: Create app/(auth)/forgot-password.tsx**

```typescript
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    setSubmitting(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch {
      setError('Could not send reset email. Check the address and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>Reset Password</Text>
        {sent ? (
          <>
            <Text style={styles.success}>Check your email for a password reset link.</Text>
            <Link href="/(auth)/login" style={styles.link}>Back to login</Link>
          </>
        ) : (
          <View style={styles.form}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TouchableOpacity style={[styles.button, submitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
            </TouchableOpacity>
            <Link href="/(auth)/login" style={[styles.link, { marginTop: 16, textAlign: 'center' }]}>Back to login</Link>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#1a56db' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 32 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 16, color: '#111827' },
  button: { backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 12, backgroundColor: '#fef2f2', padding: 10, borderRadius: 8 },
  success: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  link: { color: '#bfdbfe', fontSize: 14, fontWeight: '500' },
});
```

- [ ] **Step 8: Commit**

```bash
git add app/(auth)/ __tests__/login.test.tsx
git commit -m "feat: add auth screens (login, signup, forgot password)"
```

---

## Task 7: Role-based tab bar skeletons

**Files:**
- Create: `app/(admin)/_layout.tsx`
- Create: `app/(admin)/dashboard.tsx`
- Create: `app/(admin)/events.tsx`
- Create: `app/(admin)/checkin.tsx`
- Create: `app/(admin)/reports.tsx`
- Create: `app/(volunteer)/_layout.tsx`
- Create: `app/(volunteer)/dashboard.tsx`
- Create: `app/(volunteer)/events.tsx`
- Create: `app/(volunteer)/my-signups.tsx`
- Create: `app/(volunteer)/checkin.tsx`

- [ ] **Step 1: Create app/(admin)/_layout.tsx**

```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color }: { name: IoniconsName; color: string }) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function AdminTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1a56db',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#e5e7eb' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-In',
          tabBarIcon: ({ color }) => <TabIcon name="qr-code" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <TabIcon name="bar-chart" color={color} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create placeholder screens for admin tabs**

Create `app/(admin)/dashboard.tsx`:

```typescript
import { View, Text, StyleSheet } from 'react-native';
export default function AdminDashboard() {
  return <View style={s.c}><Text style={s.t}>Admin Dashboard</Text><Text style={s.sub}>Coming in Phase 2</Text></View>;
}
const s = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }, t: { fontSize: 20, fontWeight: '700', color: '#111827' }, sub: { color: '#6b7280', marginTop: 8 } });
```

Create `app/(admin)/events.tsx`:

```typescript
import { View, Text, StyleSheet } from 'react-native';
export default function AdminEvents() {
  return <View style={s.c}><Text style={s.t}>Events</Text></View>;
}
const s = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }, t: { fontSize: 20, fontWeight: '700', color: '#111827' } });
```

Create `app/(admin)/checkin.tsx`:

```typescript
import { View, Text, StyleSheet } from 'react-native';
export default function AdminCheckIn() {
  return <View style={s.c}><Text style={s.t}>Check-In</Text></View>;
}
const s = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }, t: { fontSize: 20, fontWeight: '700', color: '#111827' } });
```

Create `app/(admin)/reports.tsx`:

```typescript
import { View, Text, StyleSheet } from 'react-native';
export default function AdminReports() {
  return <View style={s.c}><Text style={s.t}>Reports</Text></View>;
}
const s = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }, t: { fontSize: 20, fontWeight: '700', color: '#111827' } });
```

- [ ] **Step 3: Create app/(volunteer)/_layout.tsx**

```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color }: { name: IoniconsName; color: string }) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function VolunteerTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#e5e7eb' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-signups"
        options={{
          title: 'My Signups',
          tabBarIcon: ({ color }) => <TabIcon name="checkmark-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-In',
          tabBarIcon: ({ color }) => <TabIcon name="qr-code-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 4: Create placeholder screens for volunteer tabs**

Create `app/(volunteer)/dashboard.tsx`:

```typescript
import { View, Text, StyleSheet } from 'react-native';
export default function VolunteerDashboard() {
  return <View style={s.c}><Text style={s.t}>Volunteer Dashboard</Text><Text style={s.sub}>Coming in Phase 2</Text></View>;
}
const s = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }, t: { fontSize: 20, fontWeight: '700', color: '#111827' }, sub: { color: '#6b7280', marginTop: 8 } });
```

Create `app/(volunteer)/events.tsx`, `app/(volunteer)/my-signups.tsx`, `app/(volunteer)/checkin.tsx` with the same placeholder pattern (swap the title text).

- [ ] **Step 5: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests PASS

- [ ] **Step 6: Start the app and verify routing**

```bash
npx expo start
```

Open Expo Go on your iPhone. Verify:
- App opens to login screen
- After login as admin → lands on Admin Dashboard with 4-tab bar (Dashboard, Events, Check-In, Reports)
- After login as volunteer → lands on Volunteer Dashboard with 4-tab bar (Dashboard, Events, My Signups, Check-In)
- Logging out returns to login screen

- [ ] **Step 7: Commit**

```bash
git add app/(admin)/ app/(volunteer)/
git commit -m "feat: add role-based tab bar skeletons"
```

---

## Phase 1 Complete

At this point you have a working runnable app that:
- Authenticates with Firebase (email/password)
- Detects role from `userProfile.organizations`
- Routes admins to a 4-tab admin bar and volunteers to a 4-tab volunteer bar
- Shows placeholder screens for all tabs
- Passes all unit tests

**Next:** Proceed to Phase 2 (`2026-04-01-ios-app-phase2-admin-screens.md`) to implement the real admin screens.
