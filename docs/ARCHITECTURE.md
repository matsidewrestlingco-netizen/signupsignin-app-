# SignupSignin — Architecture Overview

A high-level map of how the application is built, how the pieces connect, and where things live.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Authentication | Firebase Auth |
| Database | Firebase Firestore |
| Backend logic | Firebase Cloud Functions (Gen 2) |
| Email delivery | Resend (via Cloud Functions) |
| Hosting | Firebase Hosting |
| Deployed at | signupsignin.com / matsidesystems---signupsignin.web.app |

---

## User Roles

There are four distinct user types, each with their own experience:

| Role | Who | Access |
|------|-----|--------|
| **Public** | Anyone, no login required | Browse public events, view event details, sign up for volunteer slots |
| **Parent / Volunteer** | Logged-in users | View their own signups, manage their volunteer commitments |
| **Org Admin** | Logged-in users with admin role for an org | Full event/slot/template management, check-in, reports, settings |
| **Super Admin** | You (platform owner) | Manage all organizations and users across the platform |

---

## Routing Structure

The app has four distinct route zones, each with its own layout:

```
/                          Public landing page
/login                     Login
/signup                    Create account
/forgot-password           Password reset
/events/:orgId             Public event list for an org
/event/:orgId/:eventId     Public event detail + volunteer signup
/privacy                   Privacy policy
/support                   Support / FAQ

/setup/organization        Create a new organization (logged in)

/admin/                    Org admin dashboard
/admin/events              Event management
/admin/events/:id          Event detail (slots, signups, check-in)
/admin/events/:id/checkin  Day-of roster / check-in mode
/admin/templates           Template management
/admin/reports             Reports
/admin/settings            Org settings + email testing

/parent/                   Volunteer dashboard (my signups)
/parent/event/:id          Event signup flow
/parent/checkin            Volunteer self check-in

/platform/                 Super admin dashboard
/platform/users            All platform users
/platform/organizations    All organizations
/platform/organizations/:id  Org detail
```

---

## Frontend Architecture

### Contexts (Global State)
Two React contexts wrap the entire app and provide shared state to all components:

- **`AuthContext`** — Tracks the currently logged-in Firebase user. Any component can ask "who is logged in?"
- **`OrgContext`** — Tracks which organization the current user belongs to and their role within it (admin or member).

### Hooks (Data Fetching)
Custom hooks handle all Firestore reads and writes. Each hook is responsible for one data type:

| Hook | Responsibility |
|------|---------------|
| `useEvents` | List, create, update, delete events |
| `useSlots` | List, create, update, delete volunteer slots |
| `useSignups` | List signups for an event; check-in / cancel |
| `useTemplates` | List, create, delete event templates |
| `usePlatformOrgs` | Super admin: list all organizations |
| `usePlatformOrgDetail` | Super admin: detail view of one org |
| `usePlatformUsers` | Super admin: list all platform users |

Hooks use Firestore's `onSnapshot` for real-time updates — the UI automatically reflects changes without requiring a page refresh.

### Pages
Organized into four folders matching the route zones:

- `src/pages/` — Public-facing pages (landing, login, event browsing, signup)
- `src/pages/admin/` — Org admin pages
- `src/pages/parent/` — Volunteer/parent pages
- `src/pages/platform/` — Super admin pages

### Components
Reusable UI building blocks in `src/components/`:

- `Sidebar` — Navigation sidebar (renders differently for admin, parent, and platform layouts)
- `SlotCard` — Displays a volunteer slot (admin and public views)
- `SignupList` — Table of signups with check-in controls
- `Modal` / `ConfirmModal` — Reusable modal dialogs
- `ProtectedRoute` / `SuperAdminRoute` — Route guards that redirect unauthenticated or unauthorized users
- `ErrorBoundary` — Catches runtime errors and prevents full app crashes
- `Footer` — Site-wide footer with Privacy Policy and Support links

---

## Backend — Firebase

### Firestore Data Model

```
/users/{userId}
  - email, displayName
  - organizations: { orgId: 'admin' | 'member' }   ← controls access

/organizations/{orgId}
  - name, createdAt

  /events/{eventId}
    - title, description, location
    - startTime, endTime
    - isPublic (boolean)

    /slots/{slotId}
      - name, category, description
      - quantityTotal, quantityFilled
      - startTime, endTime

  /signups/{signupId}
    - userId, userName, userEmail   ← PII stored here
    - slotId, eventId
    - status (confirmed / cancelled)
    - checkedIn (boolean)

  /templates/{templateId}
    - name, description
    - eventTitle, eventDescription, eventLocation
    - durationHours
    - slots[] (array of slot definitions)
```

### Security Rules (`firestore.rules`)
- Public events and slots: readable by anyone
- Signups: readable/writable only by the signed-up user or org admin
- Org data: writable only by org admins
- Super admin (`isSuperAdmin()` helper): read access across all data

### Cloud Functions (`functions/`)
Four Gen 2 functions handle backend logic:

| Function | Trigger | What it does |
|----------|---------|-------------|
| `onSignupCreated` | Firestore write | Sends confirmation email to volunteer when they sign up |
| `sendReminderEmails` | Scheduled (hourly) | Sends reminder emails to volunteers whose event is coming up |
| `sendTestEmail` | Callable (admin) | Admin sends a test email from the Settings page |
| `sendEventReminderBlast` | Callable (admin) | Admin blasts a reminder to all signups for a specific event |

All emails are delivered via **Resend** using the `noreply@alerts.signupsignin.com` address. The Resend API key is stored in Firebase Secret Manager.

---

## Data Flow (How It All Connects)

```
User action (click, form submit)
        ↓
React component calls a hook function
        ↓
Hook writes to Firestore
        ↓
Firestore triggers onSnapshot listener (same or other clients)
        ↓
Hook updates React state
        ↓
UI re-renders automatically
```

For email:
```
Volunteer signs up (Firestore write)
        ↓
onSignupCreated Cloud Function fires
        ↓
Function calls Resend API
        ↓
Confirmation email delivered to volunteer
```

---

## Key Utilities

- `src/lib/firebase.ts` — Firebase app initialization (Auth, Firestore, Functions)
- `src/lib/calendar.ts` — "Add to Calendar" link generation (Google, Apple, Outlook)
- `src/lib/exportUtils.ts` — Data export helpers (reports)

---

## Deployment

```bash
# Deploy the web app
npm run build && firebase deploy --only hosting

# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy Cloud Functions
firebase deploy --only functions
```

After deploying callable Cloud Functions, IAM permissions must be set manually:
```bash
gcloud run services add-iam-policy-binding sendtestemail \
  --member="allUsers" --role="roles/run.invoker" \
  --region=us-central1 --project=matsidesystems---signupsignin

gcloud run services add-iam-policy-binding sendeventreminderblast \
  --member="allUsers" --role="roles/run.invoker" \
  --region=us-central1 --project=matsidesystems---signupsignin
```
