import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), connectAuthEmulator: vi.fn() }));
vi.mock('firebase/functions', () => ({ getFunctions: vi.fn(), connectFunctionsEmulator: vi.fn() }));

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(() => ({ orgId: 'org1', eventId: 'event1' })),
  useNavigate: vi.fn(() => vi.fn()),
  useLocation: vi.fn(() => ({ pathname: '/test', state: null })),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('../../lib/firebase', () => ({ db: {} }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ currentUser: null, userProfile: null, refreshProfile: vi.fn() })),
}));
vi.mock('../../hooks/useSignups', () => ({
  useSignups: vi.fn(() => ({ createSignup: vi.fn() })),
}));
vi.mock('../../components/AddToCalendar', () => ({ AddToCalendar: () => null }));

// Mock SlotCard to expose volunteerNames prop for testing
vi.mock('../../components/SlotCard', () => ({
  SlotCard: ({ volunteerNames }: { volunteerNames?: string[] }) => (
    <div data-testid="slot-card">
      {volunteerNames?.map((name, i) => (
        <span key={i} data-testid="volunteer-name">{name}</span>
      ))}
    </div>
  ),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  where: vi.fn(),
  updateDoc: vi.fn(),
  getCountFromServer: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
  Timestamp: { fromDate: vi.fn() },
}));

import { getDocs, getDoc } from 'firebase/firestore';
import { EventDetail } from '../EventDetail';

const mockGetDoc = getDoc as ReturnType<typeof vi.fn>;
const mockGetDocs = getDocs as ReturnType<typeof vi.fn>;

function makeEventDoc(showVolunteerNames: boolean) {
  return {
    exists: () => true,
    data: () => ({
      title: 'Test Tournament',
      startTime: { toDate: () => new Date('2026-06-01T10:00:00') },
      isPublic: true,
      showVolunteerNames,
      name: 'Test Org',
      branding: { primaryColor: '#243c7c' },
    }),
  };
}

const slotDoc = {
  id: 'slot1',
  data: () => ({
    name: 'Scorer',
    category: 'Officials',
    quantityTotal: 2,
    quantityFilled: 1,
    description: '',
    createdAt: { toDate: () => new Date() },
  }),
};

const signupDoc = {
  data: () => ({ slotId: 'slot1', userName: 'Daniel Emmons' }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EventDetail volunteer names', () => {
  it('passes volunteer names to SlotCard when showVolunteerNames is true', async () => {
    // First getDoc = event, second getDoc = org
    mockGetDoc
      .mockResolvedValueOnce(makeEventDoc(true))
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Test Org', branding: { primaryColor: '#243c7c' } }) });

    // First getDocs = slots, second getDocs = signups
    mockGetDocs
      .mockResolvedValueOnce({ docs: [slotDoc] })
      .mockResolvedValueOnce({ forEach: (fn: (d: typeof signupDoc) => void) => fn(signupDoc) });

    render(<EventDetail />);

    const name = await screen.findByTestId('volunteer-name');
    expect(name).toHaveTextContent('Daniel Emmons');
  });

  it('does not fetch signups when showVolunteerNames is false', async () => {
    mockGetDoc
      .mockResolvedValueOnce(makeEventDoc(false))
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Test Org', branding: { primaryColor: '#243c7c' } }) });

    mockGetDocs.mockResolvedValueOnce({ docs: [slotDoc] });

    render(<EventDetail />);

    await screen.findByTestId('slot-card');

    // getDocs should only be called once (slots), not twice (slots + signups)
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });

  it('renders slots normally if signups query throws', async () => {
    mockGetDoc
      .mockResolvedValueOnce(makeEventDoc(true))
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Test Org', branding: { primaryColor: '#243c7c' } }) });

    mockGetDocs
      .mockResolvedValueOnce({ docs: [slotDoc] })
      .mockRejectedValueOnce(new Error('Firestore error'));

    render(<EventDetail />);

    // Slot card still renders despite the failed signups query
    expect(await screen.findByTestId('slot-card')).toBeInTheDocument();
    expect(screen.queryByTestId('volunteer-name')).toBeNull();
  });
});
