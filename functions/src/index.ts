import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

admin.initializeApp();
const db = admin.firestore();

const resendApiKey = defineSecret('RESEND_API_KEY');
const FROM_ADDRESS = 'noreply@alerts.signupsignin.com';

function sanitizeFromName(name: string): string {
  return name.replace(/[\r\n"<>]/g, '');
}

interface SignupData {
  eventId: string;
  slotId: string;
  userId: string;
  userName: string;
  userEmail: string;
  note?: string;
  reminderSent?: boolean;
}

interface EventData {
  title: string;
  startTime: admin.firestore.Timestamp;
  location?: string;
  description?: string;
}

interface SlotData {
  name: string;
  category: string;
  startTime?: admin.firestore.Timestamp;
  endTime?: admin.firestore.Timestamp;
}

interface OrgData {
  name: string;
  emailSettings?: {
    sendConfirmations: boolean;
    sendReminders: boolean;
    reminderHoursBefore: number;
  };
}

function escapeHtml(str: string | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatReminderSubject(eventTitle: string, hours: number): string {
  if (hours === 24) return `Reminder: ${eventTitle} is tomorrow!`;
  if (hours < 24) return `Reminder: ${eventTitle} is in ${hours} hours`;
  const days = Math.round(hours / 24);
  return `Reminder: ${eventTitle} is in ${days} days`;
}

function buildReminderHtml(
  userName: string,
  orgName: string,
  eventTitle: string,
  formattedDate: string,
  formattedTime: string,
  location: string | undefined,
  slotName: string | undefined,
  slotCategory: string | undefined
): string {
  return `
    <h2>Reminder: You're signed up!</h2>
    <p>Hi ${escapeHtml(userName)},</p>
    <p>This is a friendly reminder about your upcoming volunteer commitment:</p>
    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <strong style="font-size: 18px;">${escapeHtml(eventTitle)}</strong><br/>
      <span style="color: #666;">
        ${escapeHtml(formattedDate)} at ${escapeHtml(formattedTime)}<br/>
        ${location ? `Location: ${escapeHtml(location)}<br/>` : ''}
        ${slotName ? `Your role: ${escapeHtml(slotName)}${slotCategory ? ` (${escapeHtml(slotCategory)})` : ''}` : ''}
      </span>
    </div>
    <p>We look forward to seeing you there!</p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
    <p style="color: #999; font-size: 12px;">
      This reminder was sent by ${escapeHtml(orgName)} via SignupSignin.
    </p>
  `;
}

// Send confirmation email when a signup is created
export const onSignupCreated = onDocumentCreated(
  {
    document: 'organizations/{orgId}/signups/{signupId}',
    secrets: [resendApiKey],
  },
  async (event) => {
    const { orgId } = event.params;
    const signup = event.data?.data() as SignupData | undefined;
    if (!signup) return;

    try {
      const orgDoc = await db.doc(`organizations/${orgId}`).get();
      const org = orgDoc.data() as OrgData | undefined;

      if (!org?.emailSettings?.sendConfirmations) {
        console.log('Confirmation emails disabled for org:', orgId);
        return;
      }

      const resend = new Resend(resendApiKey.value());

      const eventDoc = await db
        .doc(`organizations/${orgId}/events/${signup.eventId}`)
        .get();
      const eventData = eventDoc.data() as EventData | undefined;
      if (!eventData) {
        console.error('Event not found:', signup.eventId);
        return;
      }

      const slotDoc = await db
        .doc(`organizations/${orgId}/events/${signup.eventId}/slots/${signup.slotId}`)
        .get();
      const slot = slotDoc.data() as SlotData | undefined;

      const eventDate = eventData.startTime.toDate();
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const slotTime = slot?.startTime
        ? slot.startTime.toDate().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        : '';

      await resend.emails.send({
        from: `${sanitizeFromName(org.name)} via SignupSignin <${FROM_ADDRESS}>`,
        to: signup.userEmail,
        subject: `Signup Confirmation: ${eventData.title}`,
        html: `
          <h2>You're signed up!</h2>
          <p>Hi ${escapeHtml(signup.userName)},</p>
          <p>This confirms your signup for:</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <strong style="font-size: 18px;">${escapeHtml(eventData.title)}</strong><br/>
            <span style="color: #666;">
              ${escapeHtml(formattedDate)}${slotTime ? ` at ${escapeHtml(slotTime)}` : ''}<br/>
              ${eventData.location ? `Location: ${escapeHtml(eventData.location)}<br/>` : ''}
              ${slot ? `Role: ${escapeHtml(slot.name)} (${escapeHtml(slot.category)})` : ''}
            </span>
          </div>
          <p>We'll send you a reminder before the event.</p>
          <p>Thank you for volunteering!</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px;">
            This email was sent by ${escapeHtml(org.name)} via SignupSignin.
          </p>
        `,
      });

      console.log('Confirmation email sent to:', signup.userEmail);
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  }
);

// Scheduled function to send reminder emails (runs every hour)
export const sendReminderEmails = onSchedule(
  {
    schedule: 'every 1 hours',
    secrets: [resendApiKey],
  },
  async () => {
    const now = new Date();
    const resend = new Resend(resendApiKey.value());

    try {
      const orgsSnapshot = await db
        .collection('organizations')
        .where('emailSettings.sendReminders', '==', true)
        .get();

      for (const orgDoc of orgsSnapshot.docs) {
        const org = orgDoc.data() as OrgData;
        const orgId = orgDoc.id;
        const reminderHours = org.emailSettings?.reminderHoursBefore ?? 24;

        const windowStart = new Date(
          now.getTime() + (reminderHours - 1) * 60 * 60 * 1000
        );
        const windowEnd = new Date(
          now.getTime() + reminderHours * 60 * 60 * 1000
        );

        const eventsSnapshot = await db
          .collection(`organizations/${orgId}/events`)
          .where('startTime', '>=', admin.firestore.Timestamp.fromDate(windowStart))
          .where('startTime', '<=', admin.firestore.Timestamp.fromDate(windowEnd))
          .get();

        for (const eventDoc of eventsSnapshot.docs) {
          const eventData = eventDoc.data() as EventData;
          const eventId = eventDoc.id;

          const signupsSnapshot = await db
            .collection(`organizations/${orgId}/signups`)
            .where('eventId', '==', eventId)
            .where('reminderSent', '!=', true)
            .get();

          for (const signupDoc of signupsSnapshot.docs) {
            const signup = signupDoc.data() as SignupData;

            const slotDoc = await db
              .doc(
                `organizations/${orgId}/events/${eventId}/slots/${signup.slotId}`
              )
              .get();
            const slot = slotDoc.data() as SlotData | undefined;

            const eventDate = eventData.startTime.toDate();
            const formattedDate = eventDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            const formattedTime = eventDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            try {
              await resend.emails.send({
                from: `${sanitizeFromName(org.name)} via SignupSignin <${FROM_ADDRESS}>`,
                to: signup.userEmail,
                subject: formatReminderSubject(eventData.title, reminderHours),
                html: buildReminderHtml(
                  signup.userName,
                  org.name,
                  eventData.title,
                  formattedDate,
                  formattedTime,
                  eventData.location,
                  slot?.name,
                  slot?.category
                ),
              });

              console.log('Reminder email sent to:', signup.userEmail);
              await signupDoc.ref.update({ reminderSent: true });
            } catch (emailError) {
              console.error(
                'Error sending reminder to:',
                signup.userEmail,
                emailError
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in sendReminderEmails:', error);
    }
  }
);

// HTTP callable to send a test email from the admin Settings page
export const sendTestEmail = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const resend = new Resend(resendApiKey.value());

    const { orgId, email } = request.data as { orgId: string; email: string };

    const userDoc = await db.doc(`users/${request.auth.uid}`).get();
    const userData = userDoc.data();

    if (!userData?.organizations?.[orgId]) {
      throw new HttpsError(
        'permission-denied',
        'Not a member of this organization'
      );
    }

    const orgDoc = await db.doc(`organizations/${orgId}`).get();
    const org = orgDoc.data() as OrgData | undefined;
    if (!org) {
      throw new HttpsError('not-found', 'Organization not found');
    }

    try {
      await resend.emails.send({
        from: `${sanitizeFromName(org.name)} via SignupSignin <${FROM_ADDRESS}>`,
        to: email,
        subject: 'Test Email from SignupSignin',
        html: `
      <h2>Test Email</h2>
      <p>Email notifications are working correctly for <strong>${escapeHtml(org.name)}</strong>.</p>
      <p>Your volunteers will receive signup confirmations and event reminders.</p>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
      <p style="color: #999; font-size: 12px;">
        This test was sent by ${escapeHtml(org.name)} via SignupSignin.
      </p>
    `,
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      throw new HttpsError('internal', 'Failed to send test email');
    }

    return { success: true };
  }
);

// HTTP callable to blast a reminder to all signups for a specific event
export const sendEventReminderBlast = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const resend = new Resend(resendApiKey.value());

    const { orgId, eventId } = request.data as {
      orgId: string;
      eventId: string;
    };

    const userDoc = await db.doc(`users/${request.auth.uid}`).get();
    const userData = userDoc.data();

    if (userData?.organizations?.[orgId] !== 'admin') {
      throw new HttpsError(
        'permission-denied',
        'Must be an admin of this organization'
      );
    }

    const orgDoc = await db.doc(`organizations/${orgId}`).get();
    const org = orgDoc.data() as OrgData | undefined;
    if (!org) {
      throw new HttpsError('not-found', 'Organization not found');
    }

    const eventDoc = await db
      .doc(`organizations/${orgId}/events/${eventId}`)
      .get();
    const eventData = eventDoc.data() as EventData | undefined;
    if (!eventData) {
      throw new HttpsError('not-found', 'Event not found');
    }

    const signupsSnapshot = await db
      .collection(`organizations/${orgId}/signups`)
      .where('eventId', '==', eventId)
      .get();
    let sent = 0;

    const eventDate = eventData.startTime.toDate();
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    for (const signupDoc of signupsSnapshot.docs) {
      const signup = signupDoc.data() as SignupData;

      const slotDoc = await db
        .doc(`organizations/${orgId}/events/${eventId}/slots/${signup.slotId}`)
        .get();
      const slot = slotDoc.data() as SlotData | undefined;

      try {
        await resend.emails.send({
          from: `${sanitizeFromName(org.name)} via SignupSignin <${FROM_ADDRESS}>`,
          to: signup.userEmail,
          subject: `Reminder: ${eventData.title}`,
          html: buildReminderHtml(
            signup.userName,
            org.name,
            eventData.title,
            formattedDate,
            formattedTime,
            eventData.location,
            slot?.name,
            slot?.category
          ),
        });
        sent++;
      } catch (emailError) {
        console.error(
          'Error sending blast reminder to:',
          signup.userEmail,
          emailError
        );
      }
    }

    return { sent };
  }
);
