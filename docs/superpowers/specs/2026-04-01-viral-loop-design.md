# Viral Loop — Create Your Own Org CTA

**Goal:** Surface a subtle "Want to run your own events?" link in two places so volunteers organically discover they can create their own organization on SignupSignin.

**Architecture:** Two static text additions — one in the public EventDetail page, one in the parent Dashboard. No new components, no conditional logic, no state.

---

## Placement 1: `src/pages/EventDetail.tsx`

Add a centered muted text line at the bottom of the main content area, just above the `<Footer />`:

```tsx
<p className="mt-8 text-center text-sm text-gray-400">
  Want to run your own events?{' '}
  <Link to="/setup/organization" className="text-gray-500 hover:text-gray-700">
    Create an organization →
  </Link>
</p>
```

Always visible — no conditions on auth state or signup state.

---

## Placement 2: `src/pages/parent/Dashboard.tsx`

Add the same line at the bottom of the page content area, below the signups list:

```tsx
<p className="mt-8 text-center text-sm text-gray-400">
  Want to run your own events?{' '}
  <Link to="/setup/organization" className="text-gray-500 hover:text-gray-700">
    Create an organization →
  </Link>
</p>
```

Always visible to all logged-in users, including existing admins.

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/EventDetail.tsx` | Add CTA line above Footer |
| `src/pages/parent/Dashboard.tsx` | Add CTA line below signups list |

## Out of Scope

- Hiding the link from existing admins
- Post-signup-only visibility on EventDetail
- Shared component abstraction
- Analytics / click tracking
