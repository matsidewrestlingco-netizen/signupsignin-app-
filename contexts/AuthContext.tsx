import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  OAuthProvider,
  deleteUser,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../lib/types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: (idToken: string | null, accessToken?: string | null) => Promise<void>;
  signInWithApple: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

async function buildAppleNonce(): Promise<{ raw: string; hashed: string }> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const raw = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function signUp(email: string, password: string, name: string) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', user.uid), {
      email,
      name,
      createdAt: serverTimestamp(),
      organizations: {},
      superAdmin: false,
    });
    // onSnapshot listener (set up in onAuthStateChanged) picks up the new doc automatically
  }

  async function logIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logOut() {
    await signOut(auth);
    setUserProfile(null);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function refreshProfile() {
    // No-op: onSnapshot keeps userProfile up to date in real time
  }

  async function signInWithGoogle(idToken: string | null, accessToken?: string | null) {
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    const { user } = await signInWithCredential(auth, credential);
    const docRef = doc(db, 'users', user.uid);
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      await setDoc(docRef, {
        email: user.email ?? '',
        name: user.displayName ?? '',
        createdAt: serverTimestamp(),
        organizations: {},
        superAdmin: false,
      });
    }
  }

  async function signInWithApple() {
    const { raw, hashed } = await buildAppleNonce();
    const appleResult = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashed,
    });
    if (!appleResult.identityToken) throw new Error('Apple sign-in failed: no identity token');
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({ idToken: appleResult.identityToken, rawNonce: raw });
    const { user } = await signInWithCredential(auth, credential);
    const docRef = doc(db, 'users', user.uid);
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      const { fullName, email } = appleResult;
      const name = fullName
        ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ')
        : '';
      await setDoc(docRef, {
        email: email ?? user.email ?? '',
        name: name || (email ?? user.email ?? ''),
        createdAt: serverTimestamp(),
        organizations: {},
        superAdmin: false,
      });
    }
  }

  async function deleteAccount(): Promise<void> {
    throw new Error('not yet implemented');
  }

  useEffect(() => {
    let active = true;
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (!active) return;

      profileUnsub?.();
      profileUnsub = null;

      setCurrentUser(user);

      if (user) {
        setLoading(true);
        profileUnsub = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            if (!active) return;
            if (snap.exists()) {
              const d = snap.data();
              setUserProfile({
                email: d.email,
                name: d.name,
                createdAt: d.createdAt?.toDate() ?? new Date(),
                organizations: d.organizations ?? {},
                superAdmin: d.superAdmin ?? false,
              });
            } else {
              setUserProfile(null);
            }
            setLoading(false);
          },
          () => {
            if (!active) return;
            setUserProfile(null);
            setLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      authUnsub();
      profileUnsub?.();
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    isSuperAdmin: userProfile?.superAdmin === true,
    loading,
    signUp,
    logIn,
    logOut,
    resetPassword,
    refreshProfile,
    signInWithGoogle,
    signInWithApple,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
