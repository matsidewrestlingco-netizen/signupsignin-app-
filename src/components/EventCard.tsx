import { format } from 'date-fns';
import type { Event } from '../hooks/useEvents';

interface EventCardProps {
  event: Event;
  onClick?: () => void;
  showStatus?: boolean;
}

export function EventCard({ event, onClick, showStatus = true }: EventCardProps) {
  const isPast = event.startTime < new Date();

  return (
    <div
      onClick={onClick}
      className={`card cursor-pointer hover:shadow-md transition-shadow ${
        isPast ? 'opacity-75' : ''
      }`}
    >
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {format(event.startTime, 'EEEE, MMMM d, yyyy')}
              {event.endTime && ` - ${format(event.endTime, 'MMMM d, yyyy')}`}
            </p>
            {event.location && (
              <p className="text-sm text-gray-500 mt-1">{event.location}</p>
            )}
            {event.description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
          {showStatus && (
            <div className="ml-4 flex flex-col items-end gap-2">
              {event.isPublic ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Public
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Private
                </span>
              )}
              {isPast && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Past
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
