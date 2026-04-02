jest.mock('../../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  getDocs: jest.fn().mockResolvedValue({
    docs: [
      { data: () => ({ userId: 'user1' }) },
      { data: () => ({ userId: 'user2' }) },
    ],
  }),
  query: jest.fn(ref => ref),
  where: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  getDoc: jest.fn().mockImplementation((_ref) =>
    Promise.resolve({
      exists: () => true,
      data: () => ({ pushToken: 'ExponentPushToken[test]' }),
    })
  ),
}));

import { sendEventNotification } from '../../lib/notifications';

describe('sendEventNotification', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        data: [{ status: 'ok' }, { status: 'ok' }],
      }),
    });
  });

  it('returns sent count on success', async () => {
    const result = await sendEventNotification('org1', 'e1', 'Hello', 'World');
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('calls Expo Push API endpoint', async () => {
    await sendEventNotification('org1', 'e1', 'Hello', 'World');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
