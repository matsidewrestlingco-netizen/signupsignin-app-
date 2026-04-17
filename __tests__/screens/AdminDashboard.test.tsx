import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { name: 'Alice', email: 'alice@test.com', organizations: { org1: 'admin' } },
  }),
}));
jest.mock('../../contexts/OrgContext', () => ({
  useOrg: () => ({
    currentOrg: { id: 'org1', name: 'Test Org', type: 'Wrestling', ownerId: 'u1', createdAt: new Date() },
    organizations: [{ id: 'org1', name: 'Test Org', type: 'Wrestling', ownerId: 'u1', createdAt: new Date() }],
    loading: false,
    setCurrentOrg: jest.fn(),
  }),
}));
jest.mock('../../hooks/useEvents', () => ({
  useEvents: () => ({
    events: [
      {
        id: 'e1',
        title: 'Spring Tournament',
        startTime: new Date(Date.now() + 86400000), // tomorrow
        location: 'Main Gym',
        description: '',
        isPublic: true,
        createdAt: new Date(),
      },
    ],
    loading: false,
  }),
}));

import AdminDashboard from '../../app/(admin)/dashboard';

describe('AdminDashboard', () => {
  it('renders org name in header', () => {
    const { getByText } = render(<AdminDashboard />);
    expect(getByText('Test Org')).toBeTruthy();
  });

  it('renders welcome message', () => {
    const { getByText } = render(<AdminDashboard />);
    expect(getByText('Welcome back, Alice')).toBeTruthy();
  });

  it('renders upcoming event in the list', () => {
    const { getByText } = render(<AdminDashboard />);
    expect(getByText('Spring Tournament')).toBeTruthy();
  });

  it('shows 1 upcoming stat', () => {
    const { getAllByText } = render(<AdminDashboard />);
    // Stats row shows "1" for upcoming count
    const ones = getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });
});
