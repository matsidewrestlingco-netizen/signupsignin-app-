const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatEventDate(date: Date, includeYear = false): string {
  const day = DAY_NAMES[date.getDay()];
  const month = MONTH_NAMES[date.getMonth()];
  const dateNum = date.getDate();
  const year = date.getFullYear();
  const hours24 = date.getHours();
  const minutes = `:${String(date.getMinutes()).padStart(2, '0')}`;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const yearPart = includeYear ? `, ${year}` : '';
  return `${day}, ${month} ${dateNum}${yearPart} at ${hours12}${minutes} ${period}`;
}
