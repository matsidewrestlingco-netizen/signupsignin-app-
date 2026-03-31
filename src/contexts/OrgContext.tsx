import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

export interface OrgBranding {
  primaryColor: string;
  logoUrl?: string;
}

export interface EmailSettings {
  sendConfirmations: boolean;
  sendReminders: boolean;
  reminderHoursBefore: number;
}

export interface Organization {
  id: string;
  name: string;
  type: string;
  ownerId: string;
  createdAt: Date;
  branding?: OrgBranding;
  emailSettings?: EmailSettings;
}

interface OrgContextType {
  currentOrg: Organization | null;
  organizations: Organization[];
  loading: boolean;
  setCurrentOrg: (org: Organization | null) => void;
  createOrganization: (name: string, type: string) => Promise<Organization>;
  updateOrganization: (orgId: string, data: Partial<Pick<Organization, 'name' | 'branding' | 'emailSettings'>>) => Promise<void>;
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

interface OrgProviderProps {
  children: ReactNode;
}

export function OrgProvider({ children }: OrgProviderProps) {
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
      .filter((orgDoc) => orgDoc.exists())
      .map((orgDoc) => {
        const data = orgDoc.data()!;
        return {
          id: orgDoc.id,
          name: data.name,
          type: data.type,
          ownerId: data.ownerId,
          createdAt: data.createdAt?.toDate() || new Date(),
          branding: data.branding || { primaryColor: '#243c7c' },
          emailSettings: data.emailSettings || {
            sendConfirmations: true,
            sendReminders: true,
            reminderHoursBefore: 24,
          },
        };
      });

    setOrganizations(orgs);

    if (!currentOrg && orgs.length > 0) {
      setCurrentOrg(orgs[0]);
    }

    setLoading(false);
  }

  async function createOrganization(name: string, type: string): Promise<Organization> {
    if (!currentUser) {
      throw new Error('Must be logged in to create an organization');
    }

    const orgRef = await addDoc(collection(db, 'organizations'), {
      name,
      type,
      ownerId: currentUser.uid,
      createdAt: serverTimestamp(),
    });

    // Add organization to user's profile
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(
      userRef,
      {
        organizations: {
          ...userProfile?.organizations,
          [orgRef.id]: 'admin',
        },
      },
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
  ): Promise<void> {
    const orgRef = doc(db, 'organizations', orgId);
    await setDoc(orgRef, data, { merge: true });

    // Update local state
    setOrganizations((prev) =>
      prev.map((org) => (org.id === orgId ? { ...org, ...data } : org))
    );

    if (currentOrg?.id === orgId) {
      setCurrentOrg({ ...currentOrg, ...data });
    }
  }

  async function refreshOrganizations() {
    await fetchOrganizations();
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

  const value = {
    currentOrg,
    organizations,
    loading,
    setCurrentOrg,
    createOrganization,
    updateOrganization,
    refreshOrganizations,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}
