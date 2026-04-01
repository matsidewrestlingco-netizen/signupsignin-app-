import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();
const db = admin.firestore();

// Configure email transporter (uses Firebase config for credentials)
// Set these with: firebase functions:config:set email.user="your@email.com" email.pass="your-app-password"
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user,
    pass: functions.config().email?.pass,
  },
});

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

// Send confirmation email when a signup is created
export const onSignupCreated = functions.firestore
  .document('organizations/{orgId}/signups/{signupId}')
  .onCreate(async (snap, context) => {
    const { orgId } = context.params;
    const signup = snap.data() as SignupData;

    try {
      // Get org settings
      const orgDoc = await db.doc(`organizations/${orgId}`).get();
      const org = orgDoc.data() as OrgData | undefined;

      if (!org?.emailSettings?.sendConfirmations) {
        console.log('Confirmation emails disabled for org:', orgId);
        return;
      }

      // Get event details
      const eventDoc = await db.doc(`organizations/${orgId}/events/${signup.eventId}`).get();
      const event = eventDoc.data() as EventData | undefined;

      if (!event) {
        console.error('Event not found:', signup.eventId);
        return;
      }

      // Get slot details
      const slotDoc = await db.doc(`organizations/${orgId}/events/${signup.eventId}/slots/${signup.slotId}`).get();
      const slot = slotDoc.data() as SlotData | undefined;

      // Format date
      const eventDate = event.startTime.toDate();
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const slotTime = slot?.startTime
        ? slot.startTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : '';

      // Send confirmation email
      const mailOptions = {
        from: `"${org.name}" <${functions.config().email?.user}>`,
        to: signup.userEmail,
        subject: `Signup Confirmation: ${event.title}`,
        html: `
          <h2>You're signed up!</h2>
          <p>Hi ${signup.userName},</p>
          <p>This confirms your signup for:</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <strong style="font-size: 18px;">${event.title}</strong><br/>
            <span style="color: #666;">
              ${formattedDate}${slotTime ? ` at ${slotTime}` : ''}<br/>
              ${event.location ? `Location: ${event.location}<br/>` : ''}
              ${slot ? `Role: ${slot.name} (${slot.category})` : ''}
            </span>
          </div>
          <p>We'll send you a reminder before the event.</p>
          <p>Thank you for volunteering!</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px;">
            This email was sent by ${org.name} via SignupSignin.
          </p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log('Confirmation email sent to:', signup.userEmail);
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  });

// Scheduled function to send reminder emails (runs every hour)
export const sendReminderEmails = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const now = new Date();

    try {
      // Get all organizations with reminders enabled
      const orgsSnapshot = await db
        .collection('organizations')
        .where('emailSettings.sendReminders', '==', true)
        .get();

      for (const orgDoc of orgsSnapshot.docs) {
        const org = orgDoc.data() as OrgData;
        const orgId = orgDoc.id;
        const reminderHours = org.emailSettings?.reminderHoursBefore || 24;

        // Calculate the time window for reminders
        const reminderWindowStart = new Date(now.getTime() + (reminderHours - 1) * 60 * 60 * 1000);
        const reminderWindowEnd = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);

        // Find events starting within the reminder window
        const eventsSnapshot = await db
          .collection(`organizations/${orgId}/events`)
          .where('startTime', '>=', admin.firestore.Timestamp.fromDate(reminderWindowStart))
          .where('startTime', '<=', admin.firestore.Timestamp.fromDate(reminderWindowEnd))
          .get();

        for (const eventDoc of eventsSnapshot.docs) {
          const event = eventDoc.data() as EventData;
          const eventId = eventDoc.id;

          // Get signups for this event that haven't received reminders
          const signupsSnapshot = await db
            .collection(`organizations/${orgId}/signups`)
            .where('eventId', '==', eventId)
            .where('reminderSent', '!=', true)
            .get();

          for (const signupDoc of signupsSnapshot.docs) {
            const signup = signupDoc.data() as SignupData;

            // Get slot details
            const slotDoc = await db.doc(`organizations/${orgId}/events/${eventId}/slots/${signup.slotId}`).get();
            const slot = slotDoc.data() as SlotData | undefined;

            const eventDate = event.startTime.toDate();
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
              const mailOptions = {
                from: `"${org.name}" <${functions.config().email?.user}>`,
                to: signup.userEmail,
                subject: `Reminder: ${event.title} is tomorrow!`,
                html: `
                  <h2>Reminder: You're signed up!</h2>
                  <p>Hi ${signup.userName},</p>
                  <p>This is a friendly reminder about your upcoming volunteer commitment:</p>
                  <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <strong style="font-size: 18px;">${event.title}</strong><br/>
                    <span style="color: #666;">
                      ${formattedDate} at ${formattedTime}<br/>
                      ${event.location ? `Location: ${event.location}<br/>` : ''}
                      ${slot ? `Your role: ${slot.name} (${slot.category})` : ''}
                    </span>
                  </div>
                  <p>We look forward to seeing you there!</p>
                  <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
                  <p style="color: #999; font-size: 12px;">
                    This reminder was sent by ${org.name} via SignupSignin.
                  </p>
                `,
              };

              await transporter.sendMail(mailOptions);
              console.log('Reminder email sent to:', signup.userEmail);

              // Mark reminder as sent
              await signupDoc.ref.update({ reminderSent: true });
            } catch (emailError) {
              console.error('Error sending reminder to:', signup.userEmail, emailError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in sendReminderEmails:', error);
    }
  });

// HTTP function to manually trigger a test email
export const sendTestEmail = functions.https.onCall(async (data, context) => {
  // Verify the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { email, orgId } = data;

  // Verify user has access to the org
  const userDoc = await db.doc(`users/${context.auth.uid}`).get();
  const userData = userDoc.data();

  if (!userData?.organizations?.[orgId]) {
    throw new functions.https.HttpsError('permission-denied', 'Not an admin of this organization');
  }

  const orgDoc = await db.doc(`organizations/${orgId}`).get();
  const org = orgDoc.data() as OrgData | undefined;

  if (!org) {
    throw new functions.https.HttpsError('not-found', 'Organization not found');
  }

  try {
    await transporter.sendMail({
      from: `"${org.name}" <${functions.config().email?.user}>`,
      to: email,
      subject: 'Test Email from SignupSignin',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from ${org.name}.</p>
        <p>If you received this, email notifications are working correctly!</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending test email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send test email');
  }
});
