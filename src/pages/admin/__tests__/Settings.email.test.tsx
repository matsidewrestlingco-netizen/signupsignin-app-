import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock all external dependencies before importing the component
vi.mock('../../../contexts/OrgContext', () => ({
  useOrg: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

vi.mock('../../../lib/firebase', () => ({
  functions: {},
}));

import { AdminSettings } from '../Settings';
import { useOrg } from '../../../contexts/OrgContext';
import { useAuth } from '../../../contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';

const mockUseOrg = useOrg as ReturnType<typeof vi.fn>;
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockHttpsCallable = httpsCallable as ReturnType<typeof vi.fn>;

const mockOrg = {
  id: 'org1',
  name: 'Test Org',
  branding: { primaryColor: '#243c7c' },
  emailSettings: {
    sendConfirmations: true,
    sendReminders: true,
    reminderHoursBefore: 24,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseOrg.mockReturnValue({
    currentOrg: mockOrg,
    updateOrganization: vi.fn().mockResolvedValue(undefined),
    loading: false,
  });
  mockUseAuth.mockReturnValue({
    currentUser: { email: 'admin@test.com', uid: 'user1' },
  });
});

describe('AdminSettings — test email button', () => {
  it('renders the Send Test button', () => {
    render(<AdminSettings />);
    expect(screen.getByRole('button', { name: /send test/i })).toBeInTheDocument();
  });

  it('pre-fills the test email input with the current user email', () => {
    render(<AdminSettings />);
    const input = screen.getByPlaceholderText('your@email.com') as HTMLInputElement;
    expect(input.value).toBe('admin@test.com');
  });

  it('calls sendTestEmail callable with orgId and email on click', async () => {
    const mockSendFn = vi.fn().mockResolvedValue({ data: { success: true } });
    mockHttpsCallable.mockReturnValue(mockSendFn);

    render(<AdminSettings />);
    fireEvent.click(screen.getByRole('button', { name: /send test/i }));

    await waitFor(() => {
      expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'sendTestEmail');
      expect(mockSendFn).toHaveBeenCalledWith({
        orgId: 'org1',
        email: 'admin@test.com',
      });
    });
  });

  it('shows success message after sending', async () => {
    const mockSendFn = vi.fn().mockResolvedValue({ data: { success: true } });
    mockHttpsCallable.mockReturnValue(mockSendFn);

    render(<AdminSettings />);
    fireEvent.click(screen.getByRole('button', { name: /send test/i }));

    await waitFor(() => {
      expect(screen.getByText(/test email sent successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error message if callable throws', async () => {
    const mockSendFn = vi.fn().mockRejectedValue(new Error('Network error'));
    mockHttpsCallable.mockReturnValue(mockSendFn);

    render(<AdminSettings />);
    fireEvent.click(screen.getByRole('button', { name: /send test/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('disables the button while sending', async () => {
    let resolve: (v: unknown) => void;
    const mockSendFn = vi.fn().mockReturnValue(new Promise((r) => { resolve = r; }));
    mockHttpsCallable.mockReturnValue(mockSendFn);

    render(<AdminSettings />);
    const button = screen.getByRole('button', { name: /send test/i });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    resolve!({ data: { success: true } });
  });
});
