# Viral Loop CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a subtle "Want to run your own events? Create an organization →" text link to both the public EventDetail page and the parent Dashboard page.

**Architecture:** Two static JSX additions — one `<p>` with a `<Link>` in each file. No new components, no conditional logic, no state changes. The parent Dashboard also needs a `Link` import added from react-router-dom.

**Tech Stack:** React, React Router (`Link`), Vitest + @testing-library/react

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/EventDetail.tsx` | Add CTA `<p>` before closing `</main>` |
| `src/pages/parent/Dashboard.tsx` | Add `Link` import + CTA `<p>` before `<ConfirmModal>` |
| `src/pages/__tests__/EventDetail.viral-loop.test.tsx` | New test file |
| `src/pages/parent/__tests__/Dashboard.viral-loop.test.tsx` | New test file |

---

### Task 1: Add viral loop CTA to EventDetail

**Files:**
- Modify: `src/pages/EventDetail.tsx:332-334`
- Test: `src/pages/__tests__/EventDetail.viral-loop.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/__tests__/EventDetail.viral-loop.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(() => ({ orgId: 'org1', eventId: 'event1' })),
  useNavigate: vi.fn(() => vi.fn()),
  useLocation: vi.fn(() => ({ pathname: '/test', state: null })),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      title: 'Test Event',
      startTime: { toDate: () => new Date('2026-06-01T10:00:00') },
      isPublic: true,
      name: 'Test Org',
    }),
  }),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  where: vi.fn(),
  updateDoc: vi.fn(),
  getCountFromServer: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
  Timestamp: { fromDate: vi.fn() },
}));

vi.mock('../lib/firebase', () => ({ db: {} }));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    currentUser: null,
    userProfile: null,
    refreshProfile: vi.fn(),
  })),
}));

vi.mock('../hooks/useSignups', () => ({
  useSignups: vi.fn(() => ({ createSignup: vi.fn() })),
}));

vi.mock('../components/SlotCard', () => ({ SlotCard: () => null }));
vi.mock('../components/AddToCalendar', () => ({ AddToCalendar: () => null }));

import { EventDetail } from '../EventDetail';

describe('EventDetail viral loop CTA', () => {
  it('renders a link to /setup/organization', async () => {
    render(<EventDetail />);
    const link = await screen.findByRole('link', { name: /create an organization/i });
    expect(link).toHaveAttribute('href', '/setup/organization');
  });

  it('renders the CTA prompt text', async () => {
    render(<EventDetail />);
    expect(
      await screen.findByText(/want to run your own events/i)
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/pages/__tests__/EventDetail.viral-loop.test.tsx
```

Expected: FAIL — `Unable to find role="link" with name /create an organization/i`

- [ ] **Step 3: Add CTA to EventDetail**

In `src/pages/EventDetail.tsx`, find the closing `</main>` tag (line ~333). Insert the CTA immediately before it:

```tsx
        )}
        <p className="mt-8 text-center text-sm text-gray-400">
          Want to run your own events?{' '}
          <Link to="/setup/organization" className="text-gray-500 hover:text-gray-700">
            Create an organization →
          </Link>
        </p>
      </main>
    </div>
  );
}
```

`Link` is already imported in this file (`import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'`). No import change needed.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/pages/__tests__/EventDetail.viral-loop.test.tsx
```

Expected: PASS — 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/pages/EventDetail.tsx src/pages/__tests__/EventDetail.viral-loop.test.tsx
git commit -m "feat: add viral loop CTA to event detail page"
```

---

### Task 2: Add viral loop CTA to parent Dashboard

**Files:**
- Modify: `src/pages/parent/Dashboard.tsx:1` (add import) and `:210-212` (add CTA)
- Test: `src/pages/parent/__tests__/Dashboard.viral-loop.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/parent/__tests__/Dashboard.viral-loop.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ currentUser: { uid: 'user1' } })),
}));

vi.mock('../../contexts/OrgContext', () => ({
  useOrg: vi.fn(() => ({ currentOrg: { id: 'org1' } })),
}));

vi.mock('../../hooks/useSignups', () => ({
  useMySignups: vi.fn(() => ({
    signups: [],
    loading: false,
    error: null,
    cancelSignup: vi.fn(),
  })),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('../../lib/firebase', () => ({ db: {} }));
vi.mock('../../components/StatusBadge', () => ({ StatusBadge: () => null }));
vi.mock('../../components/ConfirmModal', () => ({ ConfirmModal: () => null }));
vi.mock('../../components/AddToCalendar', () => ({ AddToCalendar: () => null }));

import { ParentDashboard } from '../Dashboard';

describe('ParentDashboard viral loop CTA', () => {
  it('renders a link to /setup/organization', () => {
    render(<ParentDashboard />);
    expect(
      screen.getByRole('link', { name: /create an organization/i })
    ).toHaveAttribute('href', '/setup/organization');
  });

  it('renders the CTA prompt text', () => {
    render(<ParentDashboard />);
    expect(screen.getByText(/want to run your own events/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/pages/parent/__tests__/Dashboard.viral-loop.test.tsx
```

Expected: FAIL — `Unable to find role="link" with name /create an organization/i`

- [ ] **Step 3: Add Link import to Dashboard**

In `src/pages/parent/Dashboard.tsx`, `react-router-dom` is not yet imported. Add this line after the existing imports:

```tsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useMySignups } from '../../hooks/useSignups';
import type { Signup } from '../../hooks/useSignups';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AddToCalendar } from '../../components/AddToCalendar';
```

- [ ] **Step 4: Add CTA to Dashboard**

In `src/pages/parent/Dashboard.tsx`, find the `<ConfirmModal` block (line ~212). Insert the CTA immediately before it:

```tsx
      )}

      <p className="mt-8 text-center text-sm text-gray-400">
        Want to run your own events?{' '}
        <Link to="/setup/organization" className="text-gray-500 hover:text-gray-700">
          Create an organization →
        </Link>
      </p>

      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancellingId(null);
        }}
        onConfirm={handleCancelSignup}
        title="Cancel Signup"
        message="Are you sure you want to cancel this signup?"
        confirmText="Cancel Signup"
        danger
      />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test src/pages/parent/__tests__/Dashboard.viral-loop.test.tsx
```

Expected: PASS — 2 tests pass

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: all tests pass (currently 15 passing — should now be 19 passing)

- [ ] **Step 7: Commit**

```bash
git add src/pages/parent/Dashboard.tsx src/pages/parent/__tests__/Dashboard.viral-loop.test.tsx
git commit -m "feat: add viral loop CTA to parent dashboard"
```
