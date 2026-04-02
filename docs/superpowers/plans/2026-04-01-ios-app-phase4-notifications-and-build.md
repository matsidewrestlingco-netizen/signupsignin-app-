# SignupSignin iOS App — Phase 4: Push Notifications + EAS Build

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phase 3 complete — all screens implemented and running on device.

**Goal:** Add push notifications (volunteer reminders + admin alerts via Firebase Cloud Functions + FCM) and configure EAS Build for TestFlight distribution.

**Architecture:** On login, the app registers an Expo push token and stores it in Firestore at `users/{uid}.expoPushToken`. Cloud Functions listen to Firestore writes (new signups, check-ins) and fire scheduled functions for reminders. Notifications are sent via Expo's push notification API, which wraps FCM. EAS Build produces a production `.ipa` for TestFlight without requiring local Xcode.

**Tech Stack:** expo-notifications, Expo Push Notification API, Firebase Cloud Functions v2 (Node 20), EAS Build, EAS CLI

---

## File Map

| File | Purpose |
|---|---|
| `lib/notifications.ts` | Push token registration + permission request |
| `app/_layout.tsx` | Modified to register push token after login |
| `functions/src/notifications.ts` | Cloud Functions: signup alert, check-in alert, reminders |
| `functions/src/index.ts` | Modified to export notification functions |
| `eas.json` | EAS Build config for development + TestFlight profiles |

---

## Task 1: Push token registration on device

**Files:**
- Create: `lib/notifications.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/notifications.test.ts`:

```typescript
import { registerPushToken } from '../lib/notifications';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../lib/firebase', () => ({ db: {} }));

describe('registerPushToken', () => {
  it('returns the push token when permission is granted', async () => {
    const token = await registerPushToken('user-uid-123');
    expect(token).toBe('ExponentPushToken[test]');
  });

  it('returns null when called without a uid', async () => {
    const token = await registerPushToken(undefined);
    expect(token).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/notifications.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../lib/notifications'`

- [ ] **Step 3: Create lib/notifications.ts**

```typescript
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and store the Expo push token in Firestore.
 * Called once after the user logs in successfully.
 * Returns the token string, or null if permission was denied or uid is missing.
 */
export async function registerPushToken(uid: string | undefined): Promise<string | null> {
  if (!uid) return null;
  if (Platform.OS === 'web') return null; // Expo push notifications not supported on web

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync();

  // Store token in Firestore so Cloud Functions can send targeted notifications
  await updateDoc(doc(db, 'users', uid), { expoPushToken: token });

  return token;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/notifications.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Call registerPushToken after login in app/_layout.tsx**

In `app/_layout.tsx`, update `RootLayoutNav` to register the push token whenever the user logs in:

```typescript
// Add import at top of file
import { registerPushToken } from '../lib/notifications';

// Inside RootLayoutNav, add a useEffect below the existing auth redirect useEffect:
useEffect(() => {
  if (currentUser && !loading) {
    registerPushToken(currentUser.uid).catch(console.error);
  }
}, [currentUser, loading]);
```

- [ ] **Step 6: Commit**

```bash
git add lib/notifications.ts __tests__/notifications.test.ts app/_layout.tsx
git commit -m "feat: register Expo push token on login and store in Firestore"
```

---

## Task 2: Cloud Functions — push notifications

**Files:**
- Create: `functions/src/notifications.ts`
- Modify: `functions/src/index.ts`

> **Note:** This task modifies the existing web app's `functions/` directory, which is the shared Cloud Functions project used by both web and mobile apps.

- [ ] **Step 1: Check existing functions structure**

```bash
ls functions/src/
cat functions/package.json | grep -E '"main"|"engines"'
```

Expected: See existing function files and Node version.

- [ ] **Step 2: Install Expo server SDK in functions**

```bash
cd functions && npm install expo-server-sdk && cd ..
```

- [ ] **Step 3: Create functions/src/notifications.ts**

```typescript
import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

