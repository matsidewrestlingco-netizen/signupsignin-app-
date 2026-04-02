import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('react-native-svg', () => ({
  Svg: 'Svg', Rect: 'Rect', Path: 'Path', G: 'G',
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user-uid-123' },
    userProfile: { name: 'Alice', email: 'alice@test.com', organizations: { org1: 'member' } },
  }),
}));
jest.mock('../../contexts/OrgContext', () => ({
  useOrg: () => ({
    currentOrg: { id: 'org1', name: 'Test Org', type: 'Wrestling', ownerId: 'u0', createdAt: new Date() },
  }),
}));
jest.mock('../../hooks/useSignups', () => ({
  useMySignups: () => ({
    signups: [
      { id: 's1', eventId: 'e1', slotId: 'slot1', userId: 'user-uid-123',
        userName: 'Alice', userEmail: 'alice@test.com', note: '',
        checkedIn: false, createdAt: new Date() },
    ],
    loading: false,
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

import VolunteerCheckIn from '../../app/(volunteer)/checkin';

describe('VolunteerCheckIn', () => {
  it('renders the header', () => {
    const { getByText } = render(<VolunteerCheckIn />);
    expect(getByText('Check-In QR Code')).toBeTruthy();
  });

  it('shows volunteer name', () => {
    const { getByText } = render(<VolunteerCheckIn />);
    expect(getByText('Alice')).toBeTruthy();
  });

  it('shows upcoming signup event title', () => {
    const { getByText } = render(<VolunteerCheckIn />);
    expect(getByText('Spring Tournament')).toBeTruthy();
  });

  it('shows My Upcoming Signups section', () => {
    const { getByText } = render(<VolunteerCheckIn />);
    expect(getByText('My Upcoming Signups')).toBeTruthy();
  });
});
