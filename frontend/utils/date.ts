/**
 * Normalize a date string by replacing spaces with 'T' for ISO 8601 compatibility.
 * Handles both "2024-01-01 12:00:00" and "2024-01-01T12:00:00" formats.
 */
export function normalizeDate(value: string): string {
  if (value.includes('T')) return value;
  return value.replace(' ', 'T');
}
