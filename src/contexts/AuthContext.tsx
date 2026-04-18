import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserProfile {
  email: string;
  name: string;
  createdAt: Date;
  organizations: Record<string, 'admin' | 'member'>;
  superAdmin?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserProfile(user: User) {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setUserProfile({
        email: data.email,
        name: data.name,
        createdAt: data.createdAt?.toDate() || new Date(),
        organizations: data.organizations || {},
        superAdmin: data.superAdmin || false,
      });
    } else {
      setUserProfile(null);
    }
  }

  async function signUp(email: string, password: string, name: string) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, 'users', user.uid), {
      email,
      name,
      createdAt: serverTimestamp(),
      organizations: {},
    });

    await fetchUserProfile(user);
  }

  async function logIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);

    // Create Firestore profile if this is the user's first Google sign-in
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        email: user.email,
        name: user.displayName || '',
        createdAt: serverTimestamp(),
        organizations: {},
      });
    }

    await fetchUserProfile(user);
  }

  async function signInWithApple() {
    const provider = new OAuthProvider('apple.com');
    const { user } = await signInWithPopup(auth, provider);

    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        email: user.email,
        name: user.displayName || '',
        createdAt: serverTimestamp(),
        organizations: {},
      });
    }

    await fetchUserProfile(user);
  }

  async function logOut() {
    await signOut(auth);
    setUserProfile(null);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function refreshProfile() {
    if (currentUser) {
      await fetchUserProfile(currentUser);
    }
  }

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      // Batch these so ProtectedRoute never sees currentUser=user with loading=false before profile loads
      setCurrentUser(user);
      if (user) setLoading(true);

      if (user) {
        try {
          await fetchUserProfile(user);
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
          if (active) setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const isSuperAdmin = userProfile?.superAdmin === true;

  const value = {
    currentUser,
    userProfile,
    isSuperAdmin,
    loading,
    signUp,
    logIn,
    signInWithGoogle,
    signInWithApple,
    logOut,
    resetPassword,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
