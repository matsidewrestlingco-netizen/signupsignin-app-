# Privacy Policy Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/privacy` route with a full privacy policy page and a "Privacy Policy" link in the site footer.

**Architecture:** A new static `PrivacyPolicy` component is added to the public route group in `App.tsx` (wrapped by `PublicLayout`), matching the existing pattern for pages like `/login` and `/signup`. The Footer gains a React Router `Link` to `/privacy`. No new dependencies.

**Tech Stack:** React 19, React Router DOM v7, TypeScript, Tailwind CSS v4, Vitest + @testing-library/react

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pages/PrivacyPolicy.tsx` | Create | Static privacy policy content page |
| `src/pages/__tests__/PrivacyPolicy.test.tsx` | Create | Tests for PrivacyPolicy component |
| `src/components/Footer.tsx` | Modify | Add Privacy Policy link |
| `src/components/__tests__/Footer.test.tsx` | Create | Tests for Footer privacy link |
| `src/App.tsx` | Modify | Register `/privacy` route under PublicLayout |

---

### Task 1: Write failing test for PrivacyPolicy component

**Files:**
- Create: `src/pages/__tests__/PrivacyPolicy.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// src/pages/__tests__/PrivacyPolicy.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyPolicy } from '../PrivacyPolicy';

describe('PrivacyPolicy', () => {
  it('renders the page heading', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument();
  });

  it('renders the effective date', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText(/effective date/i)).toBeInTheDocument();
  });

  it('renders all ten section headings', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByRole('heading', { level: 2, name: /introduction/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /information we collect/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /how we use your information/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /third-party services/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /data sharing/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /data retention/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /your rights/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /children's privacy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /security/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /contact us/i })).toBeInTheDocument();
  });

  it('renders the contact email address', () => {
    render(<PrivacyPolicy />);
    const links = screen.getAllByRole('link', { name: /daniel@matside\.org/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', 'mailto:daniel@matside.org');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- PrivacyPolicy.test
```

Expected output: FAIL — `Cannot find module '../PrivacyPolicy'`

---

### Task 2: Implement the PrivacyPolicy component

**Files:**
- Create: `src/pages/PrivacyPolicy.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/pages/PrivacyPolicy.tsx
export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Effective date: April 3, 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Introduction</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              SignupSignIn ("we," "us," or "our") is a volunteer event signup and check-in platform
              for organizations. This Privacy Policy explains what information we collect, how we
              use it, and your rights regarding your data. By using SignupSignIn, you agree to the
              practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Information We Collect</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              We collect information you provide directly when you use the service:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 leading-relaxed space-y-1">
              <li><strong>Account information:</strong> your email address and password (managed via Firebase Authentication)</li>
              <li><strong>Profile information:</strong> your name, as provided when signing up for events</li>
              <li><strong>Event signup data:</strong> the events you register for and your attendance records, stored in association with your name and email</li>
              <li><strong>Organization membership:</strong> which organizations you are associated with on the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-sm text-gray-600 leading-relaxed space-y-1">
              <li>To provide and operate the SignupSignIn service</li>
              <li>To send you event confirmation and reminder emails</li>
              <li>To allow organization administrators to manage event rosters and check-in</li>
              <li>To improve the platform over time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Third-Party Services</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              We use the following third-party services to operate SignupSignIn:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 leading-relaxed space-y-1">
              <li>
                <strong>Firebase (Google):</strong> authentication, database, and hosting.{' '}
                <a
                  href="https://firebase.google.com/support/privacy"
                  className="text-primary-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Firebase Privacy Policy
                </a>
              </li>
              <li>
                <strong>Resend:</strong> transactional email delivery (confirmations and reminders).{' '}
                <a
                  href="https://resend.com/legal/privacy-policy"
                  className="text-primary-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Resend Privacy Policy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Sharing</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We do not sell your personal information. Your data is shared only with the
              third-party service providers listed above, solely to operate the platform.
              Organization administrators can see the names and email addresses of volunteers who
              sign up for their events.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Retention</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We retain your account data for as long as your account is active. Event signup
              records are retained at the discretion of the organization that manages the event.
              You may request deletion of your account and associated data at any time by
              contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              You have the right to access, correct, or request deletion of your personal
              information. To exercise these rights, email us at{' '}
              <a href="mailto:daniel@matside.org" className="text-primary-600 hover:underline">
                daniel@matside.org
              </a>
              .
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              If you are located in the European Union, you may have additional rights under the
              General Data Protection Regulation (GDPR), including the right to data portability
              and the right to lodge a complaint with a supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Children's Privacy</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              SignupSignIn is not directed at children under the age of 13. We do not knowingly
              collect personal information directly from children under 13. The platform is
              intended to be used by adults (such as parents or coaches) who may register on
              behalf of minors. If you believe we have inadvertently collected information from a
              child under 13, please contact us at{' '}
              <a href="mailto:daniel@matside.org" className="text-primary-600 hover:underline">
                daniel@matside.org
              </a>{' '}
              and we will promptly delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Security</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We use industry-standard security measures to protect your information, including
              Firebase's secure infrastructure and encrypted HTTPS connections. No method of
              transmission over the internet is 100% secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Changes to This Policy</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. When we do, we will revise the
              effective date at the top of this page. We encourage you to review this policy
              periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              If you have questions or concerns about this Privacy Policy or your data, please
              contact us at{' '}
              <a href="mailto:daniel@matside.org" className="text-primary-600 hover:underline">
                daniel@matside.org
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

- [ ] **Step 2: Run the tests and confirm they pass**

```bash
npm test -- PrivacyPolicy.test
```

Expected output: PASS — 4 tests pass

- [ ] **Step 3: Commit**

```bash
git add src/pages/PrivacyPolicy.tsx src/pages/__tests__/PrivacyPolicy.test.tsx
git commit -m "feat: add PrivacyPolicy page component"
```

---

### Task 3: Write failing test for Footer privacy link

**Files:**
- Create: `src/components/__tests__/Footer.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// src/components/__tests__/Footer.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// __APP_VERSION__ is injected by Vite at build time; define it for the test environment
(globalThis as Record<string, unknown>).__APP_VERSION__ = '1.0.0';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

import Footer from '../Footer';

describe('Footer', () => {
  it('renders a Privacy Policy link pointing to /privacy', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: /privacy policy/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/privacy');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- Footer.test
```

Expected output: FAIL — `Unable to find an accessible element with the role "link" and name /privacy policy/i`

---

### Task 4: Add Privacy Policy link to Footer

**Files:**
- Modify: `src/components/Footer.tsx`

- [ ] **Step 1: Add the Link import and privacy link**

Replace the entire file content with:

```tsx
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import pghSkyline from '../assets/pgh_skyline.png';

const pittsburghTaglines = [
  'Made in Pittsburgh. Deployed Everywhere.',
  'Built in the 412.',
  'PGH Built. Internet Ready.',
  'Crafted in Pittsburgh, Shipped to the Cloud.',
  'Forged in the Steel City, Powered by Wi-Fi.',
  'From the Three Rivers to Your Browser.',
  'Yinzer-Built, Pixel-Perfect.',
  'Pittsburgh Made. Beta-Tested.',
  'Made in PGH — No Bugs, Just Bridges.',
  'Steel City Code, Worldwide Mode.',
  '412 Crafted. API Attached.',
];

export default function Footer() {
  const tagline = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * pittsburghTaglines.length);
    return pittsburghTaglines[randomIndex];
  }, []);

  return (
    <footer className="border-t border-gray-200 bg-white py-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} SignUpSignIn. Simple event registration and check-in.{' '}
          <span className="text-gray-400">v{__APP_VERSION__}</span>
          {' · '}
          <Link to="/privacy" className="text-gray-400 hover:text-gray-600">
            Privacy Policy
          </Link>
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <img src={pghSkyline} alt="Pittsburgh" className="h-4 w-auto opacity-40" />
          <span className="text-xs text-gray-400">{tagline}</span>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Run the Footer test to confirm it passes**

```bash
npm test -- Footer.test
```

Expected output: PASS — 1 test passes

- [ ] **Step 3: Run all tests to confirm nothing is broken**

```bash
npm test
```

Expected output: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/Footer.tsx src/components/__tests__/Footer.test.tsx
git commit -m "feat: add Privacy Policy link to Footer"
```

---

### Task 5: Register /privacy route in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import PrivacyPolicy and add the route**

Add the import near the other public page imports (around line 16):

```tsx
import { PrivacyPolicy } from './pages/PrivacyPolicy';
```

Add the route inside the `PublicLayout` route group (after the `/event/:orgId/:eventId` route, around line 126):

```tsx
<Route path="/privacy" element={<PrivacyPolicy />} />
```

The public routes block should look like this after the change:

```tsx
{/* Public routes */}
<Route element={<ErrorBoundary><PublicLayout /></ErrorBoundary>}>
  <Route path="/" element={<Landing />} />
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<SignUp />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  <Route path="/events/:orgId" element={<Events />} />
  <Route path="/event/:orgId/:eventId" element={<EventDetail />} />
  <Route path="/privacy" element={<PrivacyPolicy />} />
</Route>
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected output: All tests pass

- [ ] **Step 3: Start dev server and manually verify**

```bash
npm run dev
```

- Open `http://localhost:5173/privacy` — confirm the Privacy Policy page renders with all sections
- Scroll to the footer on any page — confirm "Privacy Policy" link is visible and clicking it navigates to `/privacy`

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register /privacy route in App"
```
