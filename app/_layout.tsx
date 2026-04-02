import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { OrgProvider } from '../contexts/OrgContext';
import { LoadingScreen } from '../components/LoadingScreen';

function RootLayoutNav() {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inAdmin = segments[0] === '(admin)';
    const inVolunteer = segments[0] === '(volunteer)';

    if (!currentUser) {
      // Not logged in — send to login
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (!userProfile) return; // Still loading profile

    const isAdmin = Object.keys(userProfile.organizations ?? {}).length > 0;

    if (inAuth) {
      // Logged in and on auth screen — redirect to correct tab bar
      router.replace(isAdmin ? '/(admin)/dashboard' : '/(volunteer)/dashboard');
    } else if (isAdmin && inVolunteer) {
      router.replace('/(admin)/dashboard');
    } else if (!isAdmin && inAdmin) {
      router.replace('/(volunteer)/dashboard');
    }
  }, [currentUser, userProfile, loading, segments]);

  if (loading) return <LoadingScreen />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <OrgProvider>
        <RootLayoutNav />
      </OrgProvider>
    </AuthProvider>
  );
}
