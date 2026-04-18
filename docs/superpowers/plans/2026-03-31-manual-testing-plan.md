# Manual QA Testing Plan — 2026-03-31

**App:** SignupSignin volunteer management
**Environment:** Raspberry Pi dev server at `http://192.168.8.198:5173`
**Firebase Emulators:** Auth on port 9099, Firestore on port 8080
**Date:** 2026-03-31
**Scope:** P&R Audit features + Day-Of Roster

---

## Pre-Test Checklist

Before starting any scenario, verify the environment is healthy:

- [X] SSH or terminal on the Pi shows `firebase emulators:start` output with no errors
- [X] Auth emulator is listening on port 9099
- [X] Firestore emulator is listening on port 8080
- [X] `npm run dev -- --host` is running and shows `Network: http://192.168.8.198:5173`
- [X] From your Mac browser, `http://192.168.8.198:5173` loads without a network error
- [X] Browser DevTools console shows no uncaught errors on initial load

---

## Scenario 1 — Dev Environment Startup

**Goal:** Confirm the app serves and emulators are reachable before any user testing.

**Setup:** Nothing — this is the starting state.

- [X] 1. Open a browser tab and navigate to `http://192.168.8.198:5173`.
- [X] 2. Confirm the landing page loads and shows the SignupSignin branding.
- [X] 3. Open DevTools (F12), go to the **Console** tab — confirm no red uncaught errors (Firebase info logs are fine).
- [X] 4. Navigate to `http://192.168.8.198:4000` — confirm the Firebase Emulator UI loads (shows Auth and Firestore tabs).

**Pass:** Landing page loads, no console errors, emulator UI accessible.
**Fail:** "This site can't be reached", blank page, or red console errors.

---

## Scenario 2 — New User Onboarding

**Goal:** A brand-new user signs up, lands on Create Organization, creates an org, and reaches the admin dashboard.

**Setup:** Use a fresh email address (e.g., `admin1@test.com`).

- [X] 1. Navigate to `http://192.168.8.198:5173/signup`.
- [X] 2. Enter name `Test Admin`, email `admin1@test.com`, password `password123`, confirm password.
- [X] 3. Click **Create account**.
- [X] 4. Confirm the URL is now `http://192.168.8.198:5173/setup/organization`.
- [X] 5. Confirm the page heading reads **"Create your organization"**.
- [X] 6. Enter name `Test Wrestling Club`, type `Sports League`, click **Create Organization**.
- [X] 7. Confirm the URL is now `http://192.168.8.198:5173/admin`.
- [X] 8. Confirm the admin sidebar is visible with links including **Events**, **Reports**, **Settings**.

**Pass:** Sign-up → `/setup/organization` → Create org → `/admin` dashboard with sidebar.
**Fail:** Redirect goes to `/parent` after sign-up; org creation errors; sidebar missing.

---

## Scenario 3 — Login Redirect

**Goal:** Logging in directly via `/login` redirects to `/admin`, not `/parent`.

**Setup:** Logged out. Use the admin account from Scenario 2.

- [X] 1. Log out (click account menu in sidebar → Log out, or navigate to `/login`).
- [X] 2. Navigate to `http://192.168.8.198:5173/login`.
- [X] 3. Enter `admin1@test.com` / `password123`, click **Log in**.
- [X] 4. Confirm the URL after redirect is `http://192.168.8.198:5173/admin`.

**Pass:** Redirect lands on `/admin`.
**Fail:** Redirect lands on `/parent` or `/` (the old default before the login fix).

---

## Scenario 4 — Create an Event

**Goal:** Create a future event from the admin panel.

**Setup:** Logged in as admin on the admin dashboard.

- [X] 1. Navigate to `http://192.168.8.198:5173/admin/events`.
- [X] 2. Click **Create Event** (top-right).
- [X] 3. Fill in:
  - **Title:** `Spring Volunteer Day`
  - **Start:** Tomorrow at 9:00 AM
  - **End:** Tomorrow at 3:00 PM
  - **Location:** `Community Center Gym`
  - Leave **Public event** checked.
- [X] 4. Click **Create Event**.
- [X] 5. Confirm the modal closes and **"Spring Volunteer Day"** appears in the Upcoming Events list.
- [X] 6. Click the event card to open the detail page at `/admin/events/EVENT_ID`.
- [X] 7. Confirm the header shows **"Spring Volunteer Day"**, the date, and location.
- [X] 8. **Note the EVENT_ID from the URL** — you'll need it throughout testing.

