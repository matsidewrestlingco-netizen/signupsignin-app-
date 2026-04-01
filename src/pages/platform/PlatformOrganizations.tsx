import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatformOrgs } from '../../hooks/usePlatformOrgs';
import { usePlatformUsers } from '../../hooks/usePlatformUsers';

export function PlatformOrganizations() {
  const { organizations, loading } = usePlatformOrgs();
  const { users } = usePlatformUsers();
  const [search, setSearch] = useState('');

  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(search.toLowerCase())
  );

  function getOrgAdmins(orgId: string) {
    return users.filter((u) => {
      const role = u.organizations[orgId];
      return role === 'admin';
    });
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700 mx-auto"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Organizations</h1>
        <span className="text-sm text-gray-500">{organizations.length} total</span>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div className="rounded-lg bg-white shadow">
        {filteredOrgs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {search ? 'No organizations match your search.' : 'No organizations yet.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredOrgs.map((org) => {
              const admins = getOrgAdmins(org.id);

              return (
                <div key={org.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        to={`/platform/organizations/${org.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                      >
                        {org.name}
                      </Link>
                      <p className="text-sm text-gray-500">{org.type}</p>
                    </div>
                    <p className="text-sm text-gray-400">
                      {org.createdAt?.toLocaleDateString() || 'Unknown'}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-500">Events: </span>
                      <span className="font-medium text-gray-900">{org.eventCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Admins: </span>
                      <span className="font-medium text-gray-900">
                        {admins.map((a) => a.name || a.email).join(', ') || 'None'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Link
                      to={`/platform/organizations/${org.id}`}
                      className="text-sm text-primary-600 hover:text-primary-500"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
