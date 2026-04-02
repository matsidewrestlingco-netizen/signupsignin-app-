import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../contexts/OrgContext', () => ({
  useOrg: () => ({
    currentOrg: { id: 'org1', name: 'Test Org', type: 'Wrestling', ownerId: 'u1', createdAt: new Date() },
  }),
}));
jest.mock('../../hooks/useEvents', () => ({
  useEvents: () => ({
    events: [
      {
        id: 'e1', title: 'Spring Tournament',
        startTime: new Date('2026-04-05T14:00:00'),
        location: 'Main Gym', description: 'Annual spring event',
        isPublic: true, createdAt: new Date(),
      },
    ],
    loading: false,
    error: null,
    createEvent: jest.fn().mockResolvedValue('e2'),
    updateEvent: jest.fn().mockResolvedValue(undefined),
    deleteEvent: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock('../../hooks/useSlots', () => ({
  useSlots: () => ({
    slots: [], loading: false, error: null,
    createSlot: jest.fn().mockResolvedValue('s1'),
    deleteSlot: jest.fn().mockResolvedValue(undefined),
  }),
}));

import AdminEvents from '../../app/(admin)/events';

describe('AdminEvents', () => {
  it('renders event in the list', () => {
    const { getByText } = render(<AdminEvents />);
    expect(getByText('Spring Tournament')).toBeTruthy();
  });

  it('switches to create view on + press', () => {
    const { getByText, getByTestId } = render(<AdminEvents />);
    fireEvent.press(getByTestId('create-event-btn'));
    expect(getByText('Create Event')).toBeTruthy();
  });

  it('shows validation error when title is empty on create', async () => {
    const { getByTestId, getByText } = render(<AdminEvents />);
    fireEvent.press(getByTestId('create-event-btn'));
    fireEvent.press(getByTestId('submit-create-btn'));
    expect(getByText('Title is required')).toBeTruthy();
  });

  it('switches to detail view when event is tapped', () => {
    const { getByText } = render(<AdminEvents />);
    fireEvent.press(getByText('Spring Tournament'));
    // In detail view, we see the event title in the header and "Slots" section
    expect(getByText('Slots')).toBeTruthy();
  });
});
