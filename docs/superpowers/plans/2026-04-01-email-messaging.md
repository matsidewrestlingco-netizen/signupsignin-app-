# Email Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy Firebase Cloud Functions (Gen 2) with Resend to send signup confirmation and reminder emails, with admin controls for test email and manual reminder blast.

**Architecture:** Four Gen 2 Cloud Functions handle all email sending server-side via the Resend SDK. The Resend API key lives in Firebase Secret Manager, injected at runtime via `defineSecret`. Two React UI additions (Settings test email button, EventDetail Send Reminder button) call the callable functions via `httpsCallable`.

**Tech Stack:** Firebase Cloud Functions v2 (`firebase-functions/v2`), Resend Node.js SDK (`resend`), Firebase Secret Manager, React + TypeScript, Vitest + Testing Library

---

## File Map

| File | Change |
|------|--------|
| `functions/package.json` | Remove `nodemailer` + `@types/nodemailer`, add `resend` |
| `functions/src/index.ts` | Full rewrite: Gen 1 → Gen 2, nodemailer → Resend |
| `firebase.json` | Add `functions` source + functions emulator on port 5001 |
| `src/lib/firebase.ts` | Add `getFunctions` + `connectFunctionsEmulator` |
| `src/pages/admin/Settings.tsx` | Add test email input + button in Email Notifications card |
| `src/pages/admin/EventDetail.tsx` | Add "Send Reminder" button in header button row |
| `src/pages/admin/__tests__/Settings.email.test.tsx` | New: component test for test email button |

---

### Task 1: Update functions/package.json — swap nodemailer for Resend

**Files:**
- Modify: `functions/package.json`

- [ ] **Step 1: Replace the file contents**

```json
{
  "name": "signupsignin-functions",
  "version": "1.0.0",
  "description": "Firebase Cloud Functions for SignupSignin",
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "dependencies": {
    "firebase-admin": "^11.11.0",
    "firebase-functions": "^4.5.0",
    "resend": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  },
  "private": true
}
```

- [ ] **Step 2: Install the updated dependencies**

Run from the repo root:
```bash
cd functions && npm install && cd ..
```

Expected: `resend` appears in `functions/node_modules/resend/`, `nodemailer` is gone.

- [ ] **Step 3: Commit**

```bash
git add functions/package.json functions/package-lock.json
git commit -m "chore: swap nodemailer for resend in functions"
```

---

### Task 2: Rewrite functions/src/index.ts — Gen 2 + Resend

**Files:**
- Modify: `functions/src/index.ts`

**Context:** The existing file uses the Gen 1 API (`functions.firestore.document(...).onCreate(...)`, `functions.pubsub.schedule(...).onRun(...)`, `functions.https.onCall(...)`). We're replacing all of that with the Gen 2 equivalents from `firebase-functions/v2/*`. The logic stays the same — only the wrappers and the email-sending library change.

The `defineSecret('RESEND_API_KEY')` call at module level declares a reference to the secret. The actual value is only available inside the function body via `.value()`. Each function that needs the secret must list it in `secrets: [resendApiKey]`.

The `buildReminderHtml` helper is extracted so both `sendReminderEmails` and `sendEventReminderBlast` share the same email template without duplication.

- [ ] **Step 1: Replace the entire file**

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

admin.initializeApp();
const db = admin.firestore();

const resendApiKey = defineSecret('RESEND_API_KEY');
const FROM_ADDRESS = 'noreply@alerts.signupsignin.com';

interface SignupData {
  eventId: string;
  slotId: string;
  userId: string;
  userName: string;
  userEmail: string;
  note?: string;
  reminderSent?: boolean;
}

interface EventData {
  title: string;
  startTime: admin.firestore.Timestamp;
  location?: string;
  description?: string;
}

interface SlotData {
  name: string;
  category: string;
  startTime?: admin.firestore.Timestamp;
  endTime?: admin.firestore.Timestamp;
}

interface OrgData {
  name: string;
  emailSettings?: {
    sendConfirmations: boolean;
    sendReminders: boolean;
    reminderHoursBefore: number;
  };
}

function formatReminderSubject(eventTitle: string, hours: number): string {
  if (hours === 24) return `Reminder: ${eventTitle} is tomorrow!`;
  if (hours < 24) return `Reminder: ${eventTitle} is in ${hours} hours`;
  const days = Math.round(hours / 24);
  return `Reminder: ${eventTitle} is in ${days} days`;
}

