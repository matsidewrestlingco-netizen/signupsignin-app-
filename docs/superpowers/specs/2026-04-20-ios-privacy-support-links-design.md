# iOS Privacy Policy & Support Links
**Date:** 2026-04-20
**Roadmap Item:** #11 — [Parity] Privacy Policy & Support Links on iOS
**Estimated Effort:** 2 hrs
**Platform:** iOS (React Native / Expo)

---

## Context

Apple requires apps that collect user data to provide an accessible privacy policy link. The web app already has `/privacy` and `/support` pages at signupsignin.com. This spec adds links to both pages in the iOS app's Account tab.

---

## Design

### Placement
A new **"Legal"** card section is added to the volunteer Account tab (`app/(volunteer)/account.tsx`), below the existing Actions card (Sign Out / Delete Account).

### Content
Two tappable rows inside the Legal card:
- **Privacy Policy** — opens `https://signupsignin.com/privacy`
- **Support** — opens `https://signupsignin.com/support`

Each row displays a right-pointing chevron (`›`) to indicate it navigates somewhere, consistent with standard iOS list item conventions.

### Behavior
Tapping either row calls `Linking.openURL()` from Expo, opening the URL in the device's default browser (Safari).

---

## Implementation Notes

- File to modify: `app/(volunteer)/account.tsx`
- Use `Linking` from `react-native`
- URLs are static constants — no Firestore reads, no auth required
- Style the Legal card consistently with the existing Profile, Organization, and Actions cards

---

## Out of Scope

- In-app webview (opening in Safari is the standard and simpler approach)
- Adding links to the admin navigation — confirm during implementation whether the admin tab stack also needs a Legal card, or whether the volunteer Account tab covers all users

---

## Success Criteria

- "Privacy Policy" and "Support" rows are visible in the Account tab Legal card
- Tapping each opens the correct URL in Safari
- Apple App Store review passes without a privacy policy rejection
