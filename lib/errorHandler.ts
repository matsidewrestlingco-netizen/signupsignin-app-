import { Alert } from 'react-native';

// Diagnostic: intercept fatal JS errors and show them before the app aborts.
// This is only useful in TestFlight/production where red-screen overlay is absent.
// Remove once the startup crash is resolved.
const EU = (global as any).ErrorUtils;
if (EU) {
  const defaultHandler = EU.getGlobalHandler();
  EU.setGlobalHandler((error: Error, isFatal: boolean) => {
    if (isFatal) {
      const msg = error?.message ?? 'Unknown error';
      const stack = error?.stack?.slice(0, 600) ?? '(no stack)';
      // Give Alert time to render before defaultHandler aborts the process
      const fallbackTimer = setTimeout(() => defaultHandler(error, isFatal), 20000);
      Alert.alert(
        'Fatal Startup Error (Debug)',
        `${msg}\n\n${stack}`,
        [
          {
            text: 'OK',
            onPress: () => {
              clearTimeout(fallbackTimer);
              defaultHandler(error, isFatal);
            },
          },
        ],
      );
    } else {
      defaultHandler(error, isFatal);
    }
  });
}
