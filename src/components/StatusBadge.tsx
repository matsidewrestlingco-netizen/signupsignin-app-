import { format } from 'date-fns';

interface StatusBadgeProps {
  checkedIn: boolean;
  checkedInAt?: Date;
}

export function StatusBadge({ checkedIn, checkedInAt }: StatusBadgeProps) {
  if (checkedIn) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Checked In
        </span>
        {checkedInAt && (
          <span className="text-xs text-gray-500">
            {format(checkedInAt, 'h:mm a')}
          </span>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      Not Checked In
    </span>
  );
}
