# Web Edit Template
**Date:** 2026-04-20
**Roadmap Item:** #4 — Edit Template
**Estimated Effort:** 15 hrs
**Platform:** Web (React / TypeScript)

---

## Context

Admins can currently create and delete templates but cannot edit them. Fixing a typo or adjusting a slot requires deleting and recreating the entire template. This spec adds edit support by extending the existing Create Template form to handle both create and edit modes.

---

## Design

### Entry Point
An **Edit** button is added to each template card on the Templates page (`src/pages/admin/Templates.tsx`). Clicking it opens the Create Template form in edit mode, pre-populated with the template's current values.

### Form Modes

| | Create Mode | Edit Mode |
|---|---|---|
| Fields | Blank | Pre-populated with existing values |
| Submit label | "Create Template" | "Save Changes" |
| Submit action | `addDoc` | `updateDoc` on existing `templateId` |
| Entry point | Existing "New Template" button | New "Edit" button on template card |

All fields are editable in both modes: `name`, `description`, `eventTitle`, `eventDescription`, `eventLocation`, `durationHours`, and the `slots` array.

### Hook Change
`useTemplates.ts` gets an `updateTemplate(templateId, data)` function added alongside the existing `createTemplate` and `deleteTemplate`.

---

## Implementation Notes

- Files to modify: `src/pages/admin/Templates.tsx`, `src/hooks/useTemplates.ts`
- The form component likely needs a `templateId?: string` and `initialValues?: TemplateFormData` prop to distinguish modes — or a single optional `template` prop that covers both
- Firestore path for update: `/organizations/{orgId}/templates/{templateId}`
- No data model changes — same fields as create

---

## Out of Scope

- Editing templates from iOS
- Duplicating templates
- Version history for templates

---

## Success Criteria

- Each template card has an Edit button
- Clicking Edit opens the form pre-populated with the template's current values
- Submitting in edit mode updates the existing Firestore document
- Submitting in create mode behavior is unchanged
- `useTemplates` exposes an `updateTemplate` function
