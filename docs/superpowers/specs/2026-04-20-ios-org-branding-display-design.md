# iOS Org Branding Display
**Date:** 2026-04-20
**Roadmap Item:** #10 — [Parity] Org Branding Display on iOS
**Estimated Effort:** 12 hrs
**Platform:** iOS (React Native / Expo)

---

## Context

The web app displays org branding (primary color and logo) throughout the admin and volunteer experience. The iOS app currently uses hardcoded colors everywhere. This spec adds read-only branding display to high-visibility surfaces on iOS — editing stays on web.

---

## Design

### Surfaces Affected

| Surface | Change |
|---|---|
| Dashboard header | Primary color background; org logo before org name |
| Check-In header | Primary color background (replaces hardcoded `#1a56db`) |
| Primary action buttons | Primary color (replaces hardcoded `#059669`) — e.g. "Check In", "Sign Up" |

All other surfaces (tab bars, secondary buttons, backgrounds) are unchanged.

### Architecture

A `BrandingContext` is added to the app and wraps the navigators. On org load, it fetches `primaryColor` and `logoUrl` from `/organizations/{orgId}` in Firestore and exposes them via context. Screens and components that need branding values consume the context directly rather than receiving props.

```
BrandingContext
  primaryColor: string   // hex color, e.g. "#059669"
  logoUrl: string | null // Firestore Storage URL or null
```

### Logo
- Displayed as a small image (32×32px) to the **left of the org name** in the dashboard header
- Uses React Native `Image` component with the Firestore Storage URL
- If `logoUrl` is null, org name text is shown alone — no broken image placeholder

### Fallbacks
- No `primaryColor` set → default to `#059669`
- No `logoUrl` set → no logo shown, org name text only
- Branding fetch error → silently fall back to defaults, no crash

---

## Implementation Notes

- Create `context/BrandingContext.tsx` — fetch once per org session using `getDoc`
- Provide context in the root layout wrapping both volunteer and admin navigators
- Volunteer dashboard: `app/(volunteer)/index.tsx` — apply `primaryColor` to header, render logo
- Admin dashboard: `app/(admin)/index.tsx` — apply `primaryColor` to header, render logo
- Check-in header: `app/(admin)/checkin.tsx` — replace hardcoded `#1a56db` with `primaryColor`
- Primary buttons across both volunteer and admin screens — replace hardcoded `#059669` with `primaryColor`
- Re-fetch branding on org switch (multi-org admin users)

---

## Out of Scope

- Tab bar active color theming
- Secondary button or background color theming
- Editing branding from iOS (stays on web)
- Logo upload from iOS

---

## Success Criteria

- Dashboard headers display org primary color and logo (when set)
- Check-In header uses org primary color
- Primary action buttons use org primary color
- Falls back gracefully to defaults when branding fields are absent
- Org switch triggers a branding refresh
