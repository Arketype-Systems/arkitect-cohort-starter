import type { StandardsVersion } from "./types";
export interface StandardsChange {
  field: string;
  before: string;
  after: string;
}
const display = (value: unknown) =>
  value === undefined
    ? "Not set"
    : typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : Array.isArray(value)
        ? value.join(", ") || "Any"
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
export function standardsChanges(
  before: StandardsVersion,
  after: StandardsVersion,
): StandardsChange[] {
  const changes: StandardsChange[] = [];
  const add = (field: string, a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b))
      changes.push({ field, before: display(a), after: display(b) });
  };
  for (const field of [
    "name",
    "version",
    "effectiveDate",
    "description",
  ] as const)
    add(`Battery ${field}`, before[field], after[field]);
  for (const metric of after.metrics) {
    const prior = before.metrics.find((item) => item.id === metric.id);
    if (!prior) {
      add("Test added", undefined, `${metric.name} (${metric.unit})`);
      continue;
    }
    for (const field of [
      "name",
      "shortName",
      "unit",
      "direction",
      "attempts",
      "required",
      "validMin",
      "validMax",
      "percentileContext",
    ] as const)
      add(`${prior.name}: ${field}`, prior[field], metric[field]);
  }
  for (const metric of before.metrics.filter(
    (item) => !after.metrics.some((next) => next.id === item.id),
  ))
    add("Test removed", metric.name, undefined);
  for (const profile of after.profiles) {
    const prior = before.profiles.find((item) => item.id === profile.id);
    if (!prior) {
      add(
        "Profile added",
        undefined,
        `${profile.name}: ${display(profile.audience)}`,
      );
      continue;
    }
    for (const field of ["name", "priority", "audience"] as const)
      add(`Profile ${prior.name}: ${field}`, prior[field], profile[field]);
    for (const metric of after.metrics) {
      const oldMetric = before.metrics.find((item) => item.id === metric.id);
      if (!oldMetric) continue;
      const oldBands = prior.bandsByMetric[metric.id] ?? oldMetric.bands;
      const bands = profile.bandsByMetric[metric.id] ?? metric.bands;
      for (const band of bands) {
        const old = oldBands.find((item) => item.points === band.points);
        for (const field of [
          "min",
          "max",
          "label",
          "meaning",
          "color",
        ] as const)
          add(
            `${profile.name} / ${metric.name} / ${band.points} points: ${field}`,
            old?.[field],
            band[field],
          );
      }
    }
  }
  for (const profile of before.profiles.filter(
    (item) => !after.profiles.some((next) => next.id === item.id),
  ))
    add("Profile removed", profile.name, undefined);
  return changes;
}
