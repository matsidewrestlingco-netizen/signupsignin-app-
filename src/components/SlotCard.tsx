import { format } from 'date-fns';
import type { Slot } from '../hooks/useSlots';

interface SlotCardProps {
  slot: Slot;
  onSignUp?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  isSignedUp?: boolean;
  showActions?: boolean;
  adminView?: boolean;
}

export function SlotCard({
  slot,
  onSignUp,
  onEdit,
  onDuplicate,
  onDelete,
  isSignedUp = false,
  showActions = true,
  adminView = false,
}: SlotCardProps) {
  const filledCount = Math.max(0, slot.quantityFilled);
  const isFull = filledCount >= slot.quantityTotal;
  const spotsLeft = slot.quantityTotal - filledCount;
  const fillPercentage = Math.min(
    (filledCount / slot.quantityTotal) * 100,
    100
  );

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                {slot.category}
              </span>
              <h4 className="font-medium text-gray-900">{slot.name}</h4>
            </div>

            {(slot.startTime || slot.endTime) && (
              <p className="text-sm text-gray-500 mt-1">
                {slot.startTime && format(slot.startTime, 'h:mm a')}
                {slot.startTime && slot.endTime && ' - '}
                {slot.endTime && format(slot.endTime, 'h:mm a')}
              </p>
            )}

            {slot.description && (
              <p className="text-sm text-gray-600 mt-2">{slot.description}</p>
            )}

            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">
                  {filledCount} / {slot.quantityTotal} filled
                </span>
                <span
                  className={`font-medium ${
                    isFull
                      ? 'text-red-600'
                      : spotsLeft <= 2
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}
                >
                  {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isFull
                      ? 'bg-red-500'
                      : fillPercentage >= 75
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {showActions && (
            <div className="ml-4 flex flex-col gap-2">
              {adminView ? (
                <>
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      className="btn-secondary text-xs px-2 py-1"
                    >
                      Edit
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={onDuplicate}
                      className="btn-secondary text-xs px-2 py-1"
                    >
                      Duplicate
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={onDelete}
                      className="btn-danger text-xs px-2 py-1"
                    >
                      Delete
                    </button>
                  )}
                </>
              ) : (
                <>
                  {isSignedUp ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-green-100 text-green-800">
                      Signed Up
                    </span>
                  ) : (
                    <button
                      onClick={onSignUp}
                      disabled={isFull}
                      className={`btn-primary text-sm ${
                        isFull ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      Sign Up
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
