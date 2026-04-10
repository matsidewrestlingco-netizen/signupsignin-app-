# Support Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/support` page with accordion FAQs, update all contact emails to `support@matside.org`, and add a Support link to the Footer.

**Architecture:** One new static page component (`Support.tsx`) with a small inline `FaqItem` accordion component using `useState`. The route is registered under the existing `PublicLayout` in `App.tsx`. The Footer gets a second link alongside the existing Privacy Policy link.

**Tech Stack:** React, TypeScript, Tailwind CSS, React Router, Vitest + Testing Library

---

## File Map

| File | Action |
|------|--------|
| `src/pages/Support.tsx` | Create — new page with accordion FAQs |
| `src/pages/__tests__/Support.test.tsx` | Create — render + interaction tests |
| `src/App.tsx` | Modify — register `/support` route |
| `src/components/Footer.tsx` | Modify — add Support link |
| `src/components/__tests__/Footer.test.tsx` | Modify — assert Support link |
| `src/pages/PrivacyPolicy.tsx` | Modify — update email to support@matside.org |
| `src/pages/__tests__/PrivacyPolicy.test.tsx` | Modify — update email assertion |

---

## Task 1: Update contact email in PrivacyPolicy

**Files:**
- Modify: `src/pages/PrivacyPolicy.tsx`
- Modify: `src/pages/__tests__/PrivacyPolicy.test.tsx`

- [ ] **Step 1: Update the test assertion first**

In `src/pages/__tests__/PrivacyPolicy.test.tsx`, change the contact email test:

```tsx
it('renders the contact email address', () => {
  render(<PrivacyPolicy />);
  const links = screen.getAllByRole('link', { name: /support@matside\.org/i });
  expect(links.length).toBeGreaterThan(0);
  expect(links[0]).toHaveAttribute('href', 'mailto:support@matside.org');
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- --reporter=verbose src/pages/__tests__/PrivacyPolicy.test.tsx
```

Expected: FAIL — "renders the contact email address" (no links matching `support@matside.org`)

- [ ] **Step 3: Update all three email instances in PrivacyPolicy.tsx**

In `src/pages/PrivacyPolicy.tsx`, replace every occurrence of `daniel@matside.org` with `support@matside.org`. There are 3 link instances (lines ~98, ~118, ~149) — each has both an `href` attribute and display text:

```tsx
{/* Your Rights section */}
<a href="mailto:support@matside.org" className="text-primary-600 hover:underline">
  support@matside.org
</a>

{/* Children's Privacy section */}
<a href="mailto:support@matside.org" className="text-primary-600 hover:underline">
  support@matside.org
</a>

{/* Contact Us section */}
<a href="mailto:support@matside.org" className="text-primary-600 hover:underline">
  support@matside.org
</a>
```

- [ ] **Step 4: Run the tests and verify they pass**

```bash
npm test -- --reporter=verbose src/pages/__tests__/PrivacyPolicy.test.tsx
```

Expected: PASS — all 4 tests green

- [ ] **Step 5: Commit**

```bash
git add src/pages/PrivacyPolicy.tsx src/pages/__tests__/PrivacyPolicy.test.tsx
git commit -m "fix: update contact email to support@matside.org in PrivacyPolicy"
```

---

## Task 2: Create the Support page (TDD)

**Files:**
- Create: `src/pages/__tests__/Support.test.tsx`
- Create: `src/pages/Support.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/__tests__/Support.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Support } from '../Support';

describe('Support', () => {
  it('renders the page heading', () => {
    render(<Support />);
    expect(screen.getByRole('heading', { level: 1, name: /support/i })).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<Support />);
    expect(screen.getByText(/we're here to help/i)).toBeInTheDocument();
  });

  it('renders both FAQ group headings', () => {
    render(<Support />);
    expect(screen.getByRole('heading', { level: 2, name: /volunteers & parents/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /organization admins/i })).toBeInTheDocument();
  });

  it('renders all six FAQ questions', () => {
    render(<Support />);
    expect(screen.getByText(/how do i sign up for an event/i)).toBeInTheDocument();
    expect(screen.getByText(/i didn't receive my confirmation email/i)).toBeInTheDocument();
    expect(screen.getByText(/i forgot my password/i)).toBeInTheDocument();
    expect(screen.getByText(/how do i create an organization/i)).toBeInTheDocument();
    expect(screen.getByText(/how do i add or manage events/i)).toBeInTheDocument();
    expect(screen.getByText(/how do i send reminder emails/i)).toBeInTheDocument();
  });

  it('FAQ answers are hidden by default', () => {
    render(<Support />);
    expect(screen.queryByText(/browse to your organization's event page/i)).not.toBeInTheDocument();
  });

  it('clicking a FAQ question reveals its answer', () => {
    render(<Support />);
    const question = screen.getByText(/how do i sign up for an event/i);
    fireEvent.click(question);
    expect(screen.getByText(/browse to your organization's event page/i)).toBeInTheDocument();
  });

  it('clicking the same FAQ question again hides its answer', () => {
    render(<Support />);
    const question = screen.getByText(/how do i sign up for an event/i);
    fireEvent.click(question);
    fireEvent.click(question);
    expect(screen.queryByText(/browse to your organization's event page/i)).not.toBeInTheDocument();
  });

  it('renders the contact email link', () => {
    render(<Support />);
    const link = screen.getByRole('link', { name: /support@matside\.org/i });
    expect(link).toHaveAttribute('href', 'mailto:support@matside.org');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- --reporter=verbose src/pages/__tests__/Support.test.tsx
```

