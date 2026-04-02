import { Redirect } from 'expo-router';

// Immediately redirect to login; _layout.tsx will handle the real routing
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
