/** "Tuesday 10 November, 14:30 (GMT)" in the given IANA time zone; London if invalid. */
export function formatDue(date: Date, timeZone: string): string {
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: tz, timeZoneName: 'short',
    }).format(date);
  try {
    return fmt(timeZone);
  } catch {
    return fmt('Europe/London');
  }
}
