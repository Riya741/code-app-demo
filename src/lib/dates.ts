/**
 * Date-only values (launch dates, event dates) are calendar days, not instants (DT-TIME-003; tasks UCP-T08, EVP-T07,
 * PERF-T03). `new Date("2026-11-11")` is UTC midnight, which shows as Nov 10 west of UTC, so the day is read from the
 * first 10 characters and built as a *local* date instead. Any time part (e.g. `T00:00:00.000Z`) is ignored.
 */

const DAY = /^(\d{4})-(\d{2})-(\d{2})/;

/** The stored calendar day as a local Date, or null when empty, not a real day, or before 2000 (placeholders such as 1900-01-01). */
export function parseDay(v?: string | null): Date | null {
  const m = DAY.exec(v?.trim() ?? "");
  if (!m) return null;
  const [y, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2000) return null;
  const d = new Date(y, month - 1, day);
  // Reject days that roll over, such as 2026-02-31.
  return d.getMonth() === month - 1 && d.getDate() === day ? d : null;
}

/** `YYYY-MM-DD` of a valid stored day (for sorting and filtering), or undefined. */
export function isoDay(v?: string | null): string | undefined {
  return parseDay(v) ? v!.trim().slice(0, 10) : undefined;
}

/** A short date in the user's locale ("Nov 11, 2026") on the stored calendar day, or "" for an empty or invalid value. */
export function formatDay(v?: string | null, locales: Intl.LocalesArgument = []): string {
  return parseDay(v)?.toLocaleDateString(locales, { year: "numeric", month: "short", day: "numeric" }) ?? "";
}
