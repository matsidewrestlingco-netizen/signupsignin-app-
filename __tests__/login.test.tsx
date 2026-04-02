import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../app/(auth)/login';

// Mock useAuth so we don't need a real Firebase connection
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    logIn: jest.fn().mockRejectedValue(new Error('auth/invalid-credential')),
    loading: false,
  }),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe('LoginScreen', () => {
  it('shows error when submitting with empty fields', async () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText('Log In'));
    expect(await screen.findByText('Email is required')).toBeTruthy();
  });

  it('shows error when submitting with empty password', async () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@test.com');
    fireEvent.press(screen.getByText('Log In'));
    expect(await screen.findByText('Password is required')).toBeTruthy();
  });
});
