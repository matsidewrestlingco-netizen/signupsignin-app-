# Web Bulk Slot Creation
**Date:** 2026-04-20
**Roadmap Item:** #6 — Bulk Slot Creation
**Estimated Effort:** 23 hrs
**Platform:** Web (React / TypeScript)

---

## Context

Admins creating events with many time slots (e.g. 30-min volunteer shifts from 9am–12pm) must add each slot manually. This is tedious and was flagged in competitor reviews. This spec adds a bulk slot generator that creates a full schedule of slots from a simple form.

---

## Design

### Entry Point
A **"Bulk Add"** button is added alongside the existing "Add Slot" button on the Slots tab of the event detail page (`src/pages/admin/EventDetail.tsx`). It opens a dedicated bulk creation modal separate from the single-slot modal.

### Generator Form Fields

| Field | Description |
|---|---|
| Start Time | Time the first slot begins |
| End Time | Slots stop generating at or before this time |
| Slot Duration | Length of each slot — dropdown (15 min, 30 min, 45 min, 1 hr, 1.5 hr, 2 hr) |
| Volunteers per Slot | Quantity needed for each generated slot (number input, min 1) |
| Slot Name Prefix | Base name for all slots — slots are named "{Prefix} 1", "{Prefix} 2", etc. |
| Category | Optional — applied uniformly to all generated slots |

### Live Preview
A preview list below the form updates in real time as the admin adjusts inputs, showing each slot that will be created (name, time range, volunteer count). This lets the admin verify the schedule before committing.

### On Confirm
All slots are written to Firestore in a single **batch write**. Each slot is created identically to a manually-created slot and is individually editable and deletable via the existing SlotCard Edit/Delete actions.

### Validation
- End Time must be after Start Time
- Duration must divide the time range into at least 1 slot
- Slot Name Prefix is required
- If inputs produce 0 slots, the Confirm button is disabled

---

## Implementation Notes

- File to modify: `src/pages/admin/EventDetail.tsx`
- Slot generation logic: pure function — `generateSlots(startTime, endTime, durationMinutes, prefix, quantity, category) → SlotTemplate[]`
- Use Firestore batch write (`writeBatch`) to create all slots atomically
- Slot paths: `/organizations/{orgId}/events/{eventId}/slots/{newSlotId}`
- Times stored relative to event start date, consistent with existing single-slot behavior
- Live preview re-runs the generation function on every form field change

---

## Out of Scope

- Bulk editing or deleting existing slots
- Non-uniform slot durations within a single bulk operation
- Bulk slot creation on iOS

---

## Success Criteria

- "Bulk Add" button appears alongside "Add Slot" on the Slots tab
- Generator form produces a correct live preview matching the final output
- Confirm writes all slots to Firestore in a single batch
- Generated slots appear in the Slots tab and are individually editable/deletable
- Validation prevents submitting with invalid inputs or zero slots
