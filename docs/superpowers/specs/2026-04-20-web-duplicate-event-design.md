# Web Duplicate Event
**Date:** 2026-04-20
**Roadmap Item:** #3 — Duplicate Event
**Estimated Effort:** 13 hrs
**Platform:** Web (React / TypeScript)

---

## Context

Admins frequently run similar events (e.g. recurring tournaments, weekly sessions). Recreating events from scratch each time is tedious. This spec adds a one-click duplicate action that copies an existing event and its slots, then drops the admin into the new event ready to edit.

---

## Design

### Entry Point
A **"Duplicate"** button is added to the event detail header bar (`src/pages/admin/EventDetail.tsx`), alongside the existing Edit and Delete buttons.

### Confirmation
Clicking Duplicate triggers a confirmation alert before any action:

> *"Duplicate this event? A copy will be created for you to edit."*

Actions: **Cancel** (dismiss) and **Duplicate** (confirm).

### What Gets Copied

| Field | Behavior |
|---|---|
| Title | Copied with " (Copy)" appended |
| Location | Copied as-is |
| Description | Copied as-is |
| Date / Time | Copied as-is — admin updates on the new event |
| `showVolunteerNames` | Copied as-is |
| `isPublic` | **Always set to `false`** on the copy — admin must explicitly publish |
| Slots (all fields) | Copied in full: name, category, quantity, start/end times, description |
| Signups & attendance | **Not copied** — belong to the original event only |

### Post-Duplication
After the batch write completes, the admin is redirected to the **new event's detail page** to make any changes before publishing.

---

## Implementation Notes

- File to modify: `src/pages/admin/EventDetail.tsx`
- Use a Firestore **batch write** to atomically create the new event doc and all slot subdocs in a single operation
- New event path: `/organizations/{orgId}/events/{newEventId}`
- New slot paths: `/organizations/{orgId}/events/{newEventId}/slots/{newSlotId}`
- Generate new IDs for the event and each slot (`doc(collection(...))` to get a new ref)
- On success, use `navigate(`/admin/events/${newEventId}`)` to redirect
- On error, show an error toast — do not redirect

---

## Out of Scope

- Duplicating from the events list page
- Scheduling/pre-configuring the copy before it's created
- Copying signups or attendance data

---

## Success Criteria

- Duplicate button appears in the event detail header bar
- Confirmation alert fires before any action is taken
- New event is created with all fields and slots copied
- New event is always created as private regardless of original
- Admin is redirected to the new event's detail page on success
- Original event is unchanged
