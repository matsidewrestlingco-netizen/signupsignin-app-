import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user1' },
    userProfile: { name: 'Alice', email: 'alice@test.com', organizations: { org1: 'member' } },
  }),
}));
jest.mock('../../contexts/OrgContext', () => ({
  useOrg: () => ({
    currentOrg: { id: 'org1', name: 'Test Org', type: 'Wrestling', ownerId: 'u0', createdAt: new Date() },
  }),
}));
jest.mock('../../hooks/useEvents', () => ({
  useEvents: () => ({
    events: [
      { id: 'e1', title: 'Spring Tournament', startTime: new Date(Date.now() + 86400000),
        location: 'Main Gym', description: '', isPublic: true, createdAt: new Date() },
    ],
  }),
}));

const mockCancelSignup = jest.fn().mockResolvedValue(undefined);
let mockSignups = [
  { id: 's1', eventId: 'e1', slotId: 'slot1', userId: 'user1',
    userName: 'Alice', userEmail: 'alice@test.com', note: '',
    checkedIn: false, createdAt: new Date() },
];
jest.mock('../../hooks/useSignups', () => ({
  useMySignups: () => ({
    get signups() { return mockSignups; },
    loading: false,
    cancelSignup: mockCancelSignup,
  }),
}));

import VolunteerMySignups from '../../app/(volunteer)/my-signups';

describe('VolunteerMySignups', () => {
  beforeEach(() => {
    mockSignups = [
      { id: 's1', eventId: 'e1', slotId: 'slot1', userId: 'user1',
        userName: 'Alice', userEmail: 'alice@test.com', note: '',
        checkedIn: false, createdAt: new Date() },
    ];
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('renders header', () => {
    const { getByText } = render(<VolunteerMySignups />);
    expect(getByText('My Signups')).toBeTruthy();
  });

  it('shows upcoming signup with event title', () => {
    const { getByText } = render(<VolunteerMySignups />);
    expect(getByText('Spring Tournament')).toBeTruthy();
  });

  it('shows Cancel button for upcoming signup', () => {
    const { getByText } = render(<VolunteerMySignups />);
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('pressing Cancel triggers Alert.alert', () => {
    const { getByText } = render(<VolunteerMySignups />);
    fireEvent.press(getByText('Cancel'));
    expect(Alert.alert).toHaveBeenCalledWith(
      expect.stringMatching(/cancel/i),
      expect.any(String),
      expect.any(Array)
    );
  });

  it('shows empty state when no signups', () => {
    mockSignups = [];
    const { getByText } = render(<VolunteerMySignups />);
    expect(getByText('No signups yet')).toBeTruthy();
  });
});
