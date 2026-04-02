import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));
jest.mock('../../contexts/OrgContext', () => ({
  useOrg: () => ({
    currentOrg: { id: 'org1', name: 'Test Org', type: 'Wrestling', ownerId: 'u1', createdAt: new Date() },
  }),
}));

const mockCheckIn = jest.fn().mockResolvedValue(undefined);
const mockUndoCheckIn = jest.fn().mockResolvedValue(undefined);

jest.mock('../../hooks/useEvents', () => ({
  useEvents: () => ({
    events: [
      { id: 'e1', title: 'Spring Tournament', startTime: new Date('2026-04-05T14:00:00'),
        location: 'Main Gym', description: '', isPublic: true, createdAt: new Date() },
    ],
    loading: false,
  }),
}));
jest.mock('../../hooks/useSignups', () => ({
  useSignups: () => ({
    signups: [
      { id: 's1', eventId: 'e1', slotId: 'slot1', userId: 'user1',
        userName: 'Alice Smith', userEmail: 'alice@test.com',
        note: '', checkedIn: false, createdAt: new Date() },
      { id: 's2', eventId: 'e1', slotId: 'slot1', userId: 'user2',
        userName: 'Bob Jones', userEmail: 'bob@test.com',
        note: '', checkedIn: true, checkedInAt: new Date('2026-04-05T14:30:00'), createdAt: new Date() },
    ],
    loading: false,
    checkIn: mockCheckIn,
    undoCheckIn: mockUndoCheckIn,
  }),
}));

import AdminCheckIn from '../../app/(admin)/checkin';

describe('AdminCheckIn', () => {
  it('renders the header', () => {
    const { getByText } = render(<AdminCheckIn />);
    expect(getByText('Check-In')).toBeTruthy();
  });

  it('shows event name in selector', () => {
    const { getByText } = render(<AdminCheckIn />);
    expect(getByText('Spring Tournament')).toBeTruthy();
  });

  it('switches to manual list and shows signups', () => {
    const { getByText } = render(<AdminCheckIn />);
    fireEvent.press(getByText('Manual List'));
    expect(getByText('Alice Smith')).toBeTruthy();
    expect(getByText('Bob Jones')).toBeTruthy();
  });

  it('calls checkIn when Check In button pressed in manual list', async () => {
    const { getByText } = render(<AdminCheckIn />);
    fireEvent.press(getByText('Manual List'));
    fireEvent.press(getByText('Check In'));
    expect(mockCheckIn).toHaveBeenCalledWith('s1');
  });
});
