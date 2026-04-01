import { Link, useParams } from 'react-router-dom';
import { usePlatformOrgDetail } from '../../hooks/usePlatformOrgDetail';
import { usePlatformUsers } from '../../hooks/usePlatformUsers';

export function PlatformOrgDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const { orgDetail, loading } = usePlatformOrgDetail(orgId);
  const { users } = usePlatformUsers();

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700 mx-auto"></div>
      </div>
    );
  }

  if (!orgDetail) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Organization not found.</p>
        <Link
          to="/platform/organizations"
          className="mt-2 text-primary-600 hover:text-primary-500 text-sm"
        >
          Back to organizations
        </Link>
      </div>
    );
  }

  // Find admin users and owner for this org
  const orgAdmins = users.filter((u) => u.organizations[orgDetail.id] === 'admin');
  const ownerUser = users.find((u) => u.id === orgDetail.ownerId);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to="/platform/organizations"
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          Organizations
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-sm text-gray-500">{orgDetail.name}</span>
      </div>

      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{orgDetail.name}</h1>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-lg bg-white p-5 shadow">
          <p className="text-sm font-medium text-gray-500">Type</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{orgDetail.type}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow">
          <p className="text-sm font-medium text-gray-500">Events</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {orgDetail.events.length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow">
          <p className="text-sm font-medium text-gray-500">Created</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {orgDetail.createdAt?.toLocaleDateString() || 'Unknown'}
          </p>
        </div>
      </div>

      {/* Owner & Admins */}
      <div className="rounded-lg bg-white p-6 shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Owner & Admins</h2>
        {ownerUser && (
          <div className="mb-3">
            <span className="text-sm text-gray-500">Owner: </span>
            <span className="text-sm font-medium text-gray-900">
              {ownerUser.name || ownerUser.email}
            </span>
            <span className="text-sm text-gray-400"> ({ownerUser.email})</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {orgAdmins.map((admin) => (
            <span
              key={admin.id}
              className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
            >
              {admin.name || admin.email}
            </span>
          ))}
          {orgAdmins.length === 0 && (
            <p className="text-sm text-gray-400">No admins found</p>
          )}
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Events ({orgDetail.events.length})
          </h2>
        </div>
        {orgDetail.events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No events yet.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Signups
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orgDetail.events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {event.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.date?.toLocaleDateString() || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.signupCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
