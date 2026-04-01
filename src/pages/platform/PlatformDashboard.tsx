import { Link } from 'react-router-dom';
import { usePlatformUsers } from '../../hooks/usePlatformUsers';
import { usePlatformOrgs } from '../../hooks/usePlatformOrgs';

export function PlatformDashboard() {
  const { users, loading: usersLoading } = usePlatformUsers();
  const { organizations, loading: orgsLoading } = usePlatformOrgs();

  const loading = usersLoading || orgsLoading;

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700 mx-auto"></div>
      </div>
    );
  }

  const totalUsers = users.length;
  const totalOrgs = organizations.length;

  // Recent users (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSignups = users.filter(
    (u) => u.createdAt && u.createdAt >= thirtyDaysAgo
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Overview</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm font-medium text-gray-500">Total Users</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalUsers}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm font-medium text-gray-500">Total Organizations</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalOrgs}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm font-medium text-gray-500">Recent Signups (30d)</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{recentSignups}</p>
        </div>
      </div>

      {/* Recent Users & Orgs side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Users</h2>
          <div className="space-y-3">
            {users
              .filter((u) => u.createdAt)
              .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
              .slice(0, 5)
              .map((user) => (
                <div key={user.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{user.name || 'No name'}</p>
                    <p className="text-gray-500">{user.email}</p>
                  </div>
                  <p className="text-gray-400">{user.createdAt?.toLocaleDateString()}</p>
                </div>
              ))}
          </div>
          <Link
            to="/platform/users"
            className="mt-4 block text-sm text-primary-600 hover:text-primary-500"
          >
            View all users
          </Link>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organizations</h2>
          <div className="space-y-3">
            {organizations.slice(0, 5).map((org) => (
              <div key={org.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{org.name}</p>
                  <p className="text-gray-500">{org.type}</p>
                </div>
                <p className="text-gray-400">
                  {org.createdAt?.toLocaleDateString() || 'Unknown'}
                </p>
              </div>
            ))}
          </div>
          <Link
            to="/platform/organizations"
            className="mt-4 block text-sm text-primary-600 hover:text-primary-500"
          >
            View all organizations
          </Link>
        </div>
      </div>
    </div>
  );
}
