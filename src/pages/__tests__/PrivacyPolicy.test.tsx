import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyPolicy } from '../PrivacyPolicy';

describe('PrivacyPolicy', () => {
  it('renders the page heading', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument();
  });

  it('renders the effective date', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText(/effective date: april 3, 2026/i)).toBeInTheDocument();
  });

  it('renders all eleven section headings', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByRole('heading', { level: 2, name: /introduction/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /information we collect/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /how we use your information/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /third-party services/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /data sharing/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /data retention/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /your rights/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /children's privacy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /security/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /changes to this policy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /contact us/i })).toBeInTheDocument();
  });

  it('renders the contact email address', () => {
    render(<PrivacyPolicy />);
    const links = screen.getAllByRole('link', { name: /support@matside\.org/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', 'mailto:support@matside.org');
  });
});
