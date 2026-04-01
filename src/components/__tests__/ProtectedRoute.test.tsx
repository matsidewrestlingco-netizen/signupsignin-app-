import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../contexts/OrgContext', () => ({
  useOrg: vi.fn(() => ({ currentOrg: null, loading: false })),
}));

vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(() => ({ pathname: '/test', search: '', hash: '', state: null, key: '' })),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{`Navigate to ${to}`}</div>,
}));

import { ProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProtectedRoute', () => {
  it('shows spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: true,
      userProfile: null,
    });
    const { container } = render(
      <ProtectedRoute><p>Content</p></ProtectedRoute>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: '123' },
      loading: false,
      userProfile: { organizations: { org1: 'admin' } },
    });
    render(
      <ProtectedRoute><p>Content</p></ProtectedRoute>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render children when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      userProfile: null,
    });
    const { container } = render(
      <ProtectedRoute><p>Content</p></ProtectedRoute>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="navigate"]')).toBeInTheDocument();
  });

  it('redirects to /setup/organization when requireOrg=true but userProfile is null', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: '123' },
      loading: false,
      userProfile: null,
    });
    const { container } = render(
      <ProtectedRoute requireOrg><p>Admin content</p></ProtectedRoute>
    );
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="navigate"]')).toBeInTheDocument();
    expect(screen.getByText('Navigate to /setup/organization')).toBeInTheDocument();
  });

  it('does not render children when requireOrg=true and user has no orgs', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: '123' },
      loading: false,
      userProfile: { organizations: {} },
    });
    const { container } = render(
      <ProtectedRoute requireOrg><p>Admin content</p></ProtectedRoute>
    );
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="navigate"]')).toBeInTheDocument();
  });

  it('renders children when requireOrg=true and user has an org', () => {
    mockUseAuth.mockReturnValue({
      currentUser: { uid: '123' },
      loading: false,
      userProfile: { organizations: { org1: 'admin' } },
    });
    render(
      <ProtectedRoute requireOrg><p>Admin content</p></ProtectedRoute>
    );
    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });
});
