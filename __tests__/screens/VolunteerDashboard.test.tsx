import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
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
    loading: false,
  }),
}));
jest.mock('../../hooks/useEvents', () => ({
  useEvents: () => ({
    events: [
      { id: 'e1', title: 'Spring Tournament', startTime: new Date(Date.now() + 86400000),
        location: 'Main Gym', description: '', isPublic: true, createdAt: new Date() },
    ],
    loading: false,
  }),
}));
jest.mock('../../hooks/useSignups', () => ({
  useMySignups: () => ({ signups: [], loading: false }),
}));

import VolunteerDashboard from '../../app/(volunteer)/dashboard';

describe('VolunteerDashboard', () => {
  it('renders org name in header', () => {
    const { getByText } = render(<VolunteerDashboard />);
    expect(getByText('Test Org')).toBeTruthy();
  });

  it('renders welcome message with user name', () => {
    const { getByText } = render(<VolunteerDashboard />);
    expect(getByText('Welcome, Alice')).toBeTruthy();
  });

  it('renders upcoming event', () => {
    const { getByText } = render(<VolunteerDashboard />);
    expect(getByText('Spring Tournament')).toBeTruthy();
  });

  it('shows Browse Events button', () => {
    const { getByText } = render(<VolunteerDashboard />);
    expect(getByText('Browse Events')).toBeTruthy();
  });
});
