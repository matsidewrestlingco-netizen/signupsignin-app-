import { renderHook, act } from '@testing-library/react-native';
import { useEvents } from '../../hooks/useEvents';

jest.mock('../../lib/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn((q, cb) => {
    cb({ forEach: (fn: (d: unknown) => void) => [] });
    return jest.fn();
  }),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: { fromDate: jest.fn((d) => d) },
}));

describe('useEvents', () => {
  it('returns empty array and loading false when orgId is undefined', async () => {
    const { result } = renderHook(() => useEvents(undefined));
    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('exposes createEvent, updateEvent, deleteEvent functions', () => {
    const { result } = renderHook(() => useEvents('org123'));
    expect(typeof result.current.createEvent).toBe('function');
    expect(typeof result.current.updateEvent).toBe('function');
    expect(typeof result.current.deleteEvent).toBe('function');
  });
});
