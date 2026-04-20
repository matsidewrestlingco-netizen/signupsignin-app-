# Web Past Events View
**Date:** 2026-04-20
**Roadmap Item:** #1 — Past Events View
**Estimated Effort:** 6 hrs
**Platform:** Web (React / TypeScript)

---

## Context

Admins have no way to view completed events and their signup history on the web. All historical data already exists in Firestore — the events list just doesn't surface past events. This spec adds an Upcoming/Past toggle to the existing admin events page.

---

## Design

### Toggle
An **Upcoming / Past** toggle is added at the top of the admin events list page, defaulting to **Upcoming** on load.

- **Upcoming** — events where `startTime >= now`, sorted soonest first (current behavior)
- **Past** — events where `startTime < now`, sorted most recent first

### Filtering
Client-side — the existing Firestore query is unchanged. Events are split into upcoming/past arrays in memory using the current timestamp at render time.

### Past Event Detail
Clicking a past event opens the existing event detail page unchanged. The full signup roster, slot fill counts, and attendance data are already available there — no new views needed.

### Empty States
- Upcoming with no events: existing empty state unchanged
- Past with no events: *"No past events yet"*

---

## Implementation Notes

- File to modify: admin events list page (confirm exact path — likely `src/pages/admin/Events.tsx`)
- Use a `useState` hook for the selected tab (`'upcoming' | 'past'`)
- Split events array at render time by comparing `event.startTime` to `Date.now()`
- Past events sorted descending (most recent first)
- Style the toggle consistently with other segmented controls in the web app

---

## Out of Scope

- Server-side query changes (client-side filtering is sufficient at current scale)
- Any changes to the event detail page
- Archiving or deleting past events

---

## Success Criteria

- Admin events page shows an Upcoming/Past toggle
- Upcoming is selected by default
- Past tab shows completed events sorted most recent first
- Clicking a past event opens the existing event detail with full signup history
- Empty state shown when no past events exist
