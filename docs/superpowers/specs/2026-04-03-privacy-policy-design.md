# Privacy Policy Page — Design Spec

**Date:** 2026-04-03
**Status:** Approved

## Overview

Add a `/privacy` route to SignupSignIn that renders a full privacy policy page. Add a "Privacy Policy" link in the site footer. The page is public (no auth required) and uses the existing `PublicLayout`.

## Files

| File | Change |
|------|--------|
| `src/pages/PrivacyPolicy.tsx` | New — privacy policy content page |
| `src/App.tsx` | Add `/privacy` route under `PublicLayout` |
| `src/components/Footer.tsx` | Add `<Link to="/privacy">Privacy Policy</Link>` |

## Routing

`/privacy` is added to the public route group in `App.tsx` (alongside `/login`, `/signup`, etc.), wrapped in `PublicLayout` so it inherits the Footer.

## Page Layout & Styling

- Wrapper: `max-w-3xl mx-auto px-6 py-12 bg-white`
- No sidebar, no hero — clean prose layout
- Section headings: `h2`, `text-xl font-semibold text-gray-900`
- Body text: `text-gray-600 text-sm leading-relaxed`
- Section spacing: `space-y-8`

## Footer Change

Add a subtle `Privacy Policy` link in small gray text next to the copyright line. Uses React Router `<Link to="/privacy">`.

## Privacy Policy Content

Ten sections, hybrid plain-English + legal style:

1. **Introduction** — what SignupSignIn is, effective date (April 3, 2026)
2. **Information We Collect** — account info (email, name via Firebase Auth), event signup data (name, email in Firestore), organization membership
3. **How We Use Your Information** — provide the service, send confirmation/reminder emails, improve the product
4. **Third-Party Services** — Firebase/Google (Auth, Firestore, Hosting), Resend (transactional email); links to their privacy policies
5. **Data Sharing** — data is not sold; only shared with the processors listed above
6. **Data Retention** — account data retained while account is active; signup records retained per the organization's needs
7. **Your Rights** — request access, correction, or deletion via `daniel@matside.org`; note that EU users have additional rights under GDPR
8. **Children's Privacy** — service not directed at children under 13; no knowing collection of data from minors directly
9. **Security** — industry-standard measures (Firebase security, encrypted connections); no absolute guarantee language
10. **Changes & Contact** — effective date updated on material changes; contact `daniel@matside.org`

## Contact Email

`daniel@matside.org` — to be updated when a dedicated support inbox is created.
