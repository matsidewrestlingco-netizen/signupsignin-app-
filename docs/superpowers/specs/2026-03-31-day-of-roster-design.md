# Day-Of Roster (Check-In Mode) — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Driver:** Admin end-users need a mobile-friendly way to see who signed up for which slots on event day

---

## Overview

A new purpose-built page for event-day use on mobile phones. Admins can see all volunteer slots for a specific event, who is assigned to each slot, and check people in with a single tap. Accessible via a "Day-Of Roster" button on the existing Admin Event Detail page.

---

## Route

`/admin/events/:eventId/checkin`

Protected by the existing `ProtectedRoute requireOrg`. Renders with a new minimal `CheckInLayout` (no sidebar) instead of `AdminLayout`.

---

## Entry Point

A **"Day-Of Roster"** button added to the `AdminEventDetail` page header, alongside the existing Edit/Delete/Save as Template buttons. Links to `/admin/events/${eventId}/checkin`.

---

## Page Structure

### Header (sticky)
- Back link: `← Back to Event`
- Event title and date
- Summary bar: total volunteer count and checked-in count (e.g., "12 volunteers · 7 checked in")

### Body — Slots grouped by category
For each slot:
- **Slot header:** slot name, time range (if set), filled count badge (e.g., "2/3")
- **Person rows (filled spots):** volunteer name, check-in status indicator, and action button
  - If not checked in: large **"Check In"** button
  - If checked in: green checkmark + time checked in + **"Undo"** text button
- **Open spot rows:** "— open —" placeholder for each unfilled capacity, so admin can see gaps at a glance

### Empty state
If no signups yet: "No one has signed up for this event yet."

---

## Data

Uses existing hooks — no new Firestore queries:
- `useSlots(orgId, eventId)` — real-time slot list
- `useSignups(orgId, eventId)` — real-time signup list with `onSnapshot`

Signups are joined to slots client-side: for each slot, filter signups where `signup.slotId === slot.id`. Check-in actions use the existing `checkIn(signupId)` and `undoCheckIn(signupId)` functions from `useSignups`.

Because both hooks use `onSnapshot`, check-ins made on one device are reflected in real time on another — useful if multiple admins are checking people in simultaneously.

---

## Layout — CheckInLayout

A new minimal layout component (no sidebar, no admin nav). Contains:
- A thin top bar with the back link and event title
- Full-width scrollable content area
- No footer

This layout is used only for the check-in route. The `AdminLayout` (with sidebar) is unchanged.

---

## App.tsx Changes

The check-in route is added inside the existing admin `ProtectedRoute requireOrg` block, but uses `CheckInLayout` directly as its element wrapper rather than nesting inside `AdminLayout`.

---

## Mobile Design Principles

- All tap targets minimum 44px height
- Check-in button is full-width on the person row (easy to tap without precision)
- Slot headers are visually distinct (background color, bold text) so sections are scannable while scrolling
- No modals or confirmation dialogs for check-in — single tap is intentional and undo is always available
- Page is readable in bright outdoor light (high contrast, no reliance on color alone for status)

---

## Out of Scope

- Search/filter volunteers by name
- Export or print from this page (existing Reports page handles export)
- QR code check-in
- Offline support
