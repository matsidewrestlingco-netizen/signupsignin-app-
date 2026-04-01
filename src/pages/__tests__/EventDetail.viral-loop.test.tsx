import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  connectFunctionsEmulator: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(() => ({ orgId: 'org1', eventId: 'event1' })),
  useNavigate: vi.fn(() => vi.fn()),
  useLocation: vi.fn(() => ({ pathname: '/test', state: null })),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
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

vi.mock('../../lib/firebase', () => ({ db: {} }));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/useSignups', () => ({
  useSignups: vi.fn(() => ({ createSignup: vi.fn() })),
}));

vi.mock('../../components/SlotCard', () => ({ SlotCard: () => null }));
vi.mock('../../components/AddToCalendar', () => ({ AddToCalendar: () => null }));

import { EventDetail } from '../EventDetail';
import { useAuth } from '../../contexts/AuthContext';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    currentUser: null,
    userProfile: null,
    refreshProfile: vi.fn(),
  });
});

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
