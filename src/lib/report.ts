import Papa from "papaparse";
import { matchesArchetype, resolveArchetype } from "./archetypes";
import type {
  Athlete,
  AthleteReport,
  AssessmentSession,
  ComparisonArchetype,
  Measurement,
  StandardsVersion,
} from "./types";
import { isMetricValueValid, scoreAssessment } from "./scoring";
import { resolveStandardsProfile } from "./standards";

export function cohortPercentile(
  value: number,
  peerValues: number[],
  direction: "higher" | "lower",
): number | null {
  const values = peerValues.filter(Number.isFinite);
  if (values.length < 2) return null;
  const favorable = values.filter((peer) =>
    direction === "higher" ? peer < value : peer > value,
  ).length;
  const tied = values.filter((peer) => peer === value).length;
  return Math.round(((favorable + tied * 0.5) / values.length) * 100);
}
const orderSessions = (a: AssessmentSession, b: AssessmentSession) =>
  b.date.localeCompare(a.date) ||
  (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt) ||
  a.id.localeCompare(b.id);

// Shared by roster/directory/dashboard. Index once, reuse peer cohorts and results
// rather than repeatedly filtering the complete measurement table per athlete.
export function createReportIndex(
  sessions: AssessmentSession[],
  measurements: Measurement[],
  versions: StandardsVersion[],
  athletes: Athlete[],
  archetypes: ComparisonArchetype[],
) {
  const published = sessions
    .filter((item) => item.status === "published")
    .sort(orderSessions);
  const sessionsByAthlete = new Map<string, AssessmentSession[]>();
  for (const session of published)
    for (const id of session.athleteIds) {
      const rows = sessionsByAthlete.get(id) ?? [];
      rows.push(session);
      sessionsByAthlete.set(id, rows);
    }
  const resultMap = new Map<string, Measurement[]>();
  const byCell = new Map<string, Measurement>();
  for (const measurement of measurements) {
    const key = JSON.stringify([measurement.sessionId, measurement.athleteId]);
    const rows = resultMap.get(key) ?? [];
    rows.push(measurement);
    resultMap.set(key, rows);
    const cell = JSON.stringify([
      measurement.sessionId,
      measurement.athleteId,
      measurement.metricId,
    ]);
    if (byCell.has(cell))
      throw new Error(
        "Duplicate assessment results need resolution. Export a backup before repairing duplicate mappings.",
      );
    byCell.set(cell, measurement);
  }
  const peerCache = new Map<string, number[]>();
  const reportCache = new Map<string, AthleteReport>();
  function reportFor(
    athlete: Athlete,
    sessionId?: string,
    fallback?: StandardsVersion,
  ): AthleteReport {
    const cacheKey = JSON.stringify([athlete.id, sessionId, fallback?.id]);
    const cached = reportCache.get(cacheKey);
    if (cached) return cached;
    const athleteSessions = sessionsByAthlete.get(athlete.id) ?? [];
    const latestSession = sessionId
      ? athleteSessions.find((item) => item.id === sessionId)
      : athleteSessions[0];
    if (sessionId && !latestSession)
      throw new Error(
        "The selected published assessment does not belong to this athlete.",
      );
    const version = latestSession
      ? versions.find((item) => item.id === latestSession.standardsVersionId)
      : (fallback ?? latestStandardsVersion(versions));
    if (!version)
      throw new Error("The assessment standards version is unavailable.");
    const date = latestSession?.date ?? new Date().toISOString().slice(0, 10);
    const pinnedProfileId = latestSession?.profileIdsByAthlete?.[athlete.id];
    const profile = pinnedProfileId
      ? version.profiles.find((item) => item.id === pinnedProfileId)
      : resolveStandardsProfile(version, athlete, date);
    if (!profile)
      throw new Error(
        `Pinned standards profile ${pinnedProfileId} is missing from version ${version.version}.`,
      );
    const archetype = resolveArchetype(archetypes, athlete, date);
    const result = scoreAssessment(
      version,
      latestSession
        ? (resultMap.get(JSON.stringify([latestSession.id, athlete.id])) ?? [])
        : [],
      athlete.id,
      athlete,
      date,
      profile,
    );
    const scores = result.scores.map((score) => {
      const key = JSON.stringify([
        archetype?.id,
        score.metric.id,
        version.id,
        date,
      ]);
      let peers = peerCache.get(key);
      if (!peers) {
        peers = !archetype
          ? []
          : athletes.flatMap((peer) => {
              const session = (sessionsByAthlete.get(peer.id) ?? []).find(
                (item) =>
                  item.date <= date &&
                  item.standardsVersionId === version.id &&
                  item.metricIds.includes(score.metric.id) &&
                  matchesArchetype(archetype, peer, item.date),
              );
              const value = session
                ? byCell.get(
                    JSON.stringify([session.id, peer.id, score.metric.id]),
                  )
                : undefined;
              return value?.status === "valid" &&
                isMetricValueValid(score.metric, value.selectedAttempt)
                ? [value.selectedAttempt!]
                : [];
            });
        peerCache.set(key, peers);
      }
      const percentile = cohortPercentile(
        score.value,
        peers,
        score.metric.direction,
      );
      return {
        ...score,
        percentile: percentile ?? undefined,
        cohortSize: peers.length,
      };
    });
    const highest = Math.max(...scores.map((score) => score.points));
    const lowest = Math.min(...scores.map((score) => score.points));
    const percentiles = scores.flatMap((score) =>
      score.percentile === undefined ? [] : [score.percentile],
    );
    const report: AthleteReport = {
      athlete,
      version,
      profile,
      archetype,
      sessions: athleteSessions,
      latestSession,
      scores,
      overall: result.overall,
      maxPoints: result.maxPoints,
      complete: result.complete,
      missing: result.missing,
      strengths:
        result.complete && highest > lowest
          ? scores.filter((score) => score.points === highest)
          : [],
      priorities:
        result.complete && highest > lowest
          ? scores.filter((score) => score.points === lowest)
          : [],
      percentileAverage: percentiles.length
        ? Math.round(
            percentiles.reduce((sum, value) => sum + value, 0) /
              percentiles.length,
          )
        : null,
    };
    reportCache.set(cacheKey, report);
    return report;
  }
  return { reportFor, sessionsByAthlete };
}
export function deriveAthleteReport(
  athlete: Athlete,
  sessions: AssessmentSession[],
  measurements: Measurement[],
  version: StandardsVersion,
  allAthletes: Athlete[] = [athlete],
  archetypes: ComparisonArchetype[] = [],
  sessionId?: string,
): AthleteReport {
  const selected = sessionId
    ? sessions.find((item) => item.id === sessionId)
    : sessions
        .filter(
          (item) =>
            item.status === "published" && item.athleteIds.includes(athlete.id),
        )
        .sort(orderSessions)[0];
  if (selected && selected.standardsVersionId !== version.id)
    throw new Error(
      "The selected assessment requires its original standards version.",
    );
  return createReportIndex(
    sessions,
    measurements,
    [version],
    allAthletes,
    archetypes,
  ).reportFor(athlete, sessionId, version);
}
export function reportToCsv(report: AthleteReport) {
  return Papa.unparse(
    report.scores.map((score) => ({
      athlete_id: report.athlete.id,
      athlete_name: `${report.athlete.firstName} ${report.athlete.lastName}`,
      assessment_date: report.latestSession?.date ?? "",
      metric: score.metric.name,
      value: score.value,
      unit: score.metric.unit,
      grade: score.points,
      band: score.band.label,
      point_total: report.overall ?? "",
      max_points: report.maxPoints,
      standards_version: report.version.version,
      standards_profile: report.profile.name,
      comparison_archetype: report.archetype?.name ?? "",
    })),
    { escapeFormulae: true },
  );
}
export function resolveReportVersion(
  athleteId: string,
  sessions: AssessmentSession[],
  versions: StandardsVersion[],
  sessionId?: string,
): StandardsVersion | undefined {
  const selected = sessions
    .filter(
      (session) =>
        session.status === "published" &&
        session.athleteIds.includes(athleteId) &&
        (!sessionId || session.id === sessionId),
    )
    .sort(orderSessions)[0];
  return versions.find(
    (version) => version.id === selected?.standardsVersionId,
  );
}
export function latestStandardsVersion(
  versions: StandardsVersion[],
): StandardsVersion | undefined {
  return [...versions].sort(
    (a, b) =>
      b.effectiveDate.localeCompare(a.effectiveDate) ||
      b.version.localeCompare(a.version, undefined, { numeric: true }),
  )[0];
}

export function comparisonRows(before: AthleteReport, after: AthleteReport) {
  return [
    ...after.version.metrics,
    ...before.version.metrics.filter(
      (metric) => !after.version.metrics.some((item) => item.id === metric.id),
    ),
  ].map((metric) => {
    const previousMetric = before.version.metrics.find(
      (item) => item.id === metric.id,
    );
    const a = before.scores.find((item) => item.metric.id === metric.id);
    const b = after.scores.find((item) => item.metric.id === metric.id);
    const compatible =
      before.version.id === after.version.id &&
      previousMetric?.unit === metric.unit &&
      previousMetric.direction === metric.direction;
    return {
      metric,
      before: a,
      after: b,
      delta:
        compatible && a && b
          ? Math.round((b.value - a.value) * 10000) / 10000
          : null,
      reason: !b
        ? "Not retested or no valid published result"
        : !a
          ? "No valid baseline result"
          : !compatible
            ? "Standards or collection definition changed"
            : "",
    };
  });
}