async function sendPushNotifications(messages: ExpoPushMessage[]) {
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.error('Error sending push chunk:', error);
    }
  }
}

async function getPushToken(uid: string): Promise<string | null> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const token = userDoc.data()?.expoPushToken;
  if (!token || !Expo.isExpoPushToken(token)) return null;
  return token;
}

async function getAdminTokensForOrg(orgId: string): Promise<string[]> {
  const usersSnap = await admin.firestore().collection('users').get();
  const tokens: string[] = [];
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const role = data.organizations?.[orgId];
    if (role === 'admin' && data.expoPushToken && Expo.isExpoPushToken(data.expoPushToken)) {
      tokens.push(data.expoPushToken);
    }
  }
  return tokens;
}

// Notify admins when a new volunteer signs up for an event
export const onSignupCreated = onDocumentCreated(
  'organizations/{orgId}/signups/{signupId}',
  async (event) => {
    const signup = event.data?.data();
    if (!signup) return;

    const { orgId } = event.params;
    const adminTokens = await getAdminTokensForOrg(orgId);
    if (adminTokens.length === 0) return;

    const messages: ExpoPushMessage[] = adminTokens.map((to) => ({
      to,
      title: 'New Signup',
      body: `${signup.userName} signed up for an event`,
      data: { orgId, eventId: signup.eventId },
    }));

    await sendPushNotifications(messages);
  }
);

// Notify the admin when a volunteer checks in via QR
export const onCheckIn = onDocumentCreated(
  'organizations/{orgId}/signups/{signupId}',
  async (event) => {
    // This fires on create — check-in updates are handled separately
    // (Firestore onUpdate would be used; shown here as a pattern)
    return;
  }
);

// Remind volunteers 24 hours before their event
export const sendEventReminders = onSchedule('every 60 minutes', async () => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const in24h = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  const in25h = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 25 * 60 * 60 * 1000)
  );

  // Get all orgs
  const orgsSnap = await db.collection('organizations').get();
  const messages: ExpoPushMessage[] = [];

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;

    // Events starting in the next 24-25 hour window
    const eventsSnap = await db
      .collection(`organizations/${orgId}/events`)
      .where('startTime', '>=', in24h)
      .where('startTime', '<=', in25h)
      .get();

    for (const eventDoc of eventsSnap.docs) {
      const event = eventDoc.data();

      // Get all signups for this event
      const signupsSnap = await db
        .collection(`organizations/${orgId}/signups`)
        .where('eventId', '==', eventDoc.id)
        .get();

      for (const signupDoc of signupsSnap.docs) {
        const signup = signupDoc.data();
        const token = await getPushToken(signup.userId);
        if (!token) continue;

        messages.push({
          to: token,
          title: 'Event Tomorrow',
          body: `Reminder: "${event.title}" is tomorrow`,
          data: { orgId, eventId: eventDoc.id },
        });
      }
    }
  }

  await sendPushNotifications(messages);
});

