import { db } from "./db";

// Adapted from TF ac2f244 recent-reports and saved-view patterns. Keep IDs
// rather than copies of athlete names/photos, and include state in full backup.
export type SavedRosterView = { id: string; name: string; params: string };
const allowed = new Set([
  "sport",
  "group",
  "status",
  "sort",
  "layout",
  "archived",
  "size",
]);
export function normalizeView(params: URLSearchParams) {
  const clean = new URLSearchParams();
  for (const [key, value] of params)
    if (allowed.has(key) && value.length <= 200) clean.set(key, value);
  return clean.toString();
}
export function parseSavedViews(raw?: string): SavedRosterView[] {
  try {
    const value = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (item) =>
              typeof item?.id === "string" &&
              typeof item.name === "string" &&
              typeof item.params === "string",
          )
          .slice(0, 30)
      : [];
  } catch {
    return [];
  }
}
export async function rememberReport(athleteId: string) {
  await db.transaction("rw", db.settings, async () => {
    const row = await db.settings.get("recent-reports");
    let prior: string[] = [];
    try {
      const parsed = JSON.parse(row?.value ?? "[]");
      if (Array.isArray(parsed))
        prior = parsed.filter((item) => typeof item === "string");
    } catch {
      /* Ignore an obsolete preference. */
    }
    await db.settings.put({
      key: "recent-reports",
      value: JSON.stringify(
        [athleteId, ...prior.filter((id) => id !== athleteId)].slice(0, 6),
      ),
    });
  });
}
