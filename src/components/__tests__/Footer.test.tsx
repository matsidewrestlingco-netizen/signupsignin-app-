import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// __APP_VERSION__ is injected by Vite at build time; define it for the test environment
(globalThis as Record<string, unknown>).__APP_VERSION__ = '1.0.0';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

import Footer from '../Footer';

describe('Footer', () => {
  it('renders a Privacy Policy link pointing to /privacy', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: /privacy policy/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/privacy');
  });
});
