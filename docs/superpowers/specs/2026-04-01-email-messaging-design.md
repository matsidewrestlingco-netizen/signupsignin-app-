# Email Messaging Implementation Design

**Goal:** Deploy Firebase Cloud Functions (Gen 2) with Resend to send signup confirmation emails and event reminder emails to volunteers, with admin controls for test email and manual reminder blast.

**Architecture:** Four Firebase Cloud Functions (Gen 2) handle all email sending server-side via the Resend SDK. The Resend API key lives in Firebase Secret Manager, injected at runtime via `defineSecret` — no credentials in code or config files. The frontend adds two UI additions (test email button in Settings, Send Reminder button in Event Detail) that call callable functions directly from the browser.

**Tech Stack:** Firebase Cloud Functions v2 (`firebase-functions/v2`), Resend Node.js SDK, Firebase Secret Manager, React + TypeScript (frontend additions)

---

## Files Modified

| File | Change |
|------|--------|
| `functions/src/index.ts` | Full rewrite: Gen 1 → Gen 2, nodemailer → Resend |
| `functions/package.json` | Add `resend`, remove `nodemailer` + `@types/nodemailer` |
| `firebase.json` | Add `functions` section + functions emulator on port 5001 |
| `src/lib/firebase.ts` | Add `getFunctions` init + `connectFunctionsEmulator` |
| `src/pages/admin/Settings.tsx` | Add test email input + button in Email Notifications card |
| `src/pages/admin/EventDetail.tsx` | Add "Send Reminder" button in header button row |

---

## Functions

### 1. `onSignupCreated` — Firestore Trigger

**Trigger:** `onDocumentCreated('organizations/{orgId}/signups/{signupId}')`

**Behavior:**
- Reads `org.emailSettings.sendConfirmations` — exits early if false
- Fetches org, event, and slot documents
- Sends a confirmation email to `signup.userEmail`

**Email:**
- Subject: `Signup Confirmation: {event.title}`
- Body: volunteer name, event title, date, location, slot name and category
- From: `"{org.name} via SignupSignin" <noreply@alerts.signupsignin.com>`

---

### 2. `sendReminderEmails` — Scheduled

**Schedule:** `onSchedule('every 1 hours')`

**Behavior:**
- Queries all orgs where `emailSettings.sendReminders == true`
- For each org, computes the reminder window: events with `startTime` between `now + (reminderHours - 1)h` and `now + reminderHours`
- Fetches all signups for those events where `reminderSent != true`
- Sends a reminder email to each volunteer
- Sets `reminderSent: true` on each signup doc after sending

**Email:**
- Subject: `Reminder: {event.title} – {formatted timing}` where timing is "tomorrow" for 24h, "in {N} hours" otherwise
- Body: volunteer name, event title, date, time, location, slot name and category
- From: `"{org.name} via SignupSignin" <noreply@alerts.signupsignin.com>`

---

### 3. `sendTestEmail` — Callable

**Auth:** Caller must be authenticated and a member of the org (`userProfile.organizations[orgId]` exists).

**Input:** `{ orgId: string, email: string }`

**Behavior:** Sends a simple test email to the provided address on behalf of the org.

**Email:**
- Subject: `Test Email from SignupSignin`
- Body: "Email notifications are working correctly for {org.name}."

---

### 4. `sendEventReminderBlast` — Callable (New)

**Auth:** Caller must be authenticated and an admin of the org (`userProfile.organizations[orgId] === 'admin'`).

**Input:** `{ orgId: string, eventId: string }`

**Behavior:**
- Fetches all signups for the event (no filter on `reminderSent`)
- Sends the reminder email to every signed-up volunteer
- Does **not** update `reminderSent` — the automated scheduler fires independently
- Returns `{ sent: number }` — count of emails sent

**Email:** Same template as `sendReminderEmails`.

---

## Credential Management

The Resend API key is stored in Firebase Secret Manager. It is never checked into source control or set via `functions.config()`.

**One-time setup (before first deploy):**
```bash
firebase functions:secrets:set RESEND_API_KEY
# Paste your Resend API key when prompted
```

In `functions/src/index.ts`, the secret is declared at module level:
```ts
import { defineSecret } from 'firebase-functions/params';
const resendApiKey = defineSecret('RESEND_API_KEY');
```

Each function that uses it declares it in its `secrets` option:
```ts
export const onSignupCreated = onDocumentCreated(
  { document: 'organizations/{orgId}/signups/{signupId}', secrets: [resendApiKey] },
  async (event) => { ... }
);
```

---

## Sending Domain

All emails are sent from `noreply@alerts.signupsignin.com`. The `alerts.signupsignin.com` subdomain is already verified in Resend. The org's name appears in the display name so volunteers know who the email is from:

```
From: "Pittsburgh Soccer Club via SignupSignin" <noreply@alerts.signupsignin.com>
```

---

## Frontend Changes

### `src/lib/firebase.ts`

Add Firebase Functions initialization:
```ts
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
export const functions = getFunctions(app);

if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, host, 5001);
}
```

### `src/pages/admin/Settings.tsx`

Add a "Send Test Email" row at the bottom of the Email Notifications card:
- Text input for an email address (pre-filled with the logged-in user's email)
- "Send Test" button — calls `sendTestEmail` callable with `{ orgId, email }`
- Inline success/error feedback below the button
- Button is disabled while the callable is in-flight

### `src/pages/admin/EventDetail.tsx`

Add a "Send Reminder" button in the header button row (between "Save as Template" and "Edit"):
- Calls `sendEventReminderBlast` with `{ orgId, eventId }`
- On success, shows brief inline feedback: "Reminder sent to N volunteers"
- Disabled when `signups.length === 0` or while the callable is in-flight

---

## `firebase.json` Changes

```json
{
  "functions": {
    "source": "functions"
  },
  "emulators": {
    "auth": { "port": 9099, "host": "0.0.0.0" },
    "firestore": { "port": 8080, "host": "0.0.0.0" },
    "functions": { "port": 5001, "host": "0.0.0.0" },
    "ui": { "enabled": true, "port": 4000, "host": "0.0.0.0" }
  }
}
```

---

## Deploy Sequence

1. `firebase functions:secrets:set RESEND_API_KEY` — store API key in Secret Manager (one-time)
2. `cd functions && npm install` — install updated dependencies
3. `npm run build` — build frontend
4. `npx firebase deploy --only functions,hosting` — deploy functions + app

---

## Out of Scope

- Cancellation emails (decided against during brainstorm)
- Per-org sending domains (too much friction for admins)
- Email template customization in the UI
- Unsubscribe / opt-out handling
