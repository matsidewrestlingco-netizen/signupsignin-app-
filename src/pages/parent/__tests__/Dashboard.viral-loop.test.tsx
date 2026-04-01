import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../contexts/OrgContext', () => ({
  useOrg: vi.fn(),
}));

vi.mock('../../../hooks/useSignups', () => ({
  useMySignups: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('../../../lib/firebase', () => ({ db: {} }));
vi.mock('../../../components/StatusBadge', () => ({ StatusBadge: () => null }));
vi.mock('../../../components/ConfirmModal', () => ({ ConfirmModal: () => null }));
vi.mock('../../../components/AddToCalendar', () => ({ AddToCalendar: () => null }));

import { ParentDashboard } from '../Dashboard';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrg } from '../../../contexts/OrgContext';
import { useMySignups } from '../../../hooks/useSignups';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseOrg = useOrg as ReturnType<typeof vi.fn>;
const mockUseMySignups = useMySignups as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ currentUser: { uid: 'user1' } });
  mockUseOrg.mockReturnValue({ currentOrg: { id: 'org1' } });
  mockUseMySignups.mockReturnValue({
    signups: [],
    loading: false,
    error: null,
    cancelSignup: vi.fn(),
  });
});

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
