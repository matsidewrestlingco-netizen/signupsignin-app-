import { format } from 'date-fns';
import type { Signup } from '../hooks/useSignups';
import { StatusBadge } from './StatusBadge';

interface SignupListProps {
  signups: Signup[];
  onCheckIn?: (signupId: string) => void;
  onUndoCheckIn?: (signupId: string) => void;
  onCancel?: (signupId: string) => void;
  showSlotInfo?: boolean;
  adminView?: boolean;
}

export function SignupList({
  signups,
  onCheckIn,
  onUndoCheckIn,
  onCancel,
  showSlotInfo = false,
  adminView = false,
}: SignupListProps) {
  if (signups.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No signups yet
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            {showSlotInfo && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Slot
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Signed Up
            </th>
            {(onCheckIn || onCancel) && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {signups.map((signup) => (
            <tr key={signup.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {signup.userName}
                </div>
                {signup.note && (
                  <div className="text-sm text-gray-500">{signup.note}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {signup.userEmail}
              </td>
              {showSlotInfo && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {signup.slotId}
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge
                  checkedIn={signup.checkedIn}
                  checkedInAt={signup.checkedInAt}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {format(signup.createdAt, 'MMM d, yyyy h:mm a')}
              </td>
              {(onCheckIn || onCancel) && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    {adminView && onCheckIn && !signup.checkedIn && (
                      <button
                        onClick={() => onCheckIn(signup.id)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Check In
                      </button>
                    )}
                    {adminView && onUndoCheckIn && signup.checkedIn && (
                      <button
                        onClick={() => onUndoCheckIn(signup.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Undo
                      </button>
                    )}
                    {onCancel && (
                      <button
                        onClick={() => onCancel(signup.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
