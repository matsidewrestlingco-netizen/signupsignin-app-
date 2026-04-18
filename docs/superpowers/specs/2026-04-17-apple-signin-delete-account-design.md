# Apple Sign-In & Delete Account — Design Spec
**Date:** 2026-04-17
**Status:** Approved

## Overview

Two independent features added to the web app to match the mobile app's capabilities:

1. **Sign In with Apple** — Apple as a third OAuth sign-in option on Login and Signup pages
2. **Delete Account** — a new Account Settings page in the parent dashboard where users can permanently delete their account

---

## Feature 1: Sign In with Apple

### Architecture

Firebase supports Apple sign-in via `OAuthProvider('apple.com')` with `signInWithPopup`, identical to the existing Google sign-in flow. A new `signInWithApple()` method is added to `AuthContext`.

### AuthContext changes (`src/contexts/AuthContext.tsx`)

- Add `signInWithApple: () => Promise<void>` to `AuthContextType`
- Implement `signInWithApple()` using `new OAuthProvider('apple.com')` + `signInWithPopup`
- On first Apple sign-in, create Firestore `/users/{uid}` profile if it doesn't exist (same pattern as `signInWithGoogle`)
- Expose via context value

### UI changes

Both `Login.tsx` and `SignUp.tsx` get an Apple button added below the Google button, using the same "Or continue with" divider section. Apple button uses standard black Apple branding (SVG Apple logo + "Sign in with Apple" / "Sign up with Apple" text).

### Infrastructure prerequisite

Apple sign-in on the web requires setup in two places before the code will work:

1. **Apple Developer portal**: Create a Services ID (separate from the app's Bundle ID), enable Sign In with Apple, and configure the web domain + return URL (`https://matsidesystems---signupsignin.web.app/__/auth/handler`)
2. **Firebase Console**: Enable Apple as a sign-in provider under Authentication → Sign-in method, enter the Services ID and the private key details

This is a one-time setup step outside the codebase.

---

## Feature 2: Delete Account

### New page: Account Settings (`src/pages/parent/AccountSettings.tsx`)

A new page at `/parent/settings` with two cards:

**Profile card**
- Displays the user's name and email (read-only)

**Danger Zone card**
- "Delete Account" button (red/destructive styling)
- Clicking opens a confirmation modal: "Are you sure you want to delete your account? This action cannot be undone."
- Modal has Cancel + "Delete Account" (destructive) buttons
- On confirm: calls `deleteUser(currentUser)` from Firebase Auth, then `deleteDoc(doc(db, 'users', uid))` from Firestore
- On success: signs out, redirects to `/`
- On `auth/requires-recent-login` error: shows inline message — "For security, please log out and log back in before deleting your account." No re-auth flow needed.
- Existing signup records are left untouched (PII retained in signups collection per product decision)

### Navigation

A "Account Settings" link (gear icon) added to the parent dashboard navigation, pointing to `/parent/settings`.

### Route registration

`/parent/settings` registered in `App.tsx` inside the parent route group (requires login).

---

## Data Impact

| Data | Action |
|------|--------|
| Firebase Auth user | Deleted |
| `/users/{uid}` Firestore doc | Deleted |
| `/organizations/{orgId}/signups/{signupId}` | Untouched |

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `auth/requires-recent-login` | Inline message prompting re-login |
| Network error during delete | Inline error message, account not deleted |
| Apple sign-in popup closed by user | Error caught, no state change |
| Apple sign-in first-time (no Firestore profile) | Profile created automatically |

---

## Out of Scope

- Re-authentication flow for stale sessions (handled by simple message)
- Editing profile name/email
- Deleting or anonymizing existing signup records
- Apple sign-in for admin users specifically (works for all users)
