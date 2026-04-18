import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { logIn, signInWithGoogle, signInWithApple } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const rawFrom = (location.state as { from?: Location })?.from?.pathname;
  const from =
    rawFrom?.startsWith('/admin') || rawFrom?.startsWith('/platform') || rawFrom?.startsWith('/event')
      ? rawFrom
      : '/admin';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await logIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log in');
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
            Log in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/signup"
              state={{ from: (location.state as { from?: Location })?.from }}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setError('');
              setLoading(true);
              try {
                await signInWithGoogle();
                navigate(from, { replace: true });
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
              } finally {
                setLoading(false);
              }
            }}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setError('');
              setLoading(true);
              try {
                await signInWithApple();
                navigate(from, { replace: true });
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to sign in with Apple');
              } finally {
                setLoading(false);
              }
            }}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-black text-sm font-medium text-white hover:bg-gray-900 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.2-152.3-108.8C27.3 727.5 0 620.3 0 514.7c0-190.6 124.6-291.3 247.3-291.3 65.2 0 119.6 43.8 160.4 43.8 38.9 0 101-46.5 173.1-46.5zm-171.8-100.9C650 206.9 683.6 156 683.6 105.2c0-6.8-.6-14.3-1.2-21.2-59.3 2.3-127.3 42.1-168.3 88.9-36.2 41.9-71.6 101.8-71.6 164.7 0 7.4 1.2 14.8 1.8 17.1 3.5.6 9.3 1.2 15.1 1.2 54.7 0 117.5-36.8 148.9-95.9z"/>
            </svg>
            Sign in with Apple
          </button>
        </form>
      </div>
    </div>
  );
}
