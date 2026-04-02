import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('firebase/firestore', () => ({
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  collection: jest.fn(() => ({})),
}));

const mockUpdateOrganization = jest.fn().mockResolvedValue(undefined);
jest.mock('../../contexts/OrgContext', () => ({
  useOrg: () => ({
    currentOrg: {
      id: 'org1', name: 'Test Org', type: 'Wrestling', ownerId: 'u1', createdAt: new Date(),
      emailSettings: { sendConfirmations: true, sendReminders: true, reminderHoursBefore: 24 },
    },
    updateOrganization: mockUpdateOrganization,
  }),
}));
jest.mock('../../hooks/useEvents', () => ({
  useEvents: () => ({ events: [], loading: false }),
}));
jest.mock('../../hooks/useTemplates', () => ({
  useTemplates: () => ({
    templates: [
      { id: 't1', name: 'Standard Meet', description: 'A standard wrestling meet', eventTitle: 'Wrestling Meet',
        eventDescription: '', eventLocation: 'Main Gym', slots: [], createdAt: new Date() },
    ],
    loading: false,
    createTemplate: jest.fn().mockResolvedValue(undefined),
    deleteTemplate: jest.fn().mockResolvedValue(undefined),
  }),
}));

import AdminReports from '../../app/(admin)/reports';

describe('AdminReports', () => {
  it('renders header title', () => {
    const { getAllByText } = render(<AdminReports />);
    expect(getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
  });

  it('switches to Templates section and shows template', () => {
    const { getByText } = render(<AdminReports />);
    fireEvent.press(getByText('Templates'));
    expect(getByText('Standard Meet')).toBeTruthy();
  });

  it('switches to Settings section and shows org name', () => {
    const { getAllByText, getByText } = render(<AdminReports />);
    // getAllByText returns [header, tab] in render order; press the tab (index 1)
    fireEvent.press(getAllByText('Settings')[1]);
    expect(getByText('Organization Name')).toBeTruthy();
  });

  it('shows New Template form when button is pressed', () => {
    const { getByText } = render(<AdminReports />);
    fireEvent.press(getByText('Templates'));
    fireEvent.press(getByText('New Template'));
    expect(getByText('Template Name')).toBeTruthy();
  });
});
