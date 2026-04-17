jest.mock('../lib/firebase', () => ({ auth: {}, db: {} }));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth, cb) => { cb(null); return jest.fn(); }),
  signInWithCredential: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  OAuthProvider: jest.fn().mockImplementation(() => ({
    credential: jest.fn().mockReturnValue('apple-credential'),
  })),
  GoogleAuthProvider: { credential: jest.fn() },
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn().mockReturnValue('mock-ref'),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  onSnapshot: jest.fn().mockReturnValue(jest.fn()),
  serverTimestamp: jest.fn().mockReturnValue('ts'),
  deleteDoc: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(32).fill(1)),
  digestStringAsync: jest.fn().mockResolvedValue('hashed-nonce'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
  AppleAuthenticationButtonStyle: { BLACK: 'BLACK' },
}));

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

describe('signInWithApple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { OAuthProvider, signInWithCredential } = require('firebase/auth');
    (OAuthProvider as jest.Mock).mockImplementation(() => ({
      credential: jest.fn().mockReturnValue('apple-credential'),
    }));
    const { signInAsync } = require('expo-apple-authentication');
    (signInAsync as jest.Mock).mockResolvedValue({
      identityToken: 'id-token',
      fullName: { givenName: 'Jane', familyName: 'Doe' },
      email: 'jane@appleid.com',
    });
    (signInWithCredential as jest.Mock).mockResolvedValue({
      user: { uid: 'apple-uid', email: 'jane@appleid.com', displayName: null },
    });
  });

  function renderWithCapture() {
    let fn: (() => Promise<void>) | undefined;
    function Capture() {
      fn = useAuth().signInWithApple;
      return <Text>test</Text>;
    }
    render(<AuthProvider><Capture /></AuthProvider>);
    return { getFn: () => fn! };
  }

  it('calls signInAsync with the hashed nonce', async () => {
    const { signInAsync } = require('expo-apple-authentication');
    const { getDoc } = require('firebase/firestore');
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
    const { getFn } = renderWithCapture();
    await act(async () => { await getFn()(); });
    expect(signInAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: 'hashed-nonce' })
    );
  });

  it('creates a Firestore doc for a first-time Apple user', async () => {
    const { getDoc, setDoc } = require('firebase/firestore');
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    const { getFn } = renderWithCapture();
    await act(async () => { await getFn()(); });
    expect(setDoc).toHaveBeenCalledWith(
      'mock-ref',
      expect.objectContaining({ name: 'Jane Doe', email: 'jane@appleid.com' }),
    );
  });

  it('skips Firestore doc creation for a returning Apple user', async () => {
    const { getDoc, setDoc } = require('firebase/firestore');
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => true });
    const { getFn } = renderWithCapture();
    await act(async () => { await getFn()(); });
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('re-throws so the caller can detect ERR_REQUEST_CANCELED', async () => {
    const { signInAsync } = require('expo-apple-authentication');
    const cancelErr = Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' });
    (signInAsync as jest.Mock).mockRejectedValue(cancelErr);
    const { getFn } = renderWithCapture();
    await expect(act(async () => { await getFn()(); })).rejects.toThrow('canceled');
  });

  it('passes the raw (unhashed) nonce to OAuthProvider.credential', async () => {
    const { OAuthProvider } = require('firebase/auth');
    const { getDoc } = require('firebase/firestore');
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
    const { getFn } = renderWithCapture();
    await act(async () => { await getFn()(); });
    const providerInstance = (OAuthProvider as jest.Mock).mock.results[0].value;
    expect(providerInstance.credential).toHaveBeenCalledWith(
      expect.objectContaining({ rawNonce: expect.stringMatching(/^[0-9a-f]{64}$/) })
    );
  });

  it('throws when Apple returns no identity token', async () => {
    const { signInAsync } = require('expo-apple-authentication');
    (signInAsync as jest.Mock).mockResolvedValue({
      identityToken: null,
      fullName: null,
      email: null,
    });
    const { getFn } = renderWithCapture();
    await expect(
      act(async () => { await getFn()(); })
    ).rejects.toThrow('Apple sign-in failed: no identity token');
  });
});
