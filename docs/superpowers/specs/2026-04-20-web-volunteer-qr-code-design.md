# Web Volunteer QR Code
**Date:** 2026-04-20
**Roadmap Item:** #7 — [Parity] Volunteer QR Code on Web
**Estimated Effort:** 6 hrs
**Platform:** Web (React / TypeScript)

---

## Context

QR code check-in is the preferred check-in flow. The iOS app already generates a personal QR code for each volunteer that the admin scanner reads. Web volunteers currently have no QR code, making them incompatible with the iOS day-of check-in workflow. This spec adds a QR code to the existing web Check-In page.

---

## Design

### Placement
A QR code section is added at the top of the volunteer Check-In page (`src/pages/parent/CheckIn.tsx`), above the existing upcoming shifts list.

### QR Code
- Encodes the volunteer's **Firebase UID** — identical to the iOS implementation
- Rendered using the `qrcode.react` library
- A short label below the code: *"Show this to an admin to check in"*

### Existing Content
The upcoming shifts list and manual self-check-in button are **unchanged** — the manual flow remains as a fallback.

---

## Implementation Notes

- File to modify: `src/pages/parent/CheckIn.tsx`
- Install `qrcode.react` (`npm install qrcode.react`)
- QR value: `currentUser.uid` from Firebase Auth context
- The iOS admin scanner (`app/(admin)/checkin.tsx`) already matches scanned UIDs against `s.userId` — no iOS changes needed
- Size the QR code generously (200–250px) so it's easy to scan on a phone

---

## Out of Scope

- QR code on any other web page (My Signups, Dashboard)
- Admin QR scanner on web (intentionally iOS-only)
- Removing the manual self-check-in button

---

## Success Criteria

- Volunteer Check-In page displays a QR code at the top
- QR code encodes the volunteer's Firebase UID
- An iOS admin can scan the web QR code and successfully check in the volunteer
- Existing shifts list and manual check-in button are unaffected
