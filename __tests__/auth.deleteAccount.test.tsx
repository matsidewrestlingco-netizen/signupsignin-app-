jest.mock('../lib/firebase', () => ({ auth: {}, db: {} }));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth, cb) => {
    cb({ uid: 'uid-to-delete', email: 'user@test.com', displayName: 'Test' });
    return jest.fn();
  }),
  deleteUser: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  signInWithCredential: jest.fn(),
  OAuthProvider: jest.fn().mockImplementation(() => ({ credential: jest.fn() })),
  GoogleAuthProvider: { credential: jest.fn() },
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn().mockReturnValue('mock-ref'),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  onSnapshot: jest.fn((_ref, cb) => {
    cb({
      exists: () => true,
      data: () => ({
        email: 'user@test.com',
        name: 'Test',
        createdAt: null,
        organizations: {},
        superAdmin: false,
      }),
    });
    return jest.fn();
  }),
  serverTimestamp: jest.fn().mockReturnValue('ts'),
  deleteDoc: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(32)),
  digestStringAsync: jest.fn().mockResolvedValue('hashed'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
  AppleAuthenticationButtonStyle: { BLACK: 'BLACK' },
}));

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function renderWithCapture() {
  let fn: (() => Promise<void>) | undefined;
  function Capture() {
    fn = useAuth().deleteAccount;
    return <Text>test</Text>;
  }
  render(<AuthProvider><Capture /></AuthProvider>);
  return { getFn: () => fn! };
}

describe('deleteAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes the Firebase Auth user before the Firestore doc', async () => {
    const { deleteUser } = require('firebase/auth');
    const { deleteDoc } = require('firebase/firestore');
    (deleteUser as jest.Mock).mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
    const { getFn } = renderWithCapture();
    await act(async () => { await getFn()(); });
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteDoc).toHaveBeenCalledWith('mock-ref');
    const deleteUserOrder = (deleteUser as jest.Mock).mock.invocationCallOrder[0];
    const deleteDocOrder = (deleteDoc as jest.Mock).mock.invocationCallOrder[0];
    expect(deleteUserOrder).toBeLessThan(deleteDocOrder);
  });

  it('signs the user out and re-throws on requires-recent-login', async () => {
    const { deleteUser, signOut } = require('firebase/auth');
    const recentLoginError = Object.assign(
      new Error('Firebase: The user must re-authenticate. (auth/requires-recent-login).'),
      { code: 'auth/requires-recent-login' }
    );
    (deleteUser as jest.Mock).mockRejectedValue(recentLoginError);
    const { getFn } = renderWithCapture();
    await expect(
      act(async () => { await getFn()(); })
    ).rejects.toThrow('requires-recent-login');
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('does not delete the Firestore doc if Auth deletion fails', async () => {
    const { deleteUser } = require('firebase/auth');
    const { deleteDoc } = require('firebase/firestore');
    (deleteUser as jest.Mock).mockRejectedValue(new Error('requires-recent-login'));
    const { getFn } = renderWithCapture();
    await act(async () => {
      try { await getFn()(); } catch { /* expected */ }
    });
    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it('does not sign out for non-recent-login errors', async () => {
    const { deleteUser, signOut } = require('firebase/auth');
    (deleteUser as jest.Mock).mockRejectedValue(new Error('network-request-failed'));
    const { getFn } = renderWithCapture();
    await act(async () => {
      try { await getFn()(); } catch { /* expected */ }
    });
    expect(signOut).not.toHaveBeenCalled();
  });
});