**Pass:** Event created, visible in list, detail page loads correctly.
**Fail:** Modal error; event not in list; detail page shows "Event not found".

---

## Scenario 5 — Add Slots

**Goal:** Add 3 slots across 2 categories, each with quantity > 1.

**Setup:** On the event detail page for "Spring Volunteer Day". Slots tab active.

- [X] 1. Click **Add Slot**.
  - Name: `Setup Helper` · Category: `Setup` · Quantity: `2` · Start: `08:00` · End: `09:30`
  - Click **Add Slot**.
- [X] 2. Confirm **Setup Helper** appears under a **Setup** section heading.
- [X] 3. Click **Add Slot**.
  - Name: `Score Table` · Category: `Activities` · Quantity: `2` · Start: `09:00` · End: `12:00`
  - Click **Add Slot**.
- [X] 4. Click **Add Slot**.
  - Name: `Concessions` · Category: `Activities` · Quantity: `1` · Start: `10:00` · End: `14:00`
  - Click **Add Slot**.
- [X] 5. Confirm the page shows **SETUP** (1 slot) and **ACTIVITIES** (2 slots) category sections.
- [X] 6. Confirm the Slots tab label shows `Slots (3)`.

**Pass:** 3 slots in 2 categories visible; tab label shows `Slots (3)`.
**Fail:** Slots missing after creation; all slots in one category; error alerts.

---

## Scenario 6 — Parent Signup Flow

**Goal:** A parent user signs up for a slot on the public event page.

**Setup:** Know the `orgId` from the Emulator UI at `http://192.168.8.198:4000` → Firestore → `organizations`. Have an incognito window ready.

- [X] 1. In an **incognito window**, navigate to `http://192.168.8.198:5173/event/ORG_ID/EVENT_ID`.
- [X] 2. Confirm the public event page loads with **"Spring Volunteer Day"** heading and slots visible.
- [X] 3. Click **"Log in to Sign Up"** in the event header.
- [X] 4. On the login page, click **"create a new account"**.
- [X] 5. Sign up: name `Test Parent`, email `parent1@test.com`, password `password123`.
- [X] 6. After sign-up, navigate to `http://192.168.8.198:5173/event/ORG_ID/EVENT_ID`.
- [X] 7. Locate **Setup Helper** under the **Setup** section — shows `0 / 2`.
- [X] 8. Click **Sign Up** on Setup Helper.
- [X] 9. Confirm the slot updates to `1 / 2`.
- [X] 10. In the **admin browser**, go to the event detail page → **Signups** tab.
- [X] 11. Confirm `Test Parent` appears in the signups list for Setup Helper.

**Pass:** Parent can sign up; slot count increments; signup visible in admin.
**Fail:** Signup error; count stays at `0/2`; signup not in admin Signups tab.

---

## Scenario 7 — Slot Capacity Enforcement

**Goal:** Filling a slot to capacity prevents further signups.

**Setup:** Logged in as `parent1@test.com` (incognito). **Concessions** slot shows `0 / 1`.

- [X] 1. On the public event page as `parent1@test.com`, sign up for **Concessions** (quantity 1).
- [X] 2. Confirm it shows `1 / 1`.
- [X] 3. Open a **second incognito window**, navigate to the public event page.
- [X] 4. Log in as `parent2@test.com` (create the account if needed at `/signup`).
- [X] 5. Navigate back to the public event page.
- [X] 6. If the **Sign Up** button is visible on **Concessions**, click it.
- [X] 7. Confirm an alert appears with the message **"This slot is full"**.
- [X] 8. Confirm the slot count remains `1 / 1`.

**Pass:** Second signup attempt shows "This slot is full" error; count unchanged.
**Fail:** Second signup succeeds and count shows `2 / 1` (overbooking bug — should be fixed).

---

## Scenario 8 — Day-Of Roster Entry Point

**Goal:** "Day-Of Roster" button exists on admin event detail and links to the correct URL.

**Setup:** Admin browser on the event detail page at `/admin/events/EVENT_ID`.

- [X] 1. Locate the button group in the top-right of the page header.
- [X] 2. Confirm a button labeled **"Day-Of Roster"** is visible alongside Save as Template / Edit / Delete.
- [X] 3. Hover over it — confirm the link destination is `/admin/events/EVENT_ID/checkin`.

