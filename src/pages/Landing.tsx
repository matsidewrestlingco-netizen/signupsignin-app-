import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Landing() {
  const { currentUser, userProfile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 to-primary-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-white">SignupSignin</span>
          </div>
          <div className="flex items-center gap-4">
            {currentUser ? (
              <>
                <Link
                  to={userProfile?.organizations && Object.keys(userProfile.organizations).length > 0 ? '/admin' : '/parent'}
                  className="text-white hover:text-primary-200"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-white hover:text-primary-200"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="btn bg-white text-primary-700 hover:bg-primary-50"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>

        <main className="py-20">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Volunteer Event Signups
              <br />
              <span className="text-primary-200">Made Simple</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-primary-100">
              Manage volunteer signups, track attendance, and generate reports
              for your organization's events. Easy for admins, simple for
              volunteers.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              {currentUser ? (
                <Link
                  to={userProfile?.organizations && Object.keys(userProfile.organizations).length > 0 ? '/admin' : '/parent'}
                  className="btn bg-white text-primary-700 hover:bg-primary-50 px-8 py-3 text-lg"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="btn bg-white text-primary-700 hover:bg-primary-50 px-8 py-3 text-lg"
                  >
                    Get Started
                  </Link>
                  <Link
                    to="/login"
                    className="btn border-2 border-white text-white hover:bg-primary-600 px-8 py-3 text-lg"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-white">
              <div className="text-3xl mb-4">📅</div>
              <h3 className="text-xl font-semibold mb-2">Create Events</h3>
              <p className="text-primary-100">
                Set up events with multiple volunteer slots, time slots, and
                capacity limits.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-white">
              <div className="text-3xl mb-4">✅</div>
              <h3 className="text-xl font-semibold mb-2">Easy Check-in</h3>
              <p className="text-primary-100">
                Volunteers can self check-in or admins can mark attendance with
                one click.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-white">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Reports & Export</h3>
              <p className="text-primary-100">
                Generate detailed reports and export data to CSV for your
                records.
              </p>
            </div>
          </div>
        </main>

        <footer className="py-8 border-t border-primary-600">
          <p className="text-center text-primary-200 text-sm">
            SignupSignin - Volunteer Event Management
          </p>
        </footer>
      </div>
    </div>
  );
}
