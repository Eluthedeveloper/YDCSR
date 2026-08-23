export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function parseDate(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  // Reject impossible dates like 2026-02-31, which JS silently rolls over.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatShort(iso: string): string {
  const d = parseDate(iso);
  if (!d) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function daysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toISO(d);
}

/** Standard heading for a date-range selection: "March – August 2026" */
export function formatMonthRange(startISO: string, endISO: string): string {
  const s = parseDate(startISO);
  const e = parseDate(endISO);
  if (!s || !e) return '';
  const startMonth = MONTHS[s.getMonth()];
  const endMonth = MONTHS[e.getMonth()];
  const startYear = s.getFullYear();
  const endYear = e.getFullYear();
  if (startYear === endYear && startMonth === endMonth) return `${startMonth} ${startYear}`;
  if (startYear === endYear) return `${startMonth} – ${endMonth} ${startYear}`;
  return `${startMonth} ${startYear} – ${endMonth} ${endYear}`;
}
