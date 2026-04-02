import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import type { Organization } from '../lib/types';

interface OrgContextType {
  currentOrg: Organization | null;
  organizations: Organization[];
  loading: boolean;
  setCurrentOrg: (org: Organization | null) => void;
  createOrganization: (name: string, type: string) => Promise<Organization>;
  updateOrganization: (
    orgId: string,
    data: Partial<Pick<Organization, 'name' | 'branding' | 'emailSettings'>>
  ) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchOrganizations() {
    if (!userProfile?.organizations) {
      setOrganizations([]);
      setLoading(false);
      return;
    }
    const orgIds = Object.keys(userProfile.organizations);
    const orgDocs = await Promise.all(
      orgIds.map((id) => getDoc(doc(db, 'organizations', id)))
    );
    const orgs: Organization[] = orgDocs
      .filter((d) => d.exists())
      .map((d) => {
        const data = d.data()!;
        return {
          id: d.id,
          name: data.name,
          type: data.type,
          ownerId: data.ownerId,
          createdAt: data.createdAt?.toDate() || new Date(),
          branding: data.branding || { primaryColor: '#1a56db' },
          emailSettings: data.emailSettings || {
            sendConfirmations: true,
            sendReminders: true,
            reminderHoursBefore: 24,
          },
        };
      });
    setOrganizations(orgs);
    if (!currentOrg && orgs.length > 0) setCurrentOrg(orgs[0]);
    setLoading(false);
  }

  async function createOrganization(name: string, type: string): Promise<Organization> {
    if (!currentUser) throw new Error('Must be logged in to create an organization');
    const orgRef = await addDoc(collection(db, 'organizations'), {
      name,
      type,
      ownerId: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(
      userRef,
      { organizations: { ...userProfile?.organizations, [orgRef.id]: 'admin' } },
      { merge: true }
    );
    await refreshProfile();
    const newOrg: Organization = {
      id: orgRef.id,
      name,
      type,
      ownerId: currentUser.uid,
      createdAt: new Date(),
    };
    setOrganizations((prev) => [...prev, newOrg]);
    setCurrentOrg(newOrg);
    return newOrg;
  }

  async function updateOrganization(
    orgId: string,
    data: Partial<Pick<Organization, 'name' | 'branding' | 'emailSettings'>>
  ) {
    await setDoc(doc(db, 'organizations', orgId), data, { merge: true });
    setOrganizations((prev) =>
      prev.map((org) => (org.id === orgId ? { ...org, ...data } : org))
    );
    if (currentOrg?.id === orgId) setCurrentOrg({ ...currentOrg, ...data });
  }

  useEffect(() => {
    if (userProfile) {
      fetchOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrg(null);
      setLoading(false);
    }
  }, [userProfile]);

  return (
    <OrgContext.Provider
      value={{
        currentOrg,
        organizations,
        loading,
        setCurrentOrg,
        createOrganization,
        updateOrganization,
        refreshOrganizations: fetchOrganizations,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}