**Pass:** Button visible with correct href.
**Fail:** Button missing; button links to wrong URL or 404.

---

## Scenario 9 — Day-Of Roster Page Structure

**Goal:** Check-in page has no sidebar, sticky header, slots grouped by category.

**Setup:** Admin on event detail page.

- [X] 1. Click **Day-Of Roster**.
- [X] 2. Confirm URL is `http://192.168.8.198:5173/admin/events/EVENT_ID/checkin`.
- [X] 3. Confirm **no left sidebar** is visible — page is full-width.
- [X] 4. Confirm the sticky header contains:
  - [X] a. **"← Back to Event"** link
  - [X] b. Event title **"Spring Volunteer Day"**
  - [X] c. Formatted date (e.g., "Saturday, April 4")
  - [X] d. Volunteer count summary (e.g., **"1 volunteer · 0 checked in"**)
- [X] 5. Scroll the page — confirm the header stays fixed at the top.
- [X] 6. Confirm slots are grouped under section headings **SETUP** and **ACTIVITIES**.
- [X] 7. Confirm each slot header shows name, time range, and `X/Y` count.

**Pass:** No sidebar; sticky header with all fields; category groupings present.
**Fail:** Sidebar visible; header scrolls away; slots not grouped; spinner hangs indefinitely.

---

## Scenario 10 — Day-Of Roster Check In

**Goal:** Tapping "Check In" updates the row to show ✓ and a timestamp.

**Setup:** On the check-in page. Test Parent appears in Setup Helper with `○` and "Check In" button.

- [X] 1. Locate **Test Parent** in the **Setup Helper** slot — confirm `○` and **"Check In"** button.
- [X] 2. Click **"Check In"**.
- [X] 3. Confirm the button immediately shows **"..."**.
- [X] 4. After the write completes (~1 second), confirm:
  - [X] a. `○` changes to green **✓**
  - [X] b. A timestamp appears below the name (e.g., "9:15 AM")
  - [X] c. **"Check In"** button replaced by **"Undo"**
- [X] 5. Confirm the header count updates (e.g., "1 volunteer · **1** checked in").

**Pass:** Row transitions to checked-in state; header count increments.
**Fail:** Button stays as "Check In"; no ✓; no timestamp; error banner appears.

---

## Scenario 11 — Day-Of Roster Undo

**Goal:** Tapping "Undo" reverts the row to unchecked state.

**Setup:** Test Parent is checked in (green ✓, "Undo" button visible).

- [X] 1. Click **"Undo"** on the Test Parent row.
- [X] 2. Confirm:
  - [X] a. `✓` reverts to grey `○`
  - [X] b. Timestamp disappears
  - [X] c. **"Check In"** button restored
- [X] 3. Confirm header count decrements back.

**Pass:** Row reverts to unchecked; header count decrements.
**Fail:** Row stays checked-in; timestamp remains; error banner appears.

---

## Scenario 12 — Day-Of Roster Real-Time Updates

**Goal:** Check-in changes in one tab appear in a second tab without refresh.

**Setup:** Two browser tabs open to the same check-in URL.

- [X] 1. Open `http://192.168.8.198:5173/admin/events/EVENT_ID/checkin` in **Tab A** and **Tab B**.
- [X] 2. In **Tab A**, click **"Check In"** on Test Parent.
- [X] 3. Switch to **Tab B** without refreshing.
- [X] 4. Confirm Tab B shows the `✓` and timestamp within ~3 seconds — no refresh needed.
- [X] 5. In **Tab B**, click **"Undo"**.
- [X] 6. Switch to **Tab A** — confirm it reverts to `○` without a refresh.

**Pass:** Changes propagate between tabs in real time.
**Fail:** Tab B still shows `○` after 5+ seconds; update only appears after manual refresh.

---

## Scenario 13 — Day-Of Roster Open Slots

**Goal:** Unfilled slot capacity renders "— open —" placeholder rows.

**Setup:** On the check-in page. Score Table has 0 signups / capacity 2. Setup Helper has 1 signup / capacity 2.

- [X] 1. Under **ACTIVITIES**, locate **Score Table** (showing `0/2`).
- [X] 2. Confirm exactly **2 rows** display **"— open —"** in gray italic text.
- [X] 3. Under **SETUP**, locate **Setup Helper** (showing `1/2` — assuming Test Parent was undone and re-added, otherwise adjust expected count).
- [X] 4. Confirm exactly **1 row** shows **"— open —"** below Test Parent's row.

