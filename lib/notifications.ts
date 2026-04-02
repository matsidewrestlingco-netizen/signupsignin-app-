import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Sends a push notification to all signed-up volunteers for an event.
 * Fetches their Expo push tokens from Firestore, then calls the Expo Push API.
 */
export async function sendEventNotification(
  orgId: string,
  eventId: string,
  title: string,
  body: string
): Promise<{ sent: number; failed: number }> {
  // 1. Get all signups for this event
  const signupsRef = collection(db, 'organizations', orgId, 'signups');
  const q = query(signupsRef, where('eventId', '==', eventId));
  const signupSnap = await getDocs(q);

  // 2. Collect unique userIds
  const userIds = [...new Set(signupSnap.docs.map(d => d.data().userId as string))];

  if (userIds.length === 0) return { sent: 0, failed: 0 };

  // 3. Fetch push tokens for each user
  const tokenPromises = userIds.map(uid => getDoc(doc(db, 'users', uid)));
  const userDocs = await Promise.all(tokenPromises);
  const tokens = userDocs
    .map(d => d.exists() ? (d.data()?.pushToken as string | undefined) : undefined)
    .filter((t): t is string => typeof t === 'string' && t.startsWith('ExponentPushToken'));

  if (tokens.length === 0) return { sent: 0, failed: 0 };

  // 4. Send via Expo Push API (batched, max 100 per request)
  const messages = tokens.map(to => ({ to, title, body, sound: 'default' as const }));
  const BATCH_SIZE = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      const result = await response.json() as { data?: Array<{ status: string }> };
      if (result.data) {
        sent += result.data.filter(r => r.status === 'ok').length;
        failed += result.data.filter(r => r.status !== 'ok').length;
      } else {
        failed += batch.length;
      }
    } catch {
      failed += batch.length;
    }
  }

  return { sent, failed };
}
