import { useState } from 'react';

interface FaqItemProps {
  question: string;
  answer: string;
}

function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-gray-900 hover:text-gray-700"
      >
        <span>{question}</span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-600 leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

export function Support() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Support</h1>
        <p className="text-sm text-gray-500 mb-10">We're here to help.</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Volunteers &amp; Parents</h2>
            <div>
              <FaqItem
                question="How do I sign up for an event?"
                answer={`Browse to your organization's event page, find the event, and click "Sign Up." You'll receive a confirmation email once registered.`}
              />
              <FaqItem
                question="I didn't receive my confirmation email."
                answer="Check your spam folder. If it's not there, email us at support@matside.org and we'll confirm your registration manually."
              />
              <FaqItem
                question="I forgot my password."
                answer={`Use the "Forgot Password" link on the login page. A reset email will be sent to your address.`}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Organization Admins</h2>
            <div>
              <FaqItem
                question="How do I create an organization?"
                answer="After signing up, follow the setup flow to create your organization. You'll be the admin automatically."
              />
              <FaqItem
                question="How do I add or manage events?"
                answer={`From your admin dashboard, go to Events and click "New Event" to create one, or click an existing event to edit it.`}
              />
              <FaqItem
                question="How do I send reminder emails to volunteers?"
                answer={`Open the event in your admin dashboard and use the "Send Reminder" button to blast a reminder to all signed-up volunteers.`}
              />
            </div>
          </section>

          <section>
            <p className="text-sm text-gray-600 leading-relaxed">
              For any other questions or issues, please reach out to{' '}
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
