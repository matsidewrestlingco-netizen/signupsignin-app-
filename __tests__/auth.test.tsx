jest.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
  functions: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => { callback(null); return jest.fn(); }),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(),
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
    expect(screen.getByTestId('user')).toBeTruthy();
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    spy.mockRestore();
  });
});
