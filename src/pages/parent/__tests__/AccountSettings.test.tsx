import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('firebase/auth', () => ({
  deleteUser: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  deleteDoc: vi.fn(),
  doc: vi.fn(() => 'mock-doc-ref'),
}));

vi.mock('../../../lib/firebase', () => ({
  db: {},
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

import { ParentAccountSettings } from '../AccountSettings';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { deleteUser } from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as ReturnType<typeof vi.fn>;
const mockDeleteUser = deleteUser as ReturnType<typeof vi.fn>;
const mockDeleteDoc = deleteDoc as ReturnType<typeof vi.fn>;
const mockDoc = doc as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteUser.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockDoc.mockReturnValue('mock-doc-ref');
  mockUseNavigate.mockReturnValue(vi.fn());
  mockUseAuth.mockReturnValue({
    currentUser: { uid: 'user-123' },
    userProfile: { name: 'Jane Parent', email: 'jane@example.com' },
    logOut: vi.fn().mockResolvedValue(undefined),
  });
});

describe('ParentAccountSettings', () => {
  it('renders profile name and email', () => {
    render(<ParentAccountSettings />);
    expect(screen.getByText('Jane Parent')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('shows confirmation modal when Delete Account button is clicked', async () => {
    render(<ParentAccountSettings />);
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    expect(screen.getByText('Are you sure you want to delete your account?')).toBeInTheDocument();
  });

  it('hides the confirmation modal when Cancel is clicked', async () => {
    render(<ParentAccountSettings />);
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('calls deleteDoc and deleteUser then navigates to / on confirm', async () => {
    const mockNavigate = vi.fn();
    const mockLogOut = vi.fn().mockResolvedValue(undefined);
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseAuth.mockReturnValue({
      currentUser: { uid: 'user-123' },
      userProfile: { name: 'Jane Parent', email: 'jane@example.com' },
      logOut: mockLogOut,
    });

    render(<ParentAccountSettings />);
    // Open modal
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    // Click confirm (last button with this name — the modal's confirm button)
    const deleteButtons = screen.getAllByRole('button', { name: /delete account/i });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
      expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'user-123');
      expect(mockDeleteUser).toHaveBeenCalledWith({ uid: 'user-123' });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows re-auth message when auth/requires-recent-login is thrown', async () => {
    const error = Object.assign(new Error('requires-recent-login'), {
      code: 'auth/requires-recent-login',
    });
    mockDeleteDoc.mockRejectedValue(error);

    render(<ParentAccountSettings />);
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    const deleteButtons = screen.getAllByRole('button', { name: /delete account/i });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(
        screen.getByText(/please log out and log back in before deleting your account/i)
      ).toBeInTheDocument();
    });
  });
});
