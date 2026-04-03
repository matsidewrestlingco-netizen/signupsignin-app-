import { BrowserRouter, Routes, Route, Outlet, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrgProvider } from './contexts/OrgContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SuperAdminRoute } from './components/SuperAdminRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import Footer from './components/Footer';

// Public pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { ForgotPassword } from './pages/ForgotPassword';
import { Events } from './pages/Events';
import { EventDetail } from './pages/EventDetail';
import { PrivacyPolicy } from './pages/PrivacyPolicy';

// Setup pages
import { CreateOrganization } from './pages/setup/CreateOrganization';

// Admin pages
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminEvents } from './pages/admin/Events';
import { AdminEventDetail } from './pages/admin/EventDetail';
import { AdminReports } from './pages/admin/Reports';
import { AdminSettings } from './pages/admin/Settings';
import { AdminTemplates } from './pages/admin/Templates';
import { EventCheckIn } from './pages/admin/EventCheckIn';

// Parent pages
import { ParentDashboard } from './pages/parent/Dashboard';
import { ParentEventSignup } from './pages/parent/EventSignup';
import { ParentCheckIn } from './pages/parent/CheckIn';

// Platform pages
import { PlatformDashboard } from './pages/platform/PlatformDashboard';
import { PlatformUsers } from './pages/platform/PlatformUsers';
import { PlatformOrganizations } from './pages/platform/PlatformOrganizations';
import { PlatformOrgDetail } from './pages/platform/PlatformOrgDetail';

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Page not found</h2>
        <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary px-6 py-2">Go home</Link>
      </div>
    </div>
  );
}

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="min-h-screen flex">
      <Sidebar type="admin" />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8 bg-gray-50 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function ParentLayout() {
  return (
    <div className="min-h-screen flex">
      <Sidebar type="parent" />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8 bg-gray-50 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function PlatformLayout() {
  return (
    <div className="min-h-screen flex">
      <Sidebar type="platform" />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8 bg-gray-50 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrgProvider>
          <Routes>
            {/* Public routes */}
            <Route element={<ErrorBoundary><PublicLayout /></ErrorBoundary>}>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/events/:orgId" element={<Events />} />
              <Route path="/event/:orgId/:eventId" element={<EventDetail />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
            </Route>

            {/* Setup routes */}
            <Route
              path="/setup/organization"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <CreateOrganization />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireOrg requireAdmin>
                  <ErrorBoundary><AdminLayout /></ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="events" element={<AdminEvents />} />
              <Route path="events/:eventId" element={<AdminEventDetail />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="templates" element={<AdminTemplates />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Admin check-in mode — no sidebar */}
            <Route
              path="/admin/events/:eventId/checkin"
              element={
                <ProtectedRoute requireOrg>
                  <ErrorBoundary>
                    <EventCheckIn />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Parent routes */}
            <Route
              path="/parent"
              element={
                <ProtectedRoute>
                  <ErrorBoundary><ParentLayout /></ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<ParentDashboard />} />
              <Route path="event/:eventId" element={<ParentEventSignup />} />
              <Route path="checkin" element={<ParentCheckIn />} />
            </Route>

            {/* Platform Admin routes */}
            <Route
              path="/platform"
              element={
                <SuperAdminRoute>
                  <ErrorBoundary><PlatformLayout /></ErrorBoundary>
                </SuperAdminRoute>
              }
            >
              <Route index element={<PlatformDashboard />} />
              <Route path="users" element={<PlatformUsers />} />
              <Route path="organizations" element={<PlatformOrganizations />} />
              <Route path="organizations/:orgId" element={<PlatformOrgDetail />} />
            </Route>
            {/* Top-level catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </OrgProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
