import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getDocs,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Signup {
  id: string;
  eventId: string;
  slotId: string;
  userId: string;
  userName: string;
  userEmail: string;
  note: string;
  checkedIn: boolean;
  checkedInAt?: Date;
  createdAt: Date;
}

export interface SignupInput {
  eventId: string;
  slotId: string;
  userId: string;
  userName: string;
  userEmail: string;
  note?: string;
}

export function useSignups(orgId: string | undefined, eventId?: string) {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !eventId) {
      setSignups([]);
      setLoading(false);
      return;
    }

    const signupsRef = collection(db, 'organizations', orgId, 'signups');
    const q = query(signupsRef, where('eventId', '==', eventId), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const signupList: Signup[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          signupList.push({
            id: doc.id,
            eventId: data.eventId,
            slotId: data.slotId,
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail,
            note: data.note || '',
            checkedIn: data.checkedIn ?? false,
            checkedInAt: data.checkedInAt
              ? (data.checkedInAt as Timestamp).toDate()
              : undefined,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        });
        setSignups(signupList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching signups:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orgId, eventId]);

  async function createSignup(data: SignupInput): Promise<string> {
    if (!orgId) throw new Error('No organization selected');

    const signupsRef = collection(db, 'organizations', orgId, 'signups');
    const slotRef = doc(db, 'organizations', orgId, 'events', data.eventId, 'slots', data.slotId);

    // Check for duplicate signup before entering the transaction
    const existingQuery = query(
      signupsRef,
      where('slotId', '==', data.slotId),
      where('userId', '==', data.userId)
    );
    const existingDocs = await getDocs(existingQuery);
    if (!existingDocs.empty) {
      throw new Error('You have already signed up for this slot');
    }

    const newSignupRef = doc(signupsRef);

    await runTransaction(db, async (transaction) => {
      const slotSnap = await transaction.get(slotRef);
      if (!slotSnap.exists()) throw new Error('Slot not found');

      const { quantityFilled = 0, quantityTotal = 1 } = slotSnap.data();
      if (quantityFilled >= quantityTotal) throw new Error('This slot is full');

      transaction.set(newSignupRef, {
        ...data,
        note: data.note || '',
        checkedIn: false,
        createdAt: serverTimestamp(),
      });

      transaction.update(slotRef, { quantityFilled: increment(1) });
    });

    return newSignupRef.id;
  }

  async function checkIn(signupId: string): Promise<void> {
    if (!orgId) throw new Error('No organization selected');

    const signupRef = doc(db, 'organizations', orgId, 'signups', signupId);
    await updateDoc(signupRef, {
      checkedIn: true,
      checkedInAt: serverTimestamp(),
    });
  }

  async function undoCheckIn(signupId: string): Promise<void> {
    if (!orgId) throw new Error('No organization selected');

    const signupRef = doc(db, 'organizations', orgId, 'signups', signupId);
    await updateDoc(signupRef, {
      checkedIn: false,
      checkedInAt: null,
    });
  }

  async function cancelSignup(signupId: string): Promise<void> {
    if (!orgId) throw new Error('No organization selected');

    const signup = signups.find((s) => s.id === signupId);
    const signupRef = doc(db, 'organizations', orgId, 'signups', signupId);
    await deleteDoc(signupRef);

    if (signup) {
      const slotRef = doc(db, 'organizations', orgId, 'events', signup.eventId, 'slots', signup.slotId);
      await updateDoc(slotRef, { quantityFilled: increment(-1) });
    }
  }

  return {
    signups,
    loading,
    error,
    createSignup,
    checkIn,
    undoCheckIn,
    cancelSignup,
  };
}

export function useMySignups(orgId: string | undefined, userId: string | undefined) {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !userId) {
      setSignups([]);
      setLoading(false);
      return;
    }

    const signupsRef = collection(db, 'organizations', orgId, 'signups');
    const q = query(
      signupsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const signupList: Signup[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          signupList.push({
            id: doc.id,
            eventId: data.eventId,
            slotId: data.slotId,
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail,
            note: data.note || '',
            checkedIn: data.checkedIn ?? false,
            checkedInAt: data.checkedInAt
              ? (data.checkedInAt as Timestamp).toDate()
              : undefined,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        });
        setSignups(signupList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching my signups:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orgId, userId]);

  async function cancelSignup(signupId: string): Promise<void> {
    if (!orgId) throw new Error('No organization selected');

    const signup = signups.find((s) => s.id === signupId);
    const signupRef = doc(db, 'organizations', orgId, 'signups', signupId);
    await deleteDoc(signupRef);

    if (signup) {
      const slotRef = doc(db, 'organizations', orgId, 'events', signup.eventId, 'slots', signup.slotId);
      await updateDoc(slotRef, { quantityFilled: increment(-1) });
    }
  }

  return {
    signups,
    loading,
    error,
    cancelSignup,
  };
}