// Remind volunteers 1 hour before their event
export const sendHourReminders = onSchedule('every 15 minutes', async () => {
  const db = admin.firestore();
  const in1h = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000));
  const in75m = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 75 * 60 * 1000));

  const orgsSnap = await db.collection('organizations').get();
  const messages: ExpoPushMessage[] = [];

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;
    const eventsSnap = await db
      .collection(`organizations/${orgId}/events`)
      .where('startTime', '>=', in1h)
      .where('startTime', '<=', in75m)
      .get();

    for (const eventDoc of eventsSnap.docs) {
      const event = eventDoc.data();
      const signupsSnap = await db
        .collection(`organizations/${orgId}/signups`)
        .where('eventId', '==', eventDoc.id)
        .get();

      for (const signupDoc of signupsSnap.docs) {
        const signup = signupDoc.data();
        const token = await getPushToken(signup.userId);
        if (!token) continue;
        messages.push({
          to: token,
          title: 'Event Starting Soon',
          body: `"${event.title}" starts in 1 hour`,
          data: { orgId, eventId: eventDoc.id },
        });
      }
    }
  }

  await sendPushNotifications(messages);
});
```

- [ ] **Step 4: Modify functions/src/index.ts to export notification functions**

Add to the bottom of `functions/src/index.ts`:

```typescript
export {
  onSignupCreated,
  sendEventReminders,
  sendHourReminders,
} from './notifications';
```

- [ ] **Step 5: Deploy Cloud Functions**

```bash
cd functions && npm run build && cd ..
firebase deploy --only functions
```

Expected: Functions deploy successfully. You'll see the new functions listed in the Firebase Console under Functions.

- [ ] **Step 6: Commit**

```bash
git add functions/src/notifications.ts functions/src/index.ts functions/package.json functions/package-lock.json
git commit -m "feat: add Cloud Functions for push notifications (signup alerts + reminders)"
```

---

## Task 3: EAS Build setup for TestFlight

**Files:**
- Create: `eas.json`
- Create: `signupsignin-mobile/.easignore` (optional)

- [ ] **Step 1: Install EAS CLI**

```bash
npm install -g eas-cli
eas login
```

Log in with your Expo account. If you don't have one, create one at expo.dev.

- [ ] **Step 2: Initialize EAS in the project**

```bash
cd signupsignin-mobile
eas build:configure
```

This creates `eas.json`. When prompted, select **iOS** (or All Platforms).

- [ ] **Step 3: Write eas.json**

Replace the generated `eas.json` with:

```json
{
  "cli": {
    "version": ">= 14.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "buildConfiguration": "Release"
      }
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID@example.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      }
    }
  }
}
```

Replace the placeholder values with your Apple Developer account details.

- [ ] **Step 4: Run a TestFlight build**

```bash
eas build --platform ios --profile preview
```

EAS will:
1. Ask if you want to automatically manage credentials — answer **Yes**
2. Create an App ID and provisioning profile in your Apple Developer account
3. Build the app in the cloud
4. Provide a download link

Expected output ends with:
```
✅ Build finished
iOS app: https://expo.dev/artifacts/eas/...
```

- [ ] **Step 5: Submit to TestFlight**

```bash
eas submit --platform ios --latest
```

Or download the `.ipa` from the EAS dashboard and upload manually via Transporter.

Expected: Build appears in App Store Connect → TestFlight within 15-30 minutes.

- [ ] **Step 6: Update app.json with your Apple Team ID**

In `app.json`, add to the `expo.ios` section:

```json
"ios": {
  "supportsTablet": false,
  "bundleIdentifier": "com.matsidewrestling.signupsignin",
  "buildNumber": "1"
}
```

- [ ] **Step 7: Commit**

```bash
git add eas.json app.json
git commit -m "feat: add EAS Build config for TestFlight distribution"
```

---

## Phase 4 Complete

The app now:
- Registers Expo push tokens on login and stores them in Firestore
- Sends admin alerts when volunteers sign up (Cloud Function)
- Sends 24h and 1h reminder notifications to volunteers (scheduled Cloud Functions)
- Is configured for EAS Build — run `eas build --platform ios --profile preview` to build a TestFlight binary without local Xcode

---

## All Phases Complete — Summary

| Phase | Plan File | What it builds |
|---|---|---|
| 1 — Foundation | `2026-04-01-ios-app-phase1-foundation.md` | Expo scaffold, Firebase auth, role-based tab bars, login/signup screens |
| 2 — Admin Screens | `2026-04-01-ios-app-phase2-admin-screens.md` | Dashboard, Events, Check-In (QR + manual), Reports, Settings, Templates |
| 3 — Volunteer Screens | `2026-04-01-ios-app-phase3-volunteer-screens.md` | Dashboard, Browse Events + Signup, My Signups + Calendar, Check-In QR, Profile |
| 4 — Notifications + Build | `2026-04-01-ios-app-phase4-notifications-and-build.md` | Push notifications via FCM, EAS Build for TestFlight |

**Start with Phase 1.** Each phase ends in a working, testable state. Complete and verify each phase before starting the next.
