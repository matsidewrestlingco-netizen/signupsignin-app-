import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Support } from '../Support';

describe('Support', () => {
  it('renders the page heading', () => {
    render(<Support />);
    expect(screen.getByRole('heading', { level: 1, name: /support/i })).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<Support />);
    expect(screen.getByText(/we're here to help/i)).toBeInTheDocument();
  });

  it('renders both FAQ group headings', () => {
    render(<Support />);
    expect(screen.getByRole('heading', { level: 2, name: /volunteers & parents/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /organization admins/i })).toBeInTheDocument();
  });

  it('renders all six FAQ questions', () => {
    render(<Support />);
    expect(screen.getByText(/how do i sign up for an event/i)).toBeInTheDocument();
    expect(screen.getByText(/i didn't receive my confirmation email/i)).toBeInTheDocument();
    expect(screen.getByText(/i forgot my password/i)).toBeInTheDocument();
    expect(screen.getByText(/how do i create an organization/i)).toBeInTheDocument();
    expect(screen.getByText(/how do i add or manage events/i)).toBeInTheDocument();
    expect(screen.getByText(/how do i send reminder emails/i)).toBeInTheDocument();
  });

  it('FAQ answers are hidden by default', () => {
    render(<Support />);
    expect(screen.queryByText(/browse to your organization's event page/i)).not.toBeInTheDocument();
  });

  it('clicking a FAQ question reveals its answer', () => {
    render(<Support />);
    const question = screen.getByText(/how do i sign up for an event/i);
    fireEvent.click(question);
    expect(screen.getByText(/browse to your organization's event page/i)).toBeInTheDocument();
  });

  it('clicking the same FAQ question again hides its answer', () => {
    render(<Support />);
    const question = screen.getByText(/how do i sign up for an event/i);
    fireEvent.click(question);
    fireEvent.click(question);
    expect(screen.queryByText(/browse to your organization's event page/i)).not.toBeInTheDocument();
  });

  it('renders the contact email link', () => {
    render(<Support />);
    const link = screen.getByRole('link', { name: /support@matside\.org/i });
    expect(link).toHaveAttribute('href', 'mailto:support@matside.org');
  });
});
