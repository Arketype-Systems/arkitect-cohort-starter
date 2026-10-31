export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isText(value: unknown, required = false): value is string {
  return (
    typeof value === "string" &&
    value.length <= 100_000 &&
    (!required || value.trim().length > 0)
  );
}
export function isTextList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => isText(item, true)) &&
    new Set(value).size === value.length
  );
}
export function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    isCalendarDate(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value))
  );
}
