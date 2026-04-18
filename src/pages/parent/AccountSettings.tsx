import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

export function ParentAccountSettings() {
  const { currentUser, userProfile, logOut } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDeleteAccount() {
    if (!currentUser) return;
    setDeleting(true);
    setError('');
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid));
      await deleteUser(currentUser);
      await logOut();
      navigate('/');
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/requires-recent-login') {
        setError('For security, please log out and log back in before deleting your account.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to delete account. Please try again.');
      }
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Account Settings</h1>
        <p className="page-subtitle">Manage your account</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium">Profile</h2>
          </div>
          <div className="card-body space-y-3">
            <div>
              <span className="label">Name</span>
              <p className="mt-1 text-gray-900">{userProfile?.name}</p>
            </div>
            <div>
              <span className="label">Email</span>
              <p className="mt-1 text-gray-900">{userProfile?.email}</p>
            </div>
          </div>
        </div>

        <div className="card border-red-200">
          <div className="card-header">
            <h2 className="text-lg font-medium text-red-700">Danger Zone</h2>
          </div>
          <div className="card-body">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete your account. This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="btn bg-red-600 text-white hover:bg-red-700"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 id="delete-dialog-title" className="text-lg font-semibold text-gray-900 mb-2">Delete Account</h3>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete your account?
            </p>
            <p className="text-gray-500 text-sm mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="btn bg-red-600 text-white hover:bg-red-700"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
