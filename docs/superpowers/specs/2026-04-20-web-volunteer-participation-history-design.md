# Web Volunteer Participation History
**Date:** 2026-04-20
**Roadmap Item:** #5 — Volunteer Participation History
**Estimated Effort:** 18 hrs
**Platform:** Web (React / TypeScript)

---

## Context

Volunteers currently see past signups in a faded, stripped-down "Past" section on the dashboard. This doesn't feel like a proper record of their contributions. This spec replaces that section with a richer "History" section showing full event and slot details alongside attendance status.

---

## Design

### Placement
The existing "Past" section on the parent dashboard (`src/pages/parent/Dashboard.tsx`) is replaced with a **"History"** section.

### History Card
History cards are identical in information to the Upcoming cards:

| Field | Details |
|---|---|
| Event title | Linked to public event page |
| Date | Full formatted date |
| Slot name | Blue pill badge |
| Slot time | Shown if set on the slot |
| Check-in status | StatusBadge — "Attended" or "No-Show" |

**Removed:**
- Reduced opacity (`opacity-75`) from current past cards
- Stripped-down layout of current past section
- Cancel and Add to Calendar actions (not relevant for past events)

### Section Heading
"History" replaces "Past (count)" as the section heading.

---

## Implementation Notes

- File to modify: `src/pages/parent/Dashboard.tsx`
- No new data fetching — past signups are already loaded and split from upcoming on the dashboard
- Reuse the same card structure as Upcoming cards, just without the Cancel and Add to Calendar action buttons
- Sort history most recent first (same as current Past section)

---

## Out of Scope

- Summary stats (total events, hours volunteered)
- A dedicated history page or sidebar route
- Filtering or searching history
- Pagination (acceptable to show all past signups at current scale)

---

## Success Criteria

- "History" section replaces the "Past" section on the volunteer dashboard
- History cards show full event details: title, date, slot name, slot time, and check-in status
- Cards are full opacity — not faded
- No cancel or calendar actions on history cards
- History is sorted most recent first
