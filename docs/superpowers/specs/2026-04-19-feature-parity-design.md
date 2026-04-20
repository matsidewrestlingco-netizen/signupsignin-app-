# Feature Parity Design: Web & iOS
**Date:** 2026-04-19
**Scope:** SignupSignin Web (React/TypeScript/Firebase) + iOS (React Native/Expo/TypeScript)

---

## Context

The SignupSignin platform has two clients: a web app and an iOS app. They were developed independently, resulting in feature divergence. This spec defines which gaps to close, which to leave intentionally platform-specific, and which to defer.

**iOS usage pattern:** Primarily a day-of tool for admins (check-in, quick actions). Full experience for volunteers (browse events, manage signups, check-in).

---

## Decisions

### Add to Both Platforms

#### Volunteer QR Code Generation
- Volunteers need a personal QR code to show an admin for check-in
- **iOS:** Already has this
- **Web:** Missing — add QR code generation to the volunteer experience (e.g., in My Signups or a dedicated Check-In tab)
- QR code should encode a stable volunteer identifier (userId or email) that the iOS admin scanner already recognizes

---

### Add to iOS (Gaps to Close)

#### 1. Show Volunteer Names on Public Events
- When an admin enables the "show volunteer names" toggle on an event, volunteers should see who else is signed up
- Add this display to the iOS event detail screen
- Read-only — the toggle itself stays in web admin settings

#### 2. Admin Cancel Signups (Day-Of)
- Admins on iOS need to cancel a volunteer's signup on the spot (e.g., no-show, opening the slot back up)
- Add cancel action to the iOS day-of roster screen alongside the existing check-in/undo actions
- Should prompt a confirmation before cancelling

#### 3. Display Org Branding (Read-Only)
- iOS should display the organization's primary color and logo wherever the web already uses them
- Read-only — branding editing (color picker, logo upload) stays on web
- On app load / org switch, fetch branding from Firestore and apply to headers, buttons, and accent colors

#### 4. Privacy Policy & Support Links
- Apple App Store requires an accessible privacy policy for apps collecting user data
- Add tappable "Privacy Policy" and "Support" links to the Account tab
- Links open in the system browser (Safari) pointing to the existing web pages:
  - Privacy Policy: existing `/privacy` route on signupsignin.com
  - Support: existing `/support` route on signupsignin.com

---

### Intentionally Web-Only (No iOS Parity)

| Feature | Reason |
|---|---|
| Full reports suite (slot fulfillment, readiness, participant activity, no-shows) | Post-event analysis; not a day-of need |
| CSV export | Desktop workflow; impractical on mobile |
| Branding editing (logo upload, color picker) | Setup task; done once on web |
| Email blast to all event signups | Pre-event communication; done on web |
| Test email from settings | Admin setup task |
| Slot time windows | Event setup; done on web before day-of |
| Duplicate slots | Event setup convenience; done on web |
| Volunteer names toggle (admin setting) | Event setup; done on web |
| Platform/super-admin screens | Never a mobile use case |
| Web push notifications | Email covers web users sufficiently |
| Marketing/landing page | App Store listing serves this purpose |

---

### Intentionally iOS-Only (No Web Parity)

| Feature | Reason |
|---|---|
| QR code scanning (admin scans volunteers) | Natural on phone; awkward on laptop webcam |
| Push notifications | Native mobile capability; email covers web |
| Admin custom push notification blast | Companion to push notifications; iOS-only |

**Check-in strategy:** QR scanning is the preferred check-in flow. Admins on iOS scan volunteer QR codes. Admins on web use the existing manual roster (tap name to check in). Both flows write to the same Firestore check-in records.

---

### Backlog (Defer — Not Critical Now)

| Feature | Platform | Notes |
|---|---|---|
| Add to Calendar (Google/Outlook/.ics) | iOS | Useful but not urgent; native iOS calendar integration available when ready |
| Filter events by upcoming/past | iOS | Low effort; add when volunteer event list grows cluttered |

---

## Out of Scope

- Self-serve volunteer check-in on iOS (superseded by QR code approach)
- Any new web or iOS features beyond parity items listed above

---

## Success Criteria

- A volunteer can generate and show a QR code on both web and iOS
- iOS volunteers see fellow volunteer names when the admin has enabled that setting
- iOS admins can cancel a signup from the day-of roster
- iOS displays org branding (color, logo) consistently with web
- iOS Account tab has working Privacy Policy and Support links that open in Safari
- All intentionally web-only and iOS-only features are documented and agreed upon

---

## Implementation Notes

- Volunteer QR code on web: use a library like `qrcode.react` (already used in iOS via `react-native-qrcode-svg`) to stay consistent
- Org branding on iOS: fetch `primaryColor` and `logoUrl` from `/organizations/{orgId}` on Firestore; cache locally per session
- Cancel signup on iOS: reuse the existing Firestore delete pattern from `useSignups` — same operation as web
- Privacy/Support links: use `Linking.openURL()` from React Native / Expo

---

## What We're Not Deciding Here

- Specific UI layout of new iOS screens
- Whether to add new features to either platform beyond parity
- Timeline or sprint assignment (handled in implementation plan)
