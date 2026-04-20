# iOS Admin Cancel Signups (Day-Of)
**Date:** 2026-04-20
**Roadmap Item:** #9 — [Parity] Admin Cancel Signups on iOS
**Estimated Effort:** 5 hrs
**Platform:** iOS (React Native / Expo)

---

## Context

Admins managing an event on the day-of may need to cancel a volunteer's signup on the spot — for example, when a volunteer doesn't show and the admin wants to reopen the slot. The web app supports this; the iOS check-in screen currently does not.

---

## Design

### Where
Manual List mode in the admin check-in screen (`app/(admin)/checkin.tsx`). QR Scanner mode is unchanged.

### Card Changes
Unchecked-in volunteer cards currently show a single **"Check In"** button. A **"Cancel"** button is added alongside it:

- **"Check In"** — green, primary action, unchanged
- **"Cancel"** — red/destructive, secondary styling (outlined or smaller) to reduce accidental taps

Already-checked-in cards (showing "✓ In" + "Undo") are **unchanged** — no cancel option for checked-in volunteers.

### Confirmation
Tapping "Cancel" triggers an alert before any action is taken:

> *"Cancel [Volunteer Name]'s signup? This will remove them from this slot."*

Alert actions:
- **Dismiss** — closes the alert, no change
- **Remove Signup** — destructive, proceeds with deletion

### On Confirm
The signup document is deleted from Firestore. The card is removed from the list in real time via the existing `onSnapshot` listener.

---

## Implementation Notes

- File to modify: `app/(admin)/checkin.tsx`
- Reuse the existing Firestore signup delete pattern already used on the web (`deleteDoc` on the signup document)
- Signup document path: `/organizations/{orgId}/signups/{signupId}`
- The `signupId` must be available on each list item — confirm it's included in the current signup data shape fetched for the Manual List
- Use `Alert.alert()` from React Native for the confirmation dialog

---

## Out of Scope

- Cancelling already-checked-in signups
- Cancel action in QR Scanner mode
- Notifying the volunteer by email/push when their signup is cancelled (can be added later)

---

## Success Criteria

- Unchecked-in volunteer cards show a "Cancel" button alongside "Check In"
- Tapping "Cancel" shows a confirmation alert with the volunteer's name
- Confirming removes the signup from Firestore and the card disappears in real time
- Already-checked-in cards are unchanged
