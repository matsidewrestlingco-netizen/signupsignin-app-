# iOS Filter Events by Upcoming / Past
**Date:** 2026-04-20
**Roadmap Item:** #15 — [Parity] Filter Events by Upcoming/Past on iOS
**Estimated Effort:** 6 hrs
**Platform:** iOS (React Native / Expo)

---

## Context

The iOS volunteer events list currently shows all public events with no way to separate upcoming from past. As event history grows, the list becomes cluttered. The web app already has this filter. This spec adds a simple toggle to the iOS events screen.

---

## Design

### Toggle
A two-segment toggle is added at the top of the volunteer events screen, below the header:

- **Upcoming** (default) — events where `startTime >= now`
- **Past** — events where `startTime < now`

"Upcoming" is selected by default on screen load.

### Filtering
Filtering is done client-side — the existing Firestore query for public events is unchanged. The full event list is fetched once and split into upcoming/past arrays in memory using the current timestamp at render time.

### Empty States
- **Upcoming with no events:** "No upcoming events" message
- **Past with no events:** "No past events yet" message

---

## Implementation Notes

- File to modify: volunteer events screen (likely `app/(volunteer)/events.tsx` — confirm path)
- Use a `useState` hook for the selected tab (`'upcoming' | 'past'`)
- Split events array at render time: `events.filter(e => e.startTime >= now)` vs `< now`
- Sort upcoming events ascending (soonest first), past events descending (most recent first)
- Style the toggle consistently with other segmented controls in the app

---

## Out of Scope

- Filtering on the admin events list (admin already has a simpler event management view)
- Server-side query changes (client-side filtering is sufficient at current scale)
- "All" as a third filter option

---

## Success Criteria

- Events screen shows an Upcoming/Past toggle
- Upcoming is selected by default on load
- Upcoming shows only events with a start time in the future, sorted soonest first
- Past shows only events with a start time in the past, sorted most recent first
- Each tab shows an appropriate empty state when no events exist
