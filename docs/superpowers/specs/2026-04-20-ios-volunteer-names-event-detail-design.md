# iOS Volunteer Names on Event Detail
**Date:** 2026-04-20
**Roadmap Item:** #8 — [Parity] Volunteer Names on iOS Event Detail
**Estimated Effort:** 7 hrs
**Platform:** iOS (React Native / Expo)

---

## Context

When an admin enables the "show volunteer names" toggle on an event, web volunteers can see who else has signed up for each slot. iOS volunteers currently see only fill counts (`X / Total`). This spec adds volunteer name display to the iOS event detail screen, inline under each slot.

---

## Design

### Trigger
The feature is gated on the `showVolunteerNames` boolean field of the event document. If `false`, the slot list renders exactly as today — no change.

### Display
When `showVolunteerNames` is `true`, a list of signed-up volunteer names is rendered **directly below each slot row**, indented slightly to associate them with their slot:

- One name per line (first + last name)
- Slots with no signups yet show nothing extra — no empty state label needed
- Slots that are full show all names

### Data Fetching
The volunteer event detail screen currently fetches only event and slot data. When `showVolunteerNames` is `true`, a one-time query (not a real-time listener) fetches signups for the event from Firestore, grouped by `slotId` in memory.

Firestore path: `/organizations/{orgId}/signups` filtered by `eventId`

The existing Firestore security rules already permit public reads of signups when `showVolunteerNames` is enabled — no rules changes needed.

---

## Implementation Notes

- File to modify: `app/(volunteer)/events.tsx`
- Fetch signups conditionally: only query if `event.showVolunteerNames === true`
- Group fetched signups by `slotId` into a map for efficient lookup when rendering each slot
- Use a one-time `getDocs` call rather than `onSnapshot` — names don't need to update in real time on this screen
- Display `signup.userName` for each signup in the slot group

---

## Out of Scope

- Real-time name updates while viewing the screen
- Showing volunteer email addresses
- Admin event detail screen (already shows full roster)

---

## Success Criteria

- When `showVolunteerNames` is enabled, volunteer names appear inline below each slot on the iOS event detail screen
- Slots with no signups show no extra content
- When `showVolunteerNames` is disabled, the screen is unchanged
- Firestore reads succeed without permission errors
