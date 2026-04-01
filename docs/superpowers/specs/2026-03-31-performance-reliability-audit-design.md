# Performance & Reliability Audit — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Priority:** High — includes fix for reported blank-page bug on event pages

---

## Overview

A targeted audit of the SignupSignin app addressing 5 reliability issues and 2 performance issues. The reported blank event page is almost certainly caused by the missing React Error Boundary (R1). All fixes are scoped to existing functionality — no new features.

Implementation will be done in the Raspberry Pi dev environment using Firebase Emulators before deploying to production.

---

## Dev Environment Setup (Task 0)

Before any fixes, configure the Pi dev environment:

1. Add `emulators` section to `firebase.json` (Firestore port 8080, Auth port 9099, both bound to `0.0.0.0` so the Mac browser can reach them)
2. Modify `src/lib/firebase.ts` to conditionally connect to emulators when `VITE_USE_EMULATOR=true`
3. Create `.env.development.local` on the Pi with `VITE_USE_EMULATOR=true` and `VITE_EMULATOR_HOST=192.168.8.198`
4. Run `firebase emulators:start --only firestore,auth` and `npm run dev -- --host` on the Pi

---

## Reliability Fixes

### R1 — React Error Boundary (fixes reported blank-page bug)

**Problem:** No React Error Boundary exists anywhere in the app. When any component throws an uncaught JS error during render (e.g., `format()` called on a bad date, a null dereference in a child component), React silently unmounts the entire tree, producing a blank page with no user feedback.

**Fix:** Create a reusable `ErrorBoundary` class component. Wrap each route section in `App.tsx` with it:
- Public routes
- Admin routes
- Parent routes
- Platform routes

The boundary renders a friendly "Something went wrong" message with a "Try again" button (which resets the boundary state) instead of a blank page.

**Files:** `src/components/ErrorBoundary.tsx` (new), `src/App.tsx`

---

### R2 — Slot Capacity Race Condition

**Problem:** `createSignup` in `useSignups.ts` does not check slot capacity before writing. It fires an `addDoc` and then an `updateDoc(increment(1))` as two separate operations. Two users signing up simultaneously for the last open slot can both succeed, causing `quantityFilled` to exceed `quantityTotal`.

**Fix:** Replace the `addDoc` + `updateDoc` pair with a Firestore transaction that:
1. Reads the slot document
2. Checks `quantityFilled >= quantityTotal` — throws "This slot is full" if true
3. Atomically writes the signup document and increments `quantityFilled`

**Files:** `src/hooks/useSignups.ts`

---

### R3 — `cancelSignup` Stale State Risk

**Problem:** In `useMySignups`, `cancelSignup` looks up the signup from local React state (`signups.find(...)`) to obtain the `slotId` needed to decrement `quantityFilled`. If the local state hasn't synced yet (e.g., shortly after mount), the lookup returns `undefined`, the decrement is silently skipped, and slot counts drift permanently.

**Fix:** Read the signup document directly from Firestore (`getDoc`) before deleting it, so the `slotId` is always authoritative.

**Files:** `src/hooks/useSignups.ts`

---

### R4 — Error States Not Surfaced to Users

**Problem:** `useEvents` and `useSignups` both set an `error` state on Firestore failures, but consuming pages do not render it. Users see an empty list or a stuck spinner with no explanation.

**Affected pages:**
- `src/pages/Events.tsx`
- `src/pages/admin/EventDetail.tsx`
- `src/pages/parent/Dashboard.tsx`

**Fix:** Add a visible error banner (e.g., red alert box with the error message) to each of these pages, rendered when the hook's `error` state is non-null.

**Files:** `src/pages/Events.tsx`, `src/pages/admin/EventDetail.tsx`, `src/pages/parent/Dashboard.tsx`

---

### R5 — `ProtectedRoute` requireOrg Gap

**Problem:** In `ProtectedRoute`, the org requirement check is: `if (requireOrg && userProfile && ...)`. When `userProfile` is `null` (the brief window after Firebase Auth resolves but before the Firestore profile fetch completes), the condition short-circuits and the user is allowed through to the admin area without an org.

**Fix:** When `requireOrg=true` and `userProfile` is still `null`, continue showing the loading spinner rather than passing the user through. Only evaluate the org check once `userProfile` is non-null.

**Files:** `src/components/ProtectedRoute.tsx`

---

## Performance Fixes

### P1 — N+1 Reads in Parent Dashboard

**Problem:** `ParentDashboard` fetches event and slot details for each signup in a sequential `for` loop. With N signups, this fires 2N serial Firestore reads before the page renders, making it noticeably slow with even a handful of signups.

**Fix:** Replace the sequential `for` loop with `Promise.all()` to fire all reads in parallel. The sort step afterward is unchanged.

**Files:** `src/pages/parent/Dashboard.tsx`

---

### P2 — N+1 Reads in OrgContext

**Problem:** `fetchOrganizations()` in `OrgContext.tsx` loops through org IDs and fetches each organization document individually in sequence.

**Fix:** Replace the loop with `Promise.all()` to parallelize all org reads.

**Files:** `src/contexts/OrgContext.tsx`

---

## Out of Scope

- Pagination of events list (acceptable risk until org event counts grow large)
- Security audit (separate concern — Firestore rules are already in good shape)
- Any new features
