import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
