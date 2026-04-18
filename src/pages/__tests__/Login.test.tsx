import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
}));

import { Login } from '../Login';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as ReturnType<typeof vi.fn>;
const mockUseLocation = useLocation as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseNavigate.mockReturnValue(vi.fn());
  mockUseLocation.mockReturnValue({ state: null, pathname: '/login' });
  mockUseAuth.mockReturnValue({
    logIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
  });
});

describe('Login', () => {
  it('renders the Sign in with Apple button', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeInTheDocument();
  });

  it('calls signInWithApple when the Apple button is clicked', async () => {
    const mockSignInWithApple = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      logIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithApple: mockSignInWithApple,
    });
    render(<Login />);
    await userEvent.click(screen.getByRole('button', { name: /sign in with apple/i }));
    expect(mockSignInWithApple).toHaveBeenCalledOnce();
  });
});
