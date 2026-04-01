import { useState } from 'react';
import type { FormEvent } from 'react';
import { useOrg } from '../../contexts/OrgContext';

const colorPresets = [
  { name: 'Blue', value: '#243c7c' },
  { name: 'Green', value: '#166534' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Slate', value: '#475569' },
];

export function AdminSettings() {
  const { currentOrg, updateOrganization } = useOrg();

  const [name, setName] = useState(currentOrg?.name || '');
  const [primaryColor, setPrimaryColor] = useState(
    currentOrg?.branding?.primaryColor || '#243c7c'
  );
  const [logoUrl, setLogoUrl] = useState(currentOrg?.branding?.logoUrl || '');
  const [sendConfirmations, setSendConfirmations] = useState(
    currentOrg?.emailSettings?.sendConfirmations ?? true
  );
  const [sendReminders, setSendReminders] = useState(
    currentOrg?.emailSettings?.sendReminders ?? true
  );
  const [reminderHoursBefore, setReminderHoursBefore] = useState(
    currentOrg?.emailSettings?.reminderHoursBefore ?? 24
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setSaving(true);
    setMessage('');

    try {
      await updateOrganization(currentOrg.id, {
        name,
        branding: {
          primaryColor,
          logoUrl: logoUrl || undefined,
        },
        emailSettings: {
          sendConfirmations,
          sendReminders,
          reminderHoursBefore,
        },
      });
      setMessage('Settings saved successfully!');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!currentOrg) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Organization Settings</h1>
        <p className="page-subtitle">Customize your organization's appearance</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium">General</h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label htmlFor="name" className="label">
                  Organization Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input mt-1"
                  required
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium">Branding</h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="label">Primary Color</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setPrimaryColor(preset.value)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        primaryColor === preset.value
                          ? 'border-gray-900 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-500">Custom</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  This color will be used on your public event pages
                </p>
              </div>

              <div>
                <label htmlFor="logoUrl" className="label">
                  Logo URL (optional)
                </label>
                <input
                  id="logoUrl"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="input mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter a URL to your organization's logo image
                </p>
              </div>

              {(logoUrl || primaryColor !== '#243c7c') && (
                <div className="mt-4 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
                  <div
                    className="p-4 rounded-lg text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <div className="flex items-center gap-3">
                      {logoUrl && (
                        <img
                          src={logoUrl}
                          alt="Logo preview"
                          className="h-10 w-auto bg-white rounded p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span className="font-semibold">{name || 'Your Organization'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium">Email Notifications</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">
                    Signup Confirmations
                  </label>
                  <p className="text-sm text-gray-500">
                    Send an email when someone signs up for a slot
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSendConfirmations(!sendConfirmations)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    sendConfirmations ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      sendConfirmations ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">
                    Event Reminders
                  </label>
                  <p className="text-sm text-gray-500">
                    Send a reminder email before events
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSendReminders(!sendReminders)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    sendReminders ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      sendReminders ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {sendReminders && (
                <div className="ml-4 pl-4 border-l-2 border-gray-200">
                  <label htmlFor="reminderHours" className="label">
                    Send reminder how many hours before event?
                  </label>
                  <select
                    id="reminderHours"
                    value={reminderHoursBefore}
                    onChange={(e) => setReminderHoursBefore(parseInt(e.target.value))}
                    className="input mt-1 w-auto"
                  >
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours (1 day)</option>
                    <option value={48}>48 hours (2 days)</option>
                    <option value={72}>72 hours (3 days)</option>
                  </select>
                </div>
              )}

              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Email notifications require Firebase Cloud Functions to be deployed.
                  See the <code className="bg-amber-100 px-1 rounded">functions/</code> directory for setup instructions.
                </p>
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.includes('success')
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
