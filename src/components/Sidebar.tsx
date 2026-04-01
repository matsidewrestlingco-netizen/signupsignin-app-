import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';

const adminNavItems = [
  { name: 'Dashboard', path: '/admin' },
  { name: 'Events', path: '/admin/events' },
  { name: 'Templates', path: '/admin/templates' },
  { name: 'Reports', path: '/admin/reports' },
  { name: 'Settings', path: '/admin/settings' },
];

const parentNavItems = [
  { name: 'My Signups', path: '/parent' },
  { name: 'Check In', path: '/parent/checkin' },
];

interface SidebarProps {
  type: 'admin' | 'parent' | 'platform';
}

const platformNavItems = [
  { name: 'Overview', path: '/platform' },
  { name: 'Users', path: '/platform/users' },
  { name: 'Organizations', path: '/platform/organizations' },
];

export function Sidebar({ type }: SidebarProps) {
  const { logOut, userProfile, isSuperAdmin } = useAuth();
  const { currentOrg, organizations, setCurrentOrg } = useOrg();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems =
    type === 'admin' ? adminNavItems :
    type === 'platform' ? platformNavItems :
    parentNavItems;

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-primary-700 text-white w-64">
      <div className="p-4 border-b border-primary-600">
        <h1 className="text-xl font-bold">SignupSignin</h1>
        {type === 'platform' && (
          <p className="mt-1 text-xs text-primary-300 uppercase tracking-wider font-semibold">
            Platform Admin
          </p>
        )}
        {type === 'admin' && organizations.length > 0 && (
          <select
            value={currentOrg?.id || ''}
            onChange={(e) => {
              const org = organizations.find((o) => o.id === e.target.value);
              setCurrentOrg(org || null);
            }}
            className="mt-2 w-full bg-primary-800 text-white text-sm rounded-md border-primary-600 focus:border-primary-400 focus:ring-primary-400"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/platform' || item.path === '/admin'}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-800 text-white'
                      : 'text-primary-100 hover:bg-primary-600'
                  }`
                }
              >
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>

        {type === 'admin' && (
          <div className="mt-6 pt-6 border-t border-primary-600">
            <NavLink
              to="/parent"
              className="block px-4 py-2 text-primary-200 hover:bg-primary-600 rounded-md"
            >
              Switch to Parent View
            </NavLink>
          </div>
        )}

        {type === 'parent' && userProfile?.organizations && Object.values(userProfile.organizations).includes('admin') && (
          <div className="mt-6 pt-6 border-t border-primary-600">
            <NavLink
              to="/admin"
              className="block px-4 py-2 text-primary-200 hover:bg-primary-600 rounded-md"
            >
              Switch to Admin View
            </NavLink>
          </div>
        )}

        {type !== 'platform' && isSuperAdmin && (
          <div className="mt-6 pt-6 border-t border-primary-600">
            <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-primary-300">
              Platform
            </p>
            <ul className="space-y-1">
              {platformNavItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={() =>
                      `block px-4 py-2 rounded-md transition-colors ${
                        location.pathname === item.path
                          ? 'bg-primary-800 text-white'
                          : 'text-primary-100 hover:bg-primary-600'
                      }`
                    }
                  >
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        {type === 'platform' && userProfile?.organizations && Object.values(userProfile.organizations).includes('admin') && (
          <div className="mt-6 pt-6 border-t border-primary-600">
            <NavLink
              to="/admin"
              className="block px-4 py-2 text-primary-200 hover:bg-primary-600 rounded-md"
            >
              Switch to Admin View
            </NavLink>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-primary-600">
        <div className="text-sm text-primary-200 mb-2 truncate">
          {userProfile?.email}
        </div>
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-sm text-left text-primary-200 hover:bg-primary-600 rounded-md transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
