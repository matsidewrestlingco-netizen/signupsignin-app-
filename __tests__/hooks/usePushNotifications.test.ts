jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  setDoc: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { eas: { projectId: 'test-project-id' } } } },
}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'undetermined' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test-token]' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: { MAX: 5 },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { usePushNotifications } from '../../hooks/usePushNotifications';

describe('usePushNotifications', () => {
  it('returns null token when userId is undefined', () => {
    const { result } = renderHook(() => usePushNotifications(undefined));
    expect(result.current.expoPushToken).toBeNull();
  });

  it('requests permission and gets token when userId is provided', async () => {
    const { result } = renderHook(() => usePushNotifications('user123'));
    await waitFor(() => {
      expect(result.current.expoPushToken).toBe('ExponentPushToken[test-token]');
    });
  });

  it('sets permissionStatus to granted after permission request', async () => {
    const { result } = renderHook(() => usePushNotifications('user123'));
    await waitFor(() => {
      expect(result.current.permissionStatus).toBe('granted');
    });
  });
});
