import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user1', email: 'alice@test.com' },
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
      { id: 'e1', title: 'Spring Tournament', startTime: new Date('2026-04-05T14:00:00'),
        location: 'Main Gym', description: 'Annual event', isPublic: true, createdAt: new Date() },
      { id: 'e2', title: 'Private Meet', startTime: new Date('2026-04-10T10:00:00'),
        location: 'Back Gym', description: '', isPublic: false, createdAt: new Date() },
    ],
    loading: false,
  }),
}));

const mockCreateSignup = jest.fn().mockResolvedValue('signup1');
jest.mock('../../hooks/useSlots', () => ({
  useSlots: () => ({
    slots: [
      { id: 'slot1', name: 'Registration Desk', category: 'Admin',
        quantityTotal: 3, quantityFilled: 1, description: 'Help with sign-ins', createdAt: new Date() },
    ],
    loading: false,
  }),
}));
jest.mock('../../hooks/useSignups', () => ({
  useSignups: () => ({ signups: [], loading: false, createSignup: mockCreateSignup }),
  useMySignups: () => ({ signups: [], loading: false }),
}));

import VolunteerEvents from '../../app/(volunteer)/events';

describe('VolunteerEvents', () => {
  it('shows public event but not private event', () => {
    const { getByText, queryByText } = render(<VolunteerEvents />);
    expect(getByText('Spring Tournament')).toBeTruthy();
    expect(queryByText('Private Meet')).toBeNull();
  });

  it('navigates to detail on event tap', () => {
    const { getByText } = render(<VolunteerEvents />);
    fireEvent.press(getByText('Spring Tournament'));
    expect(getByText('Available Slots')).toBeTruthy();
  });

  it('shows slot with Sign Up button when not full and not signed up', () => {
    const { getByText } = render(<VolunteerEvents />);
    fireEvent.press(getByText('Spring Tournament'));
    expect(getByText('Registration Desk')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('calls createSignup when Sign Up is pressed', async () => {
    const { getByText } = render(<VolunteerEvents />);
    fireEvent.press(getByText('Spring Tournament'));
    fireEvent.press(getByText('Sign Up'));
    await waitFor(() => {
      expect(mockCreateSignup).toHaveBeenCalledWith(
        expect.objectContaining({ slotId: 'slot1', userId: 'user1' })
      );
    });
  });
});
