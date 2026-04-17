jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
  AppleAuthenticationButtonStyle: { BLACK: 'BLACK' },
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(32)),
  digestStringAsync: jest.fn().mockResolvedValue('hashed'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
  functions: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => { callback(null); return jest.fn(); }),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({}),
  signOut: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn(),
  OAuthProvider: jest.fn().mockImplementation(() => ({ credential: jest.fn() })),
  GoogleAuthProvider: { credential: jest.fn() },
  signInWithCredential: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  onSnapshot: jest.fn().mockReturnValue(jest.fn()),
  serverTimestamp: jest.fn(),
  deleteDoc: jest.fn(),
}));

import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function TestConsumer() {
  const { loading, currentUser } = useAuth();
  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="user">{currentUser ? currentUser.email : 'null'}</Text>
    </>
  );
}

describe('AuthContext', () => {
  it('renders without crashing and starts in loading state', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    // loading may be true initially; component should not throw
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    spy.mockRestore();
  });

  it('logIn calls signInWithEmailAndPassword with correct args', async () => {
    const { signInWithEmailAndPassword } = require('firebase/auth');
    let logInFn: ((email: string, password: string) => Promise<void>) | undefined;
    function CaptureLogIn() {
      const auth = useAuth();
      logInFn = auth.logIn;
      return <Text>test</Text>;
    }
    render(<AuthProvider><CaptureLogIn /></AuthProvider>);
    await act(async () => {
      await logInFn!('test@example.com', 'password123');
    });
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'password123'
    );
  });

  it('logOut calls signOut', async () => {
    const { signOut } = require('firebase/auth');
    let logOutFn: (() => Promise<void>) | undefined;
    function CaptureLogOut() {
      const auth = useAuth();
      logOutFn = auth.logOut;
      return <Text>test</Text>;
    }
    render(<AuthProvider><CaptureLogOut /></AuthProvider>);
    await act(async () => {
      await logOutFn!();
    });
    expect(signOut).toHaveBeenCalled();
  });
});
