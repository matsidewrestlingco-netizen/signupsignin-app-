import { format } from 'date-fns';

interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime?: Date;
  url?: string;
}

function formatICSDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss");
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function generateICS(event: CalendarEvent): string {
  const endTime = event.endTime || new Date(event.startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SignupSignin//Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(event.startTime)}`,
    `DTEND:${formatICSDate(endTime)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  lines.push(`UID:${Date.now()}@signupsignin`);
  lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

export function downloadICS(event: CalendarEvent, filename: string): void {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename.replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const endTime = event.endTime || new Date(event.startTime.getTime() + 60 * 60 * 1000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${format(event.startTime, "yyyyMMdd'T'HHmmss")}/${format(endTime, "yyyyMMdd'T'HHmmss")}`,
  });

  if (event.description) {
    params.set('details', event.description);
  }

  if (event.location) {
    params.set('location', event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateOutlookUrl(event: CalendarEvent): string {
  const endTime = event.endTime || new Date(event.startTime.getTime() + 60 * 60 * 1000);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: event.startTime.toISOString(),
    enddt: endTime.toISOString(),
  });

  if (event.description) {
    params.set('body', event.description);
  }

  if (event.location) {
    params.set('location', event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
