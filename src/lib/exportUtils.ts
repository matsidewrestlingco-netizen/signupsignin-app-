import { format } from 'date-fns';

export function downloadCSV(filename: string, rows: object[]) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = (row as Record<string, unknown>)[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatDate(date: Date | undefined): string {
  if (!date) return '';
  return format(date, 'MMM d, yyyy');
}

export function formatDateTime(date: Date | undefined): string {
  if (!date) return '';
  return format(date, 'MMM d, yyyy h:mm a');
}

export function formatTime(date: Date | undefined): string {
  if (!date) return '';
  return format(date, 'h:mm a');
}

export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function calculateFulfillmentPercentage(filled: number, total: number): number {
  if (total === 0) return 0;
  return filled / total;
}
