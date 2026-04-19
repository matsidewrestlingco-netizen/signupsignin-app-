# SignupSignin Roadmap

A running list of planned enhancements, ideas from testers, and feature requests.

---

## Dev Cycle

- **150 hours** allocated per quarter
- **25 hours** reserved per quarter for ad-hoc fixes and spur-of-the-moment ideas
- **125 hours** available for planned features per quarter

---

## Q2 2026 (Apr – Jun) — 84 planned hrs + 25 ad-hoc = 109 hrs

| # | Feature | Est. Hours | Difficulty | Description | Source |
|---|---------|-----------|------------|-------------|--------|
| 1 | Past Events View | 6 hrs | Easiest | Dedicated view for completed/past events with their full signup history. Data already exists in Firestore — just needs a date filter and a UI toggle. Lets admins reference historical participation and use past events as a starting point. | Competitor reviews |
| 2 | QR Code Generation | 9 hrs | Easy | Generate a scannable QR code for any public event page. No backend changes — just a QR library on the frontend. SignupGenius paywalls this; offering it free is a strong differentiator. Useful for flyers, bulletin boards, and day-of check-in. | Competitor reviews |
| 3 | Duplicate Event | 13 hrs | Easy–Moderate | One-click copy of an existing event (title, slots, settings) to quickly create a new one without rebuilding from scratch. Distinct from templates — works directly on a specific past event. | Competitor reviews |
| 4 | Edit Template | 15 hrs | Easy–Moderate | Allow admins to edit an existing template without having to delete and recreate it. Same form as create, pre-populated — requires adding an updateTemplate function. | Internal |
| 5 | Volunteer Participation History | 18 hrs | Moderate | Show volunteers a history of all events they've signed up for and attended. Data already in Firestore — needs a new view in the parent dashboard. Builds engagement and lets volunteers track their own contributions. | Competitor reviews |
| 6 | Bulk Slot Creation | 23 hrs | Moderate | Tool to generate multiple time slots at once (e.g., every 30 min from 9am–12pm, 2 volunteers each). Reduces the manual slot-by-slot setup that reviewers found tedious. No data model changes needed. | Competitor reviews |

---

## Q3 2026 (Jul – Sep) — 100 planned hrs + 25 ad-hoc = 125 hrs

| # | Feature | Est. Hours | Difficulty | Description | Source |
|---|---------|-----------|------------|-------------|--------|
| 7 | RSVP / Attendance Format | 45 hrs | Moderate–Hard | Simple "can you attend?" event type, not just volunteer slot signups. Useful for banquets, meetings, and events where headcount matters more than role assignment. Requires a new event type, data model changes, and a new public-facing signup flow. | Competitor reviews |
| 8 | Starter Template Packs | 55 hrs | Hard | Curated template libraries that super admin can push to new orgs at onboarding. Sport-agnostic design — wrestling pack first (tournaments, dual meets, fundraisers, match nights, banquets), expandable to lacrosse, other sports, and community events. Requires new platform-level Firestore collections and a push-to-org mechanism. | Daniel |

---

## Q4 2026 (Oct – Dec) — 105 planned hrs + 25 ad-hoc = 130 hrs

| # | Feature | Est. Hours | Difficulty | Description | Source |
|---|---------|-----------|------------|-------------|--------|
| 9 | Template Marketplace | 40 hrs | Hard | Self-serve library where org admins can browse and import template packs. Full discovery/browse/import UI. Long-term follow-on to Starter Template Packs. | Daniel |
| 10 | SMS / Text Notifications | 65 hrs | Hardest | Send volunteer reminders and confirmations via text in addition to email. Requires a third-party service (e.g. Twilio), phone number collection, and opt-in compliance with TCPA regulations. | Competitor reviews |

---

## Completed

| Feature | Shipped |
|---------|---------|
| Day-of Roster (check-in) | Mar 2026 |
| Email confirmations & reminders | Apr 2026 |
| Viral loop (org discovery) | Apr 2026 |
| Privacy Policy page | Apr 2026 |
| Support page | Apr 2026 |
| iOS app (Phase 1–4) | Apr 2026 |
| Volunteer names on signup page | Apr 2026 |
