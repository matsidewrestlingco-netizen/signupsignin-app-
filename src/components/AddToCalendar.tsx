import { useState, useRef, useEffect } from 'react';
import { downloadICS, generateGoogleCalendarUrl, generateOutlookUrl } from '../lib/calendar';

interface AddToCalendarProps {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime?: Date;
}

export function AddToCalendar({ title, description, location, startTime, endTime }: AddToCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const event = { title, description, location, startTime, endTime };

  const handleDownloadICS = () => {
    downloadICS(event, title);
    setIsOpen(false);
  };

  const handleGoogleCalendar = () => {
    window.open(generateGoogleCalendarUrl(event), '_blank');
    setIsOpen(false);
  };

  const handleOutlook = () => {
    window.open(generateOutlookUrl(event), '_blank');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary text-sm"
      >
        Add to Calendar
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            <button
              onClick={handleGoogleCalendar}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Google Calendar
            </button>
            <button
              onClick={handleOutlook}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Outlook
            </button>
            <button
              onClick={handleDownloadICS}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Download .ics file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
