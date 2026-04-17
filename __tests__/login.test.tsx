import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../app/(auth)/login';

const mockSignInWithApple = jest.fn();
const mockIsAvailableAsync = jest.fn();

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    logIn: jest.fn().mockRejectedValue(new Error('auth/invalid-credential')),
    signInWithGoogle: jest.fn(),
    signInWithApple: mockSignInWithApple,
    loading: false,
  }),
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  AppleAuthenticationButton: ({
    onPress,
    testID,
  }: {
    onPress: () => void;
    testID?: string;
  }) =>
    require('react').createElement(
      require('react-native').TouchableOpacity,
      { onPress, testID },
      require('react').createElement(require('react-native').Text, null, 'Sign in with Apple')
    ),
  AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
  AppleAuthenticationButtonStyle: { BLACK: 'BLACK' },
}));

describe('LoginScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows error when submitting with empty fields', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    render(<LoginScreen />);
    fireEvent.press(screen.getByText('Log In'));
    expect(await screen.findByText('Email is required')).toBeTruthy();
  });

  it('shows error when submitting with empty password', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@test.com');
    fireEvent.press(screen.getByText('Log In'));
    expect(await screen.findByText('Password is required')).toBeTruthy();
  });

  it('renders the Apple Sign In button when Sign in with Apple is available', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    render(<LoginScreen />);
    expect(await screen.findByTestId('apple-sign-in-btn')).toBeTruthy();
  });

  it('does not render the Apple Sign In button when unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    render(<LoginScreen />);
    await waitFor(() =>
      expect(screen.queryByTestId('apple-sign-in-btn')).toBeNull()
    );
  });

  it('calls signInWithApple when the button is pressed', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockSignInWithApple.mockResolvedValue(undefined);
    render(<LoginScreen />);
    const btn = await screen.findByTestId('apple-sign-in-btn');
    fireEvent.press(btn);
    await waitFor(() => expect(mockSignInWithApple).toHaveBeenCalledTimes(1));
  });

  it('shows no error message when user cancels Apple sign-in', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockSignInWithApple.mockRejectedValue(
      Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' })
    );
    render(<LoginScreen />);
    const btn = await screen.findByTestId('apple-sign-in-btn');
    fireEvent.press(btn);
    await waitFor(() =>
      expect(screen.queryByText('Apple sign-in failed. Please try again.')).toBeNull()
    );
  });

  it('shows error message on non-cancellation Apple sign-in failure', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockSignInWithApple.mockRejectedValue(new Error('network error'));
    render(<LoginScreen />);
    const btn = await screen.findByTestId('apple-sign-in-btn');
    fireEvent.press(btn);
    expect(await screen.findByText('Apple sign-in failed. Please try again.')).toBeTruthy();
  });
});
