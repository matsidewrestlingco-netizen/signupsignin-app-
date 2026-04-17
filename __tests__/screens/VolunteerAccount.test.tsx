import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockLogOut = jest.fn().mockResolvedValue(undefined);
const mockDeleteAccount = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user1' },
    userProfile: { name: 'Alice Smith', email: 'alice@test.com', organizations: {} },
    logOut: mockLogOut,
    deleteAccount: mockDeleteAccount,
  }),
}));

let mockCurrentOrg: { id: string; name: string; type: string } | null = {
  id: 'org1',
  name: 'Test Wrestling Club',
  type: 'Wrestling',
};
jest.mock('../../contexts/OrgContext', () => ({
  useOrg: () => ({ currentOrg: mockCurrentOrg }),
}));

import VolunteerAccount from '../../app/(volunteer)/account';

describe('VolunteerAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentOrg = { id: 'org1', name: 'Test Wrestling Club', type: 'Wrestling' };
  });

  it('renders Account header', () => {
    const { getByText } = render(<VolunteerAccount />);
    expect(getByText('Account')).toBeTruthy();
  });

  it('renders user name', () => {
    const { getByText } = render(<VolunteerAccount />);
    expect(getByText('Alice Smith')).toBeTruthy();
  });

  it('renders user email', () => {
    const { getByText } = render(<VolunteerAccount />);
    expect(getByText('alice@test.com')).toBeTruthy();
  });

  it('renders org name', () => {
    const { getByText } = render(<VolunteerAccount />);
    expect(getByText('Test Wrestling Club')).toBeTruthy();
  });

  it('renders org type', () => {
    const { getByText } = render(<VolunteerAccount />);
    expect(getByText('Wrestling')).toBeTruthy();
  });

  it('renders Sign Out button', () => {
    const { getByText } = render(<VolunteerAccount />);
    expect(getByText('Sign Out')).toBeTruthy();
  });

  it('shows confirmation alert when Sign Out is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<VolunteerAccount />);
    fireEvent.press(getByText('Sign Out'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Sign Out',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('calls logOut when alert is confirmed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<VolunteerAccount />);
    fireEvent.press(getByText('Sign Out'));
    const buttons = (alertSpy.mock.calls[0] as any[])[2];
    const confirmBtn = buttons.find((b: any) => b.style === 'destructive');
    confirmBtn.onPress();
    expect(mockLogOut).toHaveBeenCalledTimes(1);
  });

  it('shows dashes when no org is linked', () => {
    mockCurrentOrg = null;
    const { getAllByText } = render(<VolunteerAccount />);
    expect(getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('renders a Delete Account button', () => {
    const { getByText } = render(<VolunteerAccount />);
    expect(getByText('Delete Account')).toBeTruthy();
  });

  it('shows the first confirmation alert when Delete Account is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<VolunteerAccount />);
    fireEvent.press(getByText('Delete Account'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Account',
      'Are you sure? This cannot be undone.',
      expect.any(Array)
    );
  });

  it('shows the second confirmation alert when first Delete is confirmed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<VolunteerAccount />);
    fireEvent.press(getByText('Delete Account'));
    const firstAlertButtons = (alertSpy.mock.calls[0] as unknown[])[2] as Array<{ text: string; style?: string; onPress?: () => void }>;
    const deleteBtn = firstAlertButtons.find(b => b.style === 'destructive');
    deleteBtn!.onPress!();
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be reversed.',
      expect.any(Array)
    );
  });
});
