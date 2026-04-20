# Web Event QR Code Generation
**Date:** 2026-04-20
**Roadmap Item:** #2 — QR Code Generation
**Estimated Effort:** 9 hrs
**Platform:** Web (React / TypeScript)

---

## Context

Admins need a way to share a public event page via QR code — for flyers, bulletin boards, and day-of check-in signage. The public event URL already exists; this spec surfaces it as a scannable QR code with download capability directly from the event detail page.

---

## Design

### Entry Point
A **"QR Code"** button is added to the event detail header bar (`src/pages/admin/EventDetail.tsx`), alongside the existing Day-Of Roster, Save as Template, Send Reminder, Edit, and Delete buttons.

The button is **hidden for private events** — there is no public URL to share when an event is private.

### Modal Contents
Clicking the button opens a modal containing:

1. **QR code** — encodes the public event URL: `https://signupsignin.com/event/{orgId}/{eventId}`
2. **Copy Link** button — copies the URL to the clipboard
3. **Download** button — saves the QR code as a PNG image

### Download Implementation
The QR code is rendered to a `<canvas>` element via `qrcode.react`'s canvas renderer. The Download button triggers a PNG export by converting the canvas to a data URL and programmatically clicking a temporary `<a download>` element.

---

## Implementation Notes

- File to modify: `src/pages/admin/EventDetail.tsx`
- Uses `qrcode.react` — same library being added for volunteer QR code (#7); install once, use in both
- QR code value: `https://signupsignin.com/event/${orgId}/${eventId}`
- Use the `QRCodeCanvas` export from `qrcode.react` (canvas renderer required for PNG download)
- Hide the QR Code button when `event.isPublic === false`
- Copy Link uses `navigator.clipboard.writeText()` with a brief "Copied!" confirmation state

---

## Out of Scope

- QR codes for private events
- QR code on the public event page itself
- SVG export (PNG is sufficient for flyers)
- Custom QR code styling or logo embedding

---

## Success Criteria

- QR Code button appears in the event detail header for public events only
- Modal displays a scannable QR code for the public event URL
- Copy Link copies the URL to clipboard with a confirmation
- Download saves a PNG of the QR code to the user's device
- Button is hidden for private events
