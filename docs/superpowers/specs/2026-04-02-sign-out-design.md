# Sign Out Feature Design

**Date:** 2026-04-02  
**Status:** Approved

## Summary

Add a sign-out option for both volunteer and admin users. Volunteers get a new 5th "Account" tab with profile info and a sign-out button. Admins get a sign-out button added to their existing Settings sub-section.

## Architecture

No new contexts, hooks, or services are needed. `logOut()` already exists in `AuthContext` and correctly clears the Firebase session and user profile state. Signing out triggers the `onAuthStateChanged` listener in `_layout.tsx`, which redirects the user to `/(auth)/login`.

## Components

### 1. New file: `app/(volunteer)/account.tsx`

A new screen with:

- **Green header** (`#059669`, matching all other volunteer screens) with title "Account"
- **Profile card** — two labeled rows: Name and Email, sourced from `useAuth()` → `userProfile`
- **Organization card** — two labeled rows: Organization name and Type, sourced from `useOrg()` → `currentOrg`. Displays "—" for both fields if `currentOrg` is null
- **Account Actions card** — a red "Sign Out" button that triggers an `Alert` confirmation dialog before calling `logOut()`

### 2. Update: `app/(volunteer)/_layout.tsx`

Add a 5th `<Tabs.Screen>` entry:

- `name`: `"account"`
- `title`: `"Account"`
- `tabBarIcon`: `person` (Ionicons)

### 3. Update: `app/(admin)/reports.tsx`

In the `settings` section, add a new "Account" card after the existing Email Settings card. The card contains:

- Card title: "Account"
- A red "Sign Out" button with an `Alert` confirmation before calling `logOut()`

## Data Flow

- `userProfile.name` and `userProfile.email` come from `useAuth()`
- `currentOrg.name` and `currentOrg.type` come from `useOrg()`
- `logOut()` comes from `useAuth()` — calls Firebase `signOut()` and clears local profile state
- After sign-out, `RootLayoutNav` in `_layout.tsx` detects `currentUser === null` and redirects to `/(auth)/login`

## Error Handling

- Sign-out is a Firebase operation that rarely fails. No special error handling is needed beyond what Firebase provides internally.
- If `currentOrg` is null (volunteer not linked to an org), the Organization card displays "—" gracefully.

## Testing

- Tap "Sign Out" on volunteer Account tab → confirmation alert appears → confirm → user lands on login screen
- Tap "Sign Out" on admin Settings tab → same flow
- Cancel on the confirmation alert → user stays on the screen, session intact
- After sign-out, navigating back (hardware back button / swipe) should not return to authenticated screens (handled by `RootLayoutNav` redirect)
