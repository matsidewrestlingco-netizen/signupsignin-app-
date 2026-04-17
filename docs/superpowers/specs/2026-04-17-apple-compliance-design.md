# Apple App Store Compliance — Design Spec

**Date:** 2026-04-17
**Submission ID:** 5dfdd207-d589-45b7-a85a-8a4fbab05404
**Rejected guidelines:** 4.8 (Login Services), 5.1.1(v) (Account Deletion)
**Platform:** iOS only

---

## Overview

Two features must be added to comply with Apple App Store guidelines:

1. **Sign in with Apple** (Guideline 4.8) — the app uses Google as a third-party login but lacks an equivalent login option meeting Apple's privacy requirements.
2. **Account Deletion** (Guideline 5.1.1v) — the app supports account creation but offers no way to delete an account.

---

## Feature 1: Sign in with Apple

### Dependencies

- Install `expo-apple-authentication`
- `expo-crypto` already installed — used for SHA-256 nonce hashing
- Manual step (Firebase console): enable Apple as a sign-in provider, configure Service ID and private key

### Configuration (`app.json`)

Add `usesAppleSignIn: true` under the `ios` key. Add `expo-apple-authentication` to the plugins array. This triggers the Apple Sign In entitlement in the native build.

### AuthContext (`contexts/AuthContext.tsx`)

Add `signInWithApple: () => Promise<void>` to the context type and implementation.

**Implementation steps:**
1. Generate a random nonce (UUID or random bytes)
2. SHA-256 hash the nonce using `expo-crypto`
3. Call `AppleAuthentication.signInAsync` with the hashed nonce and scopes `FULL_NAME` and `EMAIL`
4. Extract `identityToken` from the response
5. Create `OAuthProvider('apple.com').credential({ idToken: identityToken, rawNonce })`
6. Call `signInWithCredential(auth, credential)`
7. Check if `users/{uid}` doc exists in Firestore — if not, create it (Apple only provides `fullName` and `email` on the first sign-in; capture them then)
8. If user cancels (`ERR_REQUEST_CANCELED`): silently ignore — no error shown
9. Any other error: show "Apple sign-in failed. Please try again."

### Login Screen (`app/(auth)/login.tsx`)

Add `AppleAuthentication.AppleAuthenticationButton` below the Google button, using the `SIGN_IN` type and `BLACK` style. This is Apple's required native button component — custom styling is not permitted. The button is only rendered when `AppleAuthentication.isAvailableAsync()` returns true (iOS 13+, which covers all supported devices).

**Button order on login screen:**
1. Email/password form
2. Divider ("or")
3. Continue with Google
4. Sign in with Apple

---

## Feature 2: Account Deletion

### Data deleted on account deletion

1. Firestore document: `users/{uid}` — contains name, email, org memberships, role
2. Firebase Auth user — the actual account credential

Org membership is tracked on the user document only (`organizations` map), not on org documents, so no org-side cleanup is needed. Event sign-up/check-in records are left intact (they become orphaned without personal data, preserving historical reporting integrity).

### AuthContext (`contexts/AuthContext.tsx`)

Add `deleteAccount: () => Promise<void>` to the context type and implementation.

**Implementation steps:**
1. Delete `doc(db, 'users', uid)` from Firestore
2. Call `deleteUser(currentUser)` from Firebase Auth
3. If step 2 throws `auth/requires-recent-login`: call `signOut(auth)`, then show alert: "For security, please sign in again and then delete your account from the Account page."
4. On success: `onAuthStateChanged` fires automatically, redirecting the user to the login screen

### Volunteer Account Screen (`app/(volunteer)/account.tsx`)

Add a "Delete Account" button in the Actions card, below the "Sign Out" button. Style it as a bordered/outlined button with red text (destructive, but visually secondary to Sign Out).

**Deletion flow:**
1. User taps "Delete Account"
2. First `Alert`: "Delete Account — Are you sure? This cannot be undone." → [Cancel] [Delete]
3. Second `Alert`: "This will permanently delete your account and all your data. This action cannot be reversed." → [Cancel] [Yes, Delete My Account]
4. Show loading state (disable both buttons, show `ActivityIndicator` or disable the button)
5. Call `deleteAccount()`
6. On `requires-recent-login` error: show alert per above, do not crash
7. On success: app navigates to login automatically via auth state change

Two confirmation steps are explicitly allowed by Apple's guidelines for destructive actions.

---

## Manual Steps Required (Outside Code)

1. **Firebase console** → Authentication → Sign-in method → Add provider → Apple
   - Register a Service ID with Apple Developer
   - Generate and upload a private key
   - Configure the OAuth redirect domain

2. **Apple Developer console** → Certificates, Identifiers & Profiles → enable Sign in with Apple capability for the app ID `com.matsidewrestling.signupsignin`

3. **App Store Connect** — after implementation, update screenshots to reflect Sign in with Apple button per Apple's feedback

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `expo-apple-authentication` |
| `app.json` | Add `usesAppleSignIn: true`, add plugin |
| `contexts/AuthContext.tsx` | Add `signInWithApple`, `deleteAccount` |
| `app/(auth)/login.tsx` | Add Apple Sign In button |
| `app/(volunteer)/account.tsx` | Add Delete Account button + flow |