**Pass:** Placeholder count matches open capacity (`quantityTotal − signups`).
**Fail:** No "— open —" text; wrong number of placeholders; placeholder shows volunteer data.

---

## Scenario 14 — Day-Of Roster Back Navigation

**Goal:** "← Back to Event" link returns to the admin event detail page.

**Setup:** On the check-in page.

- [X] 1. Click **"← Back to Event"** in the sticky header.
- [X] 2. Confirm URL changes to `http://192.168.8.198:5173/admin/events/EVENT_ID`.
- [X] 3. Confirm the admin event detail page loads with the sidebar visible and "Day-Of Roster" button present.

**Pass:** Returns to admin event detail with sidebar restored.
**Fail:** Navigates to 404 or blank; sidebar missing; URL wrong.

---

## Scenario 15 — Day-Of Roster Mobile Layout

**Goal:** Check-in page is usable on a phone — full-width, comfortable tap targets.

**Setup:** A phone on the same Wi-Fi, or Chrome DevTools device emulation (Cmd+Shift+M → iPhone 14).

- [X] 1. Open `http://192.168.8.198:5173/admin/events/EVENT_ID/checkin` on the mobile device.
- [X] 2. Confirm no horizontal scroll bar appears.
- [X] 3. Confirm the sticky header fits without overflow.
- [X] 4. Tap **"Check In"** — confirm the button is tall and wide enough to tap without precision (min 44px height).
- [X] 5. Scroll the page — confirm the header stays fixed.
- [X] 6. Test in portrait orientation — layout should be clean and readable.

**Pass:** Full-width, no overflow, tap targets comfortable, header sticks.
**Fail:** Horizontal scroll; button too small; header scrolls away.

---

## Scenario 16 — Cancel Signup

**Goal:** Parent cancels a signup; slot count decrements correctly.

**Setup:** Logged in as `parent1@test.com`. Setup Helper shows 1 signup (Test Parent).

- [X] 1. Navigate to `http://192.168.8.198:5173/parent`.
- [X] 2. Confirm the **Setup Helper / Spring Volunteer Day** signup is listed.
- [X] 3. Click **Cancel** on that signup. Confirm the confirmation modal (if shown), then click **Cancel Signup**.
- [X] 4. Confirm the signup disappears from the parent dashboard.
- [X] 5. Navigate to the public event page at `http://192.168.8.198:5173/event/ORG_ID/EVENT_ID`.
- [X] 6. Confirm **Setup Helper** shows `0 / 2` (decremented from 1).
- [X] 7. In the admin browser, go to event detail → **Signups** tab — confirm Test Parent's row is gone.
- [X] 8. On the check-in page, confirm Setup Helper shows `0/2` and two **"— open —"** rows.

**Pass:** Cancellation removes signup everywhere; count decrements to 0.
**Fail:** Count stays at `1/2` after cancellation (stale state bug); count goes to `-1` (decrement without read bug); signup still in admin Signups tab.

---

## Scenario 17 — Error Boundary
## Post-Test Summary Checklist

After all scenarios, confirm:

- [X] No scenario produced a permanently blank page
- [X] Slot counts stayed accurate (non-negative, not exceeding capacity)
- [X] Admin sidebar was visible on all `/admin/*` routes **except** the check-in page
- [X] Check-in page was full-width with no sidebar
- [X] Real-time updates propagated between tabs without refresh
- [X] No navigation defaulted to `/parent` after a fresh login
- [X] Signup cancellation decremented slot count correctly every time

---

## Reference

**Finding orgId and eventId:**
Open the Firebase Emulator UI at `http://192.168.8.198:4000` → Firestore → `organizations` collection. The document ID is the `orgId`. Expand the org's `events` subcollection for `eventId`.

**Resetting emulator state:**
Restart the emulators (`Ctrl+C` on the Pi terminal running `firebase emulators:start`, then re-run). Data does not persist between runs unless exported.

**Two-user testing:**
Use a regular browser window for admin and an incognito window (or different browser) for parents.

**Mobile testing:**
Any device on the same Wi-Fi can reach `http://192.168.8.198:5173`. Make sure the Pi's firewall allows port 5173.