Expected: FAIL — "Cannot find module '../Support'"

- [ ] **Step 3: Create Support.tsx**

Create `src/pages/Support.tsx`:

```tsx
import { useState } from 'react';

interface FaqItemProps {
  question: string;
  answer: string;
}

function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-gray-900 hover:text-gray-700"
      >
        <span>{question}</span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-600 leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

export function Support() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Support</h1>
        <p className="text-sm text-gray-500 mb-10">We're here to help.</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Volunteers &amp; Parents</h2>
            <div>
              <FaqItem
                question="How do I sign up for an event?"
                answer={`Browse to your organization's event page, find the event, and click "Sign Up." You'll receive a confirmation email once registered.`}
              />
              <FaqItem
                question="I didn't receive my confirmation email."
                answer="Check your spam folder. If it's not there, email us at support@matside.org and we'll confirm your registration manually."
              />
              <FaqItem
                question="I forgot my password."
                answer={`Use the "Forgot Password" link on the login page. A reset email will be sent to your address.`}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Organization Admins</h2>
            <div>
              <FaqItem
                question="How do I create an organization?"
                answer="After signing up, follow the setup flow to create your organization. You'll be the admin automatically."
              />
              <FaqItem
                question="How do I add or manage events?"
                answer={`From your admin dashboard, go to Events and click "New Event" to create one, or click an existing event to edit it.`}
              />
              <FaqItem
                question="How do I send reminder emails to volunteers?"
                answer={`Open the event in your admin dashboard and use the "Send Reminder" button to blast a reminder to all signed-up volunteers.`}
              />
            </div>
          </section>

          <section>
            <p className="text-sm text-gray-600 leading-relaxed">
              For any other questions or issues, please reach out to{' '}
              <a href="mailto:support@matside.org" className="text-primary-600 hover:underline">
                support@matside.org
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests and verify they pass**

```bash
npm test -- --reporter=verbose src/pages/__tests__/Support.test.tsx
```

Expected: PASS — all 8 tests green

- [ ] **Step 5: Commit**

```bash
git add src/pages/Support.tsx src/pages/__tests__/Support.test.tsx
git commit -m "feat: add Support page with accordion FAQs"
```

---

## Task 3: Register /support route in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the import**

In `src/App.tsx`, add the Support import alongside the other public page imports (after the PrivacyPolicy import line):

```tsx
import { Support } from './pages/Support';
```

- [ ] **Step 2: Register the route**

In `src/App.tsx`, inside the `PublicLayout` route block (after the `/privacy` route), add:

```tsx
<Route path="/support" element={<Support />} />
```

The block should look like:

```tsx
<Route element={<ErrorBoundary><PublicLayout /></ErrorBoundary>}>
  <Route path="/" element={<Landing />} />
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<SignUp />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  <Route path="/events/:orgId" element={<Events />} />
  <Route path="/event/:orgId/:eventId" element={<EventDetail />} />
  <Route path="/privacy" element={<PrivacyPolicy />} />
  <Route path="/support" element={<Support />} />
</Route>
```

- [ ] **Step 3: Run the full test suite to confirm nothing broke**

```bash
npm test -- --reporter=verbose
```

Expected: all tests pass (no new test needed — the route is verified by the Support page tests and the browser)

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register /support route in App"
```

---

## Task 4: Add Support link to Footer

**Files:**
- Modify: `src/components/Footer.tsx`
- Modify: `src/components/__tests__/Footer.test.tsx`

- [ ] **Step 1: Update the Footer test first**

In `src/components/__tests__/Footer.test.tsx`, add a second test after the existing Privacy Policy test:

```tsx
it('renders a Support link pointing to /support', () => {
  render(<Footer />);
  const link = screen.getByRole('link', { name: /support/i });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', '/support');
});
```

- [ ] **Step 2: Run the Footer test to verify it fails**

```bash
npm test -- --reporter=verbose src/components/__tests__/Footer.test.tsx
```

Expected: FAIL — "renders a Support link pointing to /support" (no Support link in Footer yet)

- [ ] **Step 3: Add the Support link to Footer.tsx**

In `src/components/Footer.tsx`, update the copyright paragraph to add the Support link after the Privacy Policy link:

```tsx
<p className="text-center text-sm text-gray-500">
  &copy; {new Date().getFullYear()} SignUpSignIn. Simple event registration and check-in.{' '}
  <span className="text-gray-400">v{__APP_VERSION__}</span>
  {' · '}
  <Link to="/privacy" className="text-gray-400 hover:text-gray-600">
    Privacy Policy
  </Link>
  {' · '}
  <Link to="/support" className="text-gray-400 hover:text-gray-600">
    Support
  </Link>
</p>
```

- [ ] **Step 4: Run the Footer tests to verify they pass**

```bash
npm test -- --reporter=verbose src/components/__tests__/Footer.test.tsx
```

Expected: PASS — both tests green

- [ ] **Step 5: Run the full test suite**

```bash
npm test -- --reporter=verbose
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/Footer.tsx src/components/__tests__/Footer.test.tsx
git commit -m "feat: add Support link to Footer"
```
