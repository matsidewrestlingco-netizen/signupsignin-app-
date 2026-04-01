import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOrg } from '../../contexts/OrgContext';
import { useAuth } from '../../contexts/AuthContext';

const organizationTypes = [
  { value: 'school', label: 'School' },
  { value: 'nonprofit', label: 'Non-profit' },
  { value: 'church', label: 'Church / Religious' },
  { value: 'community', label: 'Community Group' },
  { value: 'sports', label: 'Sports League' },
  { value: 'other', label: 'Other' },
];

export function CreateOrganization() {
  const [name, setName] = useState('');
  const [type, setType] = useState('school');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { createOrganization } = useOrg();
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const hasOrganization = userProfile?.organizations && Object.keys(userProfile.organizations).length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await createOrganization(name, type);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link to="/" className="block text-center">
            <h1 className="text-3xl font-bold text-primary-700">SignupSignin</h1>
          </Link>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            {hasOrganization ? 'Create another organization' : 'Create your organization'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {hasOrganization
              ? 'Add a new organization to manage'
              : 'Set up your organization to start managing events'}
          </p>
        </div>

        {hasOrganization && (
          <div className="text-center">
            <Link
              to="/admin"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              Go back to dashboard
            </Link>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="label">
                Organization name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Lincoln Elementary PTA"
                className="input mt-1"
              />
            </div>
            <div>
              <label htmlFor="type" className="label">
                Organization type
              </label>
              <select
                id="type"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input mt-1"
              >
                {organizationTypes.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Creating...' : 'Create organization'}
          </button>

          {!hasOrganization && (
            <div className="text-center">
              <Link
                to="/parent"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Skip for now - just sign up for events
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