function buildReminderHtml(
  userName: string,
  orgName: string,
  eventTitle: string,
  formattedDate: string,
  formattedTime: string,
  location: string | undefined,
  slotName: string | undefined,
  slotCategory: string | undefined
): string {
  return `
    <h2>Reminder: You're signed up!</h2>
    <p>Hi ${userName},</p>
    <p>This is a friendly reminder about your upcoming volunteer commitment:</p>
    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <strong style="font-size: 18px;">${eventTitle}</strong><br/>
      <span style="color: #666;">
        ${formattedDate} at ${formattedTime}<br/>
        ${location ? `Location: ${location}<br/>` : ''}
        ${slotName ? `Your role: ${slotName}${slotCategory ? ` (${slotCategory})` : ''}` : ''}
      </span>
    </div>
    <p>We look forward to seeing you there!</p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
    <p style="color: #999; font-size: 12px;">
      This reminder was sent by ${orgName} via SignupSignin.
    </p>
  `;
}

// Send confirmation email when a signup is created
export const onSignupCreated = onDocumentCreated(
  {
    document: 'organizations/{orgId}/signups/{signupId}',
    secrets: [resendApiKey],
  },
  async (event) => {
    const { orgId } = event.params;
    const signup = event.data?.data() as SignupData | undefined;
    if (!signup) return;

    try {
      const orgDoc = await db.doc(`organizations/${orgId}`).get();
      const org = orgDoc.data() as OrgData | undefined;

      if (!org?.emailSettings?.sendConfirmations) {
        console.log('Confirmation emails disabled for org:', orgId);
        return;
      }

      const eventDoc = await db
        .doc(`organizations/${orgId}/events/${signup.eventId}`)
        .get();
      const eventData = eventDoc.data() as EventData | undefined;
      if (!eventData) {
        console.error('Event not found:', signup.eventId);
        return;
      }

      const slotDoc = await db
        .doc(`organizations/${orgId}/events/${signup.eventId}/slots/${signup.slotId}`)
        .get();
      const slot = slotDoc.data() as SlotData | undefined;

      const eventDate = eventData.startTime.toDate();
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const slotTime = slot?.startTime
        ? slot.startTime.toDate().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        : '';

      const resend = new Resend(resendApiKey.value());
      await resend.emails.send({
        from: `${org.name} via SignupSignin <${FROM_ADDRESS}>`,
        to: signup.userEmail,
        subject: `Signup Confirmation: ${eventData.title}`,
        html: `
          <h2>You're signed up!</h2>
          <p>Hi ${signup.userName},</p>
          <p>This confirms your signup for:</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <strong style="font-size: 18px;">${eventData.title}</strong><br/>
            <span style="color: #666;">
              ${formattedDate}${slotTime ? ` at ${slotTime}` : ''}<br/>
              ${eventData.location ? `Location: ${eventData.location}<br/>` : ''}
              ${slot ? `Role: ${slot.name} (${slot.category})` : ''}
            </span>
          </div>
          <p>We'll send you a reminder before the event.</p>
          <p>Thank you for volunteering!</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px;">
            This email was sent by ${org.name} via SignupSignin.
          </p>
        `,
      });

      console.log('Confirmation email sent to:', signup.userEmail);
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  }
);

// Scheduled function to send reminder emails (runs every hour)
export const sendReminderEmails = onSchedule(
  {
    schedule: 'every 1 hours',
    secrets: [resendApiKey],
  },
  async () => {
    const now = new Date();
    const resend = new Resend(resendApiKey.value());

    try {
      const orgsSnapshot = await db
        .collection('organizations')
        .where('emailSettings.sendReminders', '==', true)
        .get();

      for (const orgDoc of orgsSnapshot.docs) {
        const org = orgDoc.data() as OrgData;
        const orgId = orgDoc.id;
        const reminderHours = org.emailSettings?.reminderHoursBefore ?? 24;

        const windowStart = new Date(
          now.getTime() + (reminderHours - 1) * 60 * 60 * 1000
        );
        const windowEnd = new Date(
          now.getTime() + reminderHours * 60 * 60 * 1000
        );

        const eventsSnapshot = await db
          .collection(`organizations/${orgId}/events`)
          .where('startTime', '>=', admin.firestore.Timestamp.fromDate(windowStart))
          .where('startTime', '<=', admin.firestore.Timestamp.fromDate(windowEnd))
          .get();

        for (const eventDoc of eventsSnapshot.docs) {
          const eventData = eventDoc.data() as EventData;
          const eventId = eventDoc.id;

          const signupsSnapshot = await db
            .collection(`organizations/${orgId}/signups`)
            .where('eventId', '==', eventId)
            .where('reminderSent', '!=', true)
            .get();

          for (const signupDoc of signupsSnapshot.docs) {
            const signup = signupDoc.data() as SignupData;

            const slotDoc = await db
              .doc(
                `organizations/${orgId}/events/${eventId}/slots/${signup.slotId}`
              )
              .get();
            const slot = slotDoc.data() as SlotData | undefined;

            const eventDate = eventData.startTime.toDate();
            const formattedDate = eventDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            const formattedTime = eventDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            try {
              await resend.emails.send({
                from: `${org.name} via SignupSignin <${FROM_ADDRESS}>`,
                to: signup.userEmail,
                subject: formatReminderSubject(eventData.title, reminderHours),
                html: buildReminderHtml(
                  signup.userName,
                  org.name,
                  eventData.title,
                  formattedDate,
                  formattedTime,
                  eventData.location,
                  slot?.name,
                  slot?.category
                ),
              });

              console.log('Reminder email sent to:', signup.userEmail);
              await signupDoc.ref.update({ reminderSent: true });
            } catch (emailError) {
              console.error(
                'Error sending reminder to:',
                signup.userEmail,
                emailError
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in sendReminderEmails:', error);
    }
  }
);

// HTTP callable to send a test email from the admin Settings page
export const sendTestEmail = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const { orgId, email } = request.data as { orgId: string; email: string };

    const userDoc = await db.doc(`users/${request.auth.uid}`).get();
    const userData = userDoc.data();

    if (!userData?.organizations?.[orgId]) {
      throw new HttpsError(
        'permission-denied',
        'Not a member of this organization'
      );
    }

    const orgDoc = await db.doc(`organizations/${orgId}`).get();
    const org = orgDoc.data() as OrgData | undefined;
    if (!org) {
      throw new HttpsError('not-found', 'Organization not found');
    }

    const resend = new Resend(resendApiKey.value());
    await resend.emails.send({
      from: `${org.name} via SignupSignin <${FROM_ADDRESS}>`,
      to: email,
      subject: 'Test Email from SignupSignin',
      html: `
        <h2>Test Email</h2>
        <p>Email notifications are working correctly for <strong>${org.name}</strong>.</p>
        <p>Your volunteers will receive signup confirmations and event reminders.</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">
          This test was sent by ${org.name} via SignupSignin.
        </p>
      `,
    });

    return { success: true };
  }
);

// HTTP callable to blast a reminder to all signups for a specific event
export const sendEventReminderBlast = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const { orgId, eventId } = request.data as {
      orgId: string;
      eventId: string;
    };

    const userDoc = await db.doc(`users/${request.auth.uid}`).get();
    const userData = userDoc.data();

    if (userData?.organizations?.[orgId] !== 'admin') {
      throw new HttpsError(
        'permission-denied',
        'Must be an admin of this organization'
      );
    }

    const orgDoc = await db.doc(`organizations/${orgId}`).get();
    const org = orgDoc.data() as OrgData | undefined;
    if (!org) {
      throw new HttpsError('not-found', 'Organization not found');
    }

    const eventDoc = await db
      .doc(`organizations/${orgId}/events/${eventId}`)
      .get();
    const eventData = eventDoc.data() as EventData | undefined;
    if (!eventData) {
      throw new HttpsError('not-found', 'Event not found');
    }

    const signupsSnapshot = await db
      .collection(`organizations/${orgId}/signups`)
      .where('eventId', '==', eventId)
      .get();

    const resend = new Resend(resendApiKey.value());
    let sent = 0;

    const eventDate = eventData.startTime.toDate();
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    for (const signupDoc of signupsSnapshot.docs) {
      const signup = signupDoc.data() as SignupData;

      const slotDoc = await db
        .doc(`organizations/${orgId}/events/${eventId}/slots/${signup.slotId}`)
        .get();
      const slot = slotDoc.data() as SlotData | undefined;

      try {
        await resend.emails.send({
          from: `${org.name} via SignupSignin <${FROM_ADDRESS}>`,
          to: signup.userEmail,
          subject: `Reminder: ${eventData.title}`,
          html: buildReminderHtml(
            signup.userName,
            org.name,
            eventData.title,
            formattedDate,
            formattedTime,
            eventData.location,
            slot?.name,
            slot?.category
          ),
        });
        sent++;
      } catch (emailError) {
        console.error(
          'Error sending blast reminder to:',
          signup.userEmail,
          emailError
        );
      }
    }

    return { sent };
  }
);
```

- [ ] **Step 2: Build to verify TypeScript compiles**

```bash
cd functions && npm run build && cd ..
```

Expected output ends with something like:
```
Functions build successful
```
No TypeScript errors. If you see `Cannot find module 'resend'`, make sure you ran `npm install` in Task 1 first.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: rewrite cloud functions with Gen 2 API and Resend"
```

---

### Task 3: Update firebase.json — add functions + emulator

**Files:**
- Modify: `firebase.json`

- [ ] **Step 1: Replace the file contents**

```json
{
  "functions": {
    "source": "functions"
  },
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
    "functions": { "port": 5001, "host": "0.0.0.0" },
    "ui": { "enabled": true, "port": 4000, "host": "0.0.0.0" }
  }
}
```

- [ ] **Step 2: Verify firebase CLI recognizes the functions config**

```bash
npx firebase deploy --only functions --dry-run 2>&1 | head -20
```

Expected: No "functions source directory not found" errors. You'll likely see an auth prompt or a dry-run summary.

- [ ] **Step 3: Commit**

```bash
git add firebase.json
git commit -m "chore: add functions config and emulator to firebase.json"
```

---

### Task 4: Add Firebase Functions to src/lib/firebase.ts

**Files:**
- Modify: `src/lib/firebase.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

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
export const functions = getFunctions(app);

if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  const host = import.meta.env.VITE_EMULATOR_HOST || 'localhost';
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectFunctionsEmulator(functions, host, 5001);
}

export default app;
```

- [ ] **Step 2: Verify the frontend still builds**

```bash
npm run build
```

Expected: Clean build, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebase.ts
git commit -m "feat: add Firebase Functions client initialization"
```

---

### Task 5: Add test email button to Admin Settings

**Files:**
- Modify: `src/pages/admin/Settings.tsx`
- Create: `src/pages/admin/__tests__/Settings.email.test.tsx`

**Context:** The existing Settings page at `src/pages/admin/Settings.tsx` already has an Email Notifications card with toggle switches and a reminder hours selector. We're adding a "Send Test Email" row at the bottom of that card, above the existing amber warning note. The test email button calls the `sendTestEmail` Cloud Function via `httpsCallable`. We pre-fill the input with the logged-in user's email.

- [ ] **Step 1: Write the failing test**

Create `src/pages/admin/__tests__/Settings.email.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock all external dependencies before importing the component
vi.mock('../../../contexts/OrgContext', () => ({
  useOrg: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

vi.mock('../../../lib/firebase', () => ({
  functions: {},
}));

import { AdminSettings } from '../Settings';
import { useOrg } from '../../../contexts/OrgContext';
import { useAuth } from '../../../contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';

const mockUseOrg = useOrg as ReturnType<typeof vi.fn>;
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockHttpsCallable = httpsCallable as ReturnType<typeof vi.fn>;

const mockOrg = {
  id: 'org1',
  name: 'Test Org',
  branding: { primaryColor: '#243c7c' },
  emailSettings: {
    sendConfirmations: true,
    sendReminders: true,
    reminderHoursBefore: 24,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseOrg.mockReturnValue({
    currentOrg: mockOrg,
    updateOrganization: vi.fn().mockResolvedValue(undefined),
    loading: false,
  });
  mockUseAuth.mockReturnValue({
    currentUser: { email: 'admin@test.com', uid: 'user1' },
  });
});

describe('AdminSettings — test email button', () => {
  it('renders the Send Test button', () => {
    render(<AdminSettings />);
    expect(screen.getByRole('button', { name: /send test/i })).toBeInTheDocument();
  });

  it('pre-fills the test email input with the current user email', () => {
    render(<AdminSettings />);
    const input = screen.getByPlaceholderText('your@email.com') as HTMLInputElement;
    expect(input.value).toBe('admin@test.com');
  });

  it('calls sendTestEmail callable with orgId and email on click', async () => {
    const mockSendFn = vi.fn().mockResolvedValue({ data: { success: true } });
    mockHttpsCallable.mockReturnValue(mockSendFn);

    render(<AdminSettings />);
    fireEvent.click(screen.getByRole('button', { name: /send test/i }));

    await waitFor(() => {
      expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'sendTestEmail');
      expect(mockSendFn).toHaveBeenCalledWith({
        orgId: 'org1',
        email: 'admin@test.com',
      });
    });
  });

  it('shows success message after sending', async () => {
    const mockSendFn = vi.fn().mockResolvedValue({ data: { success: true } });
    mockHttpsCallable.mockReturnValue(mockSendFn);

    render(<AdminSettings />);
    fireEvent.click(screen.getByRole('button', { name: /send test/i }));

    await waitFor(() => {
      expect(screen.getByText(/test email sent successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error message if callable throws', async () => {
    const mockSendFn = vi.fn().mockRejectedValue(new Error('Network error'));
    mockHttpsCallable.mockReturnValue(mockSendFn);

    render(<AdminSettings />);
    fireEvent.click(screen.getByRole('button', { name: /send test/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('disables the button while sending', async () => {
    let resolve: (v: unknown) => void;
    const mockSendFn = vi.fn().mockReturnValue(new Promise((r) => { resolve = r; }));
    mockHttpsCallable.mockReturnValue(mockSendFn);

    render(<AdminSettings />);
    const button = screen.getByRole('button', { name: /send test/i });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    resolve!({ data: { success: true } });
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- Settings.email
```

Expected: FAIL — `AdminSettings` doesn't have the test email UI yet.

- [ ] **Step 3: Implement the test email button in Settings.tsx**

Open `src/pages/admin/Settings.tsx`. Make the following changes:

**Add imports** at the top of the file (after existing imports):
```tsx
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
```

**Add state** inside the `AdminSettings` function, after the existing `const { currentOrg, updateOrganization } = useOrg();` line:
```tsx
const { currentUser } = useAuth();
const [testEmail, setTestEmail] = useState(currentUser?.email || '');
const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
const [testEmailError, setTestEmailError] = useState('');
```

**Add handler** inside the `AdminSettings` function, after the `handleSubmit` function:
```tsx
const handleSendTestEmail = async () => {
  if (!currentOrg || !testEmail) return;
  setTestEmailStatus('sending');
  setTestEmailError('');

  try {
    const sendTest = httpsCallable(functions, 'sendTestEmail');
    await sendTest({ orgId: currentOrg.id, email: testEmail });
    setTestEmailStatus('success');
  } catch (err) {
    setTestEmailStatus('error');
    setTestEmailError(err instanceof Error ? err.message : 'Failed to send test email');
  }
};
```

**Add UI** inside the Email Notifications card, between the `{sendReminders && ...}` block and the existing amber `<div className="mt-4 p-4 bg-amber-50 ...">` note:
```tsx
<div className="border-t border-gray-200 pt-4">
  <label className="font-medium text-gray-900">Send Test Email</label>
  <p className="text-sm text-gray-500 mb-2">
    Verify email notifications are working
  </p>
  <div className="flex gap-2">
    <input
      type="email"
      value={testEmail}
      onChange={(e) => setTestEmail(e.target.value)}
      placeholder="your@email.com"
      className="input flex-1"
    />
    <button
      type="button"
      disabled={testEmailStatus === 'sending' || !testEmail}
      onClick={handleSendTestEmail}
      className="btn-secondary whitespace-nowrap"
    >
      {testEmailStatus === 'sending' ? 'Sending...' : 'Send Test'}
    </button>
  </div>
  {testEmailStatus === 'success' && (
    <p className="text-sm text-green-600 mt-1">Test email sent successfully!</p>
  )}
  {testEmailStatus === 'error' && (
    <p className="text-sm text-red-600 mt-1">{testEmailError}</p>
  )}
</div>
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- Settings.email
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Verify the frontend still builds**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/Settings.tsx src/pages/admin/__tests__/Settings.email.test.tsx
git commit -m "feat: add test email button to admin settings"
```

---

### Task 6: Add Send Reminder button to Admin Event Detail

**Files:**
- Modify: `src/pages/admin/EventDetail.tsx`

**Context:** The Event Detail page header already has a row of buttons: Day-Of Roster, Save as Template, Edit, Delete. We're adding a "Send Reminder" button between "Save as Template" and "Edit". It calls `sendEventReminderBlast` and shows a brief status message below the page header. It's disabled when `signups.length === 0` (no one to send to) or while the callable is in-flight.

The component is too complex to unit test in isolation (it has 8+ mocked dependencies). Manual verification is the test here.

- [ ] **Step 1: Add imports** at the top of `src/pages/admin/EventDetail.tsx`, after the existing imports:

```tsx
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';
```

- [ ] **Step 2: Add state** inside `AdminEventDetail`, after the existing `const [savingTemplate, setSavingTemplate] = useState(false);` line:

```tsx
const [sendingReminder, setSendingReminder] = useState(false);
const [reminderStatus, setReminderStatus] = useState('');
```

- [ ] **Step 3: Add handler** inside `AdminEventDetail`, after the `handleSaveAsTemplate` function:

```tsx
const handleSendReminder = async () => {
  if (!currentOrg?.id || !eventId) return;
  setSendingReminder(true);
  setReminderStatus('');

  try {
    const blast = httpsCallable<
      { orgId: string; eventId: string },
      { sent: number }
    >(functions, 'sendEventReminderBlast');
    const result = await blast({ orgId: currentOrg.id, eventId });
    const n = result.data.sent;
    setReminderStatus(`Reminder sent to ${n} volunteer${n !== 1 ? 's' : ''}`);
  } catch (err) {
    setReminderStatus(
      err instanceof Error ? err.message : 'Failed to send reminder'
    );
  } finally {
    setSendingReminder(false);
  }
};
```

- [ ] **Step 4: Add the button** in the header button row in the JSX. Find the existing:

```tsx
<button onClick={openTemplateModal} className="btn-secondary">Save as Template</button>
<button onClick={openEditModal} className="btn-secondary">Edit</button>
```

Replace with:

```tsx
<button onClick={openTemplateModal} className="btn-secondary">Save as Template</button>
<button
  onClick={handleSendReminder}
  disabled={sendingReminder || signups.length === 0}
  className="btn-secondary"
>
  {sendingReminder ? 'Sending...' : 'Send Reminder'}
</button>
<button onClick={openEditModal} className="btn-secondary">Edit</button>
```

- [ ] **Step 5: Add the status message** in the JSX. Find the existing error banner:

```tsx
{(slotsError || signupsError) && (
```

Add this block **directly above** it:

```tsx
{reminderStatus && (
  <div
    className={`mb-4 p-3 rounded-md text-sm ${
      reminderStatus.startsWith('Reminder sent')
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-red-50 text-red-700 border border-red-200'
    }`}
  >
    {reminderStatus}
  </div>
)}
```

- [ ] **Step 6: Build to verify no TypeScript errors**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/EventDetail.tsx
git commit -m "feat: add send reminder blast button to admin event detail"
```

---

### Task 7: Store the Resend API key and deploy

**Context:** The Resend API key must be stored in Firebase Secret Manager before the functions can run in production. This is a one-time step. After that, deploy functions + hosting together.

- [ ] **Step 1: Store the Resend API key in Secret Manager**

```bash
npx firebase functions:secrets:set RESEND_API_KEY
```

When prompted, paste your Resend API key (find it at resend.com → API Keys). The key is stored encrypted in Google Secret Manager — it's never in your code or config files.

Expected output:
```
✔  Created a new secret version projects/.../secrets/RESEND_API_KEY/versions/1
```

- [ ] **Step 2: Run all tests to make sure nothing is broken**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 3: Build the frontend**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 4: Deploy functions and hosting**

```bash
npx firebase deploy --only functions,hosting
```

Expected: Both `functions` and `hosting` show ✔ deploy complete. The functions deploy will take 2-3 minutes as Firebase builds and provisions them.

- [ ] **Step 5: Smoke test in production**

1. Go to https://signupsignin.com, log in as an admin
2. Navigate to **Admin → Settings → Email Notifications**
3. Enter your email address in the "Send Test Email" field and click **Send Test**
4. Check your inbox — you should receive the test email from `noreply@alerts.signupsignin.com`
5. Navigate to any event with signups, open its detail page
6. On the **Signups** tab, verify the "Send Reminder" button is enabled
7. Click **Send Reminder** — verify the "Reminder sent to N volunteers" message appears

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: deploy email messaging with Resend and Gen 2 Cloud Functions"
```

---

## Post-Deploy Notes

**Scheduled reminders:** The `sendReminderEmails` function runs every hour automatically once deployed. No further action needed — it will pick up any events within each org's configured reminder window.

**First-time confirmation emails:** Any signup created after deploy will trigger a confirmation email if `emailSettings.sendConfirmations` is true for that org. Existing signups are not backfilled.

**Upgrading the Resend API key:** Run `firebase functions:secrets:set RESEND_API_KEY` again and paste the new key. Firebase will use the latest version automatically on next function invocation.
