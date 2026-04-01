# SignupSignin iOS App — Design Spec
**Date:** 2026-04-01  
**Status:** Approved

---

## Overview

A full-featured iOS app for SignupSignin — the volunteer event signup and attendance management platform. The app provides feature parity with the existing web app for both Admin and Volunteer roles, built with React Native + Expo and backed by the same Firebase project.

---

## Goals

- Full feature parity with the web app for both Admin and Volunteer roles
- Native iOS experience with role-based navigation
- Camera-based QR check-in with manual fallback for admins
- Push notifications for both roles
- Shared Firebase backend — same accounts, same data, real-time sync with the web app

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React Native + Expo Managed Workflow | Leverages existing React/TypeScript skills; handles camera, push notifications, and builds without native code |
| Routing | Expo Router (file-based) | Mirrors Next.js App Router patterns; clean role-based route groups |
| Backend | Firebase JS SDK (existing project) | Same Firestore collections, Auth, and Cloud Functions as web app |
| Auth persistence | `@react-native-async-storage/async-storage` | React Native replacement for `localStorage` |
| QR scanning | `expo-camera` + `expo-barcode-scanner` | First-class Expo support, no native code required |
| Push notifications | `expo-notifications` + Firebase Cloud Messaging (FCM) | Cloud Functions trigger FCM; Expo handles delivery |
| Builds | EAS Build (Expo Application Services) | Builds for TestFlight and App Store without local Xcode required |
| Testing | Jest + React Native Testing Library | Same API as existing Vitest + Testing Library setup |

---

## Architecture

The iOS app is a **separate repository** (`signupsignin-mobile`) that connects to the **same Firebase project** as the web app. Users share accounts across both platforms. Data written on mobile is immediately visible on web and vice versa.

```
Web App (React + Vite)          iOS App (React Native + Expo)
        |                                    |
        +-------------- Firebase ------------+
                    Auth | Firestore
                Cloud Functions | FCM
```

**Mobile-only additions** not present in the web app:
- Camera-based QR code scanning for check-in
- Push notifications via FCM
- Volunteer personal QR code display
- Native iOS share sheet for report exports
- iOS Calendar integration for volunteer signups

---

## Navigation

Role is determined from Firebase after login. Each role gets its own tab bar.

### Admin Tab Bar
| Tab | Screens |
|---|---|
| 🏠 Dashboard | Summary stats, upcoming events, quick check-in shortcut |
| 📅 Events | Event list → Event Detail → Create/Edit Event, Templates |
| 📲 Check-In | Select Event → QR Scanner or Manual List |
| 📊 Reports | Attendance reports, volunteer hours, export via share sheet |
| ⚙️ Settings | Accessible from profile icon in header — org settings, notifications, sign out |

### Volunteer Tab Bar
| Tab | Screens |
|---|---|
| 🏠 Dashboard | Upcoming signups, next event countdown, shortcut to QR display if an event is currently active |
| 📅 Events | Browse events → Event Detail → Sign up / cancel |
| ✅ My Signups | Upcoming commitments, attendance history, Add to Calendar |
| 📲 Check-In | Show personal QR code for admin to scan; real-time confirmation |
| 👤 Profile | Accessible from header — edit profile, notification preferences, sign out |

### Auth Flow
Launch → Login / Sign Up / Forgot Password → role detected from Firestore user profile → routed to correct tab bar.

---

## Project Structure

New repository: `signupsignin-mobile`

```
app/
  (auth)/
    login.tsx
    signup.tsx
    forgot-password.tsx
  (admin)/
    _layout.tsx          ← admin tab bar definition
    dashboard.tsx
    events.tsx
    events/[id].tsx
    checkin.tsx
    reports.tsx
    settings.tsx
    templates.tsx
  (volunteer)/
    _layout.tsx          ← volunteer tab bar definition
    dashboard.tsx
    events.tsx
    events/[id].tsx
    my-signups.tsx
    checkin.tsx
    profile.tsx
components/              ← React Native equivalents of web components
contexts/                ← AuthContext, OrgContext (same shape as web)
hooks/                   ← useEvents, useAuth, useSignups, etc.
lib/                     ← Copied from web app's src/lib/ (Firebase utils, permissions)
assets/
app.json                 ← Expo config
eas.json                 ← EAS Build config
```

**`lib/` is duplicated, not shared.** Firebase utility functions are copied from the web app's `src/lib/` as a starting point. No monorepo complexity to start. The two can diverge independently as mobile needs evolve.

---

## Data Layer

- Uses Firebase JS SDK — same SDK as the web app, fully supported in Expo.
- Auth persistence configured with `@react-native-async-storage/async-storage` (one-line config change from web).
- Firestore offline persistence enabled by default — reads served from cache when offline; writes queue and sync on reconnect. Critical for event venues with poor connectivity.
- Data flow pattern mirrors the web app: Firestore `onSnapshot` listeners → custom hooks → React Context → screens.
- Firestore collections are unchanged: `users`, `organizations`, `organizations/{id}/members`, `events`, `requirementStatuses`, etc.

---

## Check-In Flow

### Admin (QR + Manual)

1. **Select Event** — pick from today's active events
2. **Choose Mode** — "Scan QR Code" or "Manual List" (switchable at any time)
3a. **QR Scanner** — full-screen camera; on match → haptic feedback + green flash + volunteer name; on no match → red flash + "Not on signup list"
3b. **Manual List** — searchable list of signed-up volunteers; tap to toggle checked-in status
4. **Firestore write** — check-in updates `requirementStatuses` in real time; web app reflects instantly

### Volunteer (QR Code Display for Admin to Scan)

1. Tap Check-In tab — shows active events they're signed up for
2. Tap event → displays personal QR code (Firebase UID encoded as QR); large, high-contrast
3. Admin scans QR → volunteer's screen updates to "✅ Checked in!" via Firestore listener

---

## Push Notifications

Push tokens are registered on login and stored in Firestore against the user profile. Cloud Functions trigger FCM messages; `expo-notifications` handles delivery on device.

**Volunteer notifications:**
- "Your event is tomorrow" — 24 hours before event start
- "Your event starts in 1 hour" — 1 hour before event start

**Admin notifications:**
- "New signup: [Name] joined [Event]" — on volunteer signup
- "[N] volunteers checked in for [Event]" — periodic check-in summary during active event

Notification preferences (opt-in/out per type) are stored in the user's Firestore profile and respected by Cloud Functions before sending.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| No network connectivity | Firestore offline persistence serves cached reads; writes queue for sync |
| Camera permission denied | Graceful prompt to iOS Settings; automatic fallback to manual list |
| QR scan unrecognized | Haptic error + "Not on signup list" toast; scanner stays open |
| Auth token expired | Redirect to login screen |
| Firestore write failure | Toast error message; operation can be retried |

---

## Testing

- **Unit/integration tests:** Jest + React Native Testing Library (same API as existing Vitest setup)
- **Device testing:** Expo Go app for rapid development iteration
- **Stakeholder testing:** TestFlight distribution
- **App Store:** Designed for full App Store compatibility; submission timing TBD

---

## Distribution

- Built with EAS Build — no local Xcode required for CI/CD
- TestFlight for internal testing
- App Store submission when ready (no hard deadline set)
- Target: iOS 16+ (covers ~95% of active iPhones as of 2026)
