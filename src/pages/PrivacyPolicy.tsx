export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Effective date: April 3, 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Introduction</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              SignupSignIn ("we," "us," or "our") is a volunteer event signup and check-in platform
              for organizations. This Privacy Policy explains what information we collect, how we
              use it, and your rights regarding your data. By using SignupSignIn, you agree to the
              practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Information We Collect</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              We collect information you provide directly when you use the service:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 leading-relaxed space-y-1">
              <li><strong>Account information:</strong> your email address and password (managed via Firebase Authentication)</li>
              <li><strong>Profile information:</strong> your name, as provided when signing up for events</li>
              <li><strong>Event signup data:</strong> the events you register for and your attendance records, stored in association with your name and email</li>
              <li><strong>Organization membership:</strong> which organizations you are associated with on the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-sm text-gray-600 leading-relaxed space-y-1">
              <li>To provide and operate the SignupSignIn service</li>
              <li>To send you event confirmation and reminder emails</li>
              <li>To allow organization administrators to manage event rosters and check-in</li>
              <li>To improve the platform over time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Third-Party Services</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              We use the following third-party services to operate SignupSignIn:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 leading-relaxed space-y-1">
              <li>
                <strong>Firebase (Google):</strong> authentication, database, and hosting.{' '}
                <a
                  href="https://firebase.google.com/support/privacy"
                  className="text-primary-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Firebase Privacy Policy
                </a>
              </li>
              <li>
                <strong>Resend:</strong> transactional email delivery (confirmations and reminders).{' '}
                <a
                  href="https://resend.com/legal/privacy-policy"
                  className="text-primary-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Resend Privacy Policy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Sharing</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We do not sell your personal information. Your data is shared only with the
              third-party service providers listed above, solely to operate the platform.
              Organization administrators can see the names and email addresses of volunteers who
              sign up for their events.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Retention</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We retain your account data for as long as your account is active. Event signup
              records are retained at the discretion of the organization that manages the event.
              You may request deletion of your account and associated data at any time by
              contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              You have the right to access, correct, or request deletion of your personal
              information. To exercise these rights, email us at{' '}
              <a href="mailto:support@matside.org" className="text-primary-600 hover:underline">
                support@matside.org
              </a>
              .
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              If you are located in the European Union, you may have additional rights under the
              General Data Protection Regulation (GDPR), including the right to data portability
              and the right to lodge a complaint with a supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Children's Privacy</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              SignupSignIn is not directed at children under the age of 13. We do not knowingly
              collect personal information directly from children under 13. The platform is
              intended to be used by adults (such as parents or coaches) who may register on
              behalf of minors. If you believe we have inadvertently collected information from a
              child under 13, please contact us at{' '}
              <a href="mailto:support@matside.org" className="text-primary-600 hover:underline">
                support@matside.org
              </a>{' '}
              and we will promptly delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Security</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We use industry-standard security measures to protect your information, including
              Firebase's secure infrastructure and encrypted HTTPS connections. No method of
              transmission over the internet is 100% secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Changes to This Policy</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. When we do, we will revise the
              effective date at the top of this page. We encourage you to review this policy
              periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              If you have questions or concerns about this Privacy Policy or your data, please
              contact us at{' '}
              <a href="mailto:support@matside.org" className="text-primary-600 hover:underline">
                support@matside.org
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
