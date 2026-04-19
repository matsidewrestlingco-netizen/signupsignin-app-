# Volunteer Names on Signup Page — Design Spec

**Date:** 2026-04-19
**Status:** Approved

---

## Overview

Surface the full names of volunteers who have already signed up for each slot on the public event signup page (`EventDetail`). Visibility is controlled by a per-event toggle that org admins set at event creation time.

---

## Goals

- Let volunteers see who else is signed up for each slot before committing.
- Give org admins control over whether this info is public (some events may warrant privacy).
- Zero friction for visitors — no login required when names are enabled.

---

## Data Model

Add `showVolunteerNames: boolean` to the event Firestore document.

**Affected files:**
- `src/hooks/useEvents.ts` — `Event` interface, `EventInput` interface, Firestore read mapping

**Default:** `false` — existing events without the field default to hidden. No migration required.

```ts
// Event interface addition
showVolunteerNames: boolean;

// Firestore read mapping addition
showVolunteerNames: data.showVolunteerNames ?? false,
```

---

## Admin UI — Event Creation Form

**File:** `src/pages/admin/Events.tsx`

Add a `showVolunteerNames` state (default `false`). Render a checkbox directly below the existing `isPublic` checkbox:

```
☐ Show volunteer names publicly
    Displays who has signed up for each slot to anyone viewing this event
```

Pass `showVolunteerNames` to `createEvent` on form submit.

**Scope:** Creation form only. An edit form does not yet exist (roadmap item #4). When edit is built, this field must be included.

---

## Data Fetching — Public EventDetail

**File:** `src/pages/EventDetail.tsx`

After slots are fetched, if `event.showVolunteerNames === true`, run one additional Firestore query:

```ts
const signupsRef = collection(db, 'organizations', orgId, 'signups');
const q = query(signupsRef, where('eventId', '==', eventId));
const snap = await getDocs(q);
```

Build a `Record<slotId, string[]>` map:

```ts
const namesBySlot: Record<string, string[]> = {};
snap.forEach((doc) => {
  const { slotId, userName } = doc.data();
  if (!namesBySlot[slotId]) namesBySlot[slotId] = [];
  namesBySlot[slotId].push(userName);
});
```

Store in component state (`slotVolunteerNames`). Pass `volunteerNames={slotVolunteerNames[slot.id] ?? []}` to each `SlotCard`.

**No new Firestore index needed** — filtering by `eventId` alone uses the existing index already in place for admin views.

**No real-time listener** — names are fetched once on page load. After a user signs up, their name appears on next reload. Counts update immediately via existing local state logic.

**Error handling** — if the query throws, names silently fail to load. Slots still render normally with counts. Names are supplementary; a failure must not break the page.

---

## SlotCard — Name Rendering

**File:** `src/components/SlotCard.tsx`

Add optional prop `volunteerNames?: string[]`. When provided and non-empty, render a name list below the progress bar:

```tsx
{volunteerNames && volunteerNames.length > 0 && (
  <div className="mt-2 space-y-0.5">
    {volunteerNames.map((name, i) => (
      <p key={i} className="text-xs text-gray-500">{name}</p>
    ))}
  </div>
)}
```

- When the array is empty or undefined, nothing extra renders.
- Admin view (`adminView` prop) is unaffected — the prop is optional and defaults to `undefined`.
- The prop is not passed from admin slot management views (no change to those call sites).

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Slot with zero signups | `volunteerNames` is `[]` — no list renders |
| `showVolunteerNames` is `false` | No extra query runs, no names prop passed |
| Signups query fails | Silent failure — slots render normally |
| User signs up | Count increments locally; name appears after reload |
| Existing events (no field in Firestore) | Default `false` — names hidden |

---

## Out of Scope

- Real-time name updates (live listener) — not needed for this feature.
- Showing names in admin slot management views — admins already see full signup lists.
- Edit event form — deferred until roadmap item #4 (Edit Template / Edit Event) is built.
- Per-slot visibility control — per-event toggle is sufficient.
