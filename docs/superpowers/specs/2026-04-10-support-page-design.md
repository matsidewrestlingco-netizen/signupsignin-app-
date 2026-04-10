# Support Page Design

**Date:** 2026-04-10
**Status:** Approved
**Motivation:** Required support URL for Apple App Store submission.

---

## Overview

Add a public `/support` page at `www.signupsignin.com/support`. The page displays an accordion FAQ section (two groups: volunteers/parents and admins) and a plain contact line at the bottom. No backend, no form — fully static.

Additionally, update all instances of `daniel@matside.org` to `support@matside.org` across the codebase, and add a "Support" link to the Footer.

---

## Route & Files

| File | Change |
|------|--------|
| `src/pages/Support.tsx` | New page component (named export `Support`) |
| `src/App.tsx` | Register `/support` under `PublicLayout` |
| `src/components/Footer.tsx` | Add "Support" link next to "Privacy Policy" |
| `src/pages/PrivacyPolicy.tsx` | Update `daniel@matside.org` → `support@matside.org` |
| `src/pages/__tests__/Support.test.tsx` | Render tests |

---

## Page Structure

### Header
- `<h1>` — "Support"
- Subtitle — "We're here to help."

### FAQ Accordion

Each FAQ item is a collapsible toggle: question visible by default, answer expands on click. Implemented as a small inline component (`FaqItem`) within `Support.tsx` using local `useState`.

**Group 1 — Volunteers & Parents**

1. **How do I sign up for an event?**
   Browse to your organization's event page, find the event, and click "Sign Up." You'll receive a confirmation email once registered.

2. **I didn't receive my confirmation email.**
   Check your spam folder. If it's not there, email us at support@matside.org and we'll confirm your registration manually.

3. **I forgot my password.**
   Use the "Forgot Password" link on the login page. A reset email will be sent to your address.

**Group 2 — Organization Admins**

4. **How do I create an organization?**
   After signing up, follow the setup flow to create your organization. You'll be the admin automatically.

5. **How do I add or manage events?**
   From your admin dashboard, go to Events and click "New Event" to create one, or click an existing event to edit it.

6. **How do I send reminder emails to volunteers?**
   Open the event in your admin dashboard and use the "Send Reminder" button to blast a reminder to all signed-up volunteers.

### Contact Line

> For any other questions or issues, please reach out to [support@matside.org](mailto:support@matside.org).

---

## Styling

Matches `PrivacyPolicy.tsx` conventions:
- `min-h-screen bg-white` wrapper
- `max-w-3xl mx-auto px-6 py-12` content container
- `text-3xl font-bold text-gray-900` for the `<h1>`
- Group labels: `text-xl font-semibold text-gray-900`
- FAQ question buttons: full-width, left-aligned, with an inline SVG chevron that rotates on open (no icon library — inline SVG only, consistent with existing codebase)
- FAQ answer: `text-sm text-gray-600 leading-relaxed`
- Contact email: `text-primary-600 hover:underline`

---

## Email Updates

Replace `daniel@matside.org` → `support@matside.org` in:
- `src/pages/PrivacyPolicy.tsx` (3 link instances — `href` + display text each)
- `src/pages/__tests__/PrivacyPolicy.test.tsx` (1 occurrence — the `href` assertion)

---

## Tests (`src/pages/__tests__/Support.test.tsx`)

- Renders without crashing
- Displays the "Support" heading
- Renders all 6 FAQ questions
- Renders the contact email link pointing to `mailto:support@matside.org`
- Each FAQ answer is hidden by default; clicking the question reveals the answer
