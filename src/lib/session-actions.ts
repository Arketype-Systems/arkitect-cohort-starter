import { db } from "./db";
import { bestAttempt, isMetricValueValid, scoreAssessment } from "./scoring";
import type { Measurement } from "./types";

// Transactions serialize publication with queued writes from any app tab.
export async function publishSession(
  id: string,
  database = db,
  expectedWorkspaceId?: string,
) {
  await database.transaction(
    "rw",
    [
      database.sessions,
      database.measurements,
      database.standards,
      database.athletes,
      database.settings,
    ],
    async () => {
      if (
        expectedWorkspaceId &&
        (await database.settings.get("workspace-id"))?.value !==
          expectedWorkspaceId
      )
        throw new Error(
          "The workspace changed. Review the current records before publishing.",
        );
      const session = await database.sessions.get(id);
      if (!session) throw new Error("Session not found.");
      if (session.status === "published") return;
      const version = await database.standards.get(session.standardsVersionId);
      if (!version) throw new Error("The pinned standards version is missing.");
      const roster = await database.athletes.bulkGet(session.athleteIds);
      if (!roster.length || roster.some((athlete) => !athlete))
        throw new Error("A complete roster is required.");
      if (
        !session.metricIds.length ||
        session.metricIds.some(
          (id) => !version.metrics.some((metric) => metric.id === id),
        ) ||
        version.metrics.some(
          (metric) => metric.required && !session.metricIds.includes(metric.id),
        )
      )
        throw new Error("The required battery is missing.");
      const results = await database.measurements
        .where("sessionId")
        .equals(id)
        .toArray();
      const keys = new Set<string>();
      for (const result of results) {
        const key = JSON.stringify([result.athleteId, result.metricId]);
        const metric = version.metrics.find(
          (metric) => metric.id === result.metricId,
        );
        if (
          keys.has(key) ||
          !session.athleteIds.includes(result.athleteId) ||
          !session.metricIds.includes(result.metricId) ||
          !metric
        )
          throw new Error("Invalid measurement mapping.");
        keys.add(key);
        if (
          bestAttempt(metric, result.attempts) !== result.selectedAttempt ||
          result.attempts.length !== metric.attempts ||
          result.status !== "valid" ||
          !isMetricValueValid(metric, result.selectedAttempt)
        )
          throw new Error(
            "Resolve invalid or excluded results before publication.",
          );
      }
      for (const athlete of roster) {
        const profile = version.profiles.find(
          (profile) =>
            profile.id === session.profileIdsByAthlete?.[athlete!.id],
        );
        if (!profile)
          throw new Error("The pinned standards profile is missing.");
        if (
          !scoreAssessment(
            version,
            results,
            athlete!.id,
            athlete,
            session.date,
            profile,
          ).complete
        )
          throw new Error("Every athlete needs every required metric.");
      }
      const now = new Date().toISOString();
      await database.sessions.update(id, {
        status: "published",
        publishedAt: now,
        updatedAt: now,
      });
    },
  );
}

export async function saveMeasurement(result: Measurement, database = db) {
  await database.transaction(
    "rw",
    [database.sessions, database.measurements, database.standards],
    async () => {
      const session = await database.sessions.get(result.sessionId);
      if (!session) throw new Error("Session not found.");
      if (session.status === "published")
        throw new Error(
          "Published measurements are locked. Create a new assessment to retest.",
        );
      if (
        !session.athleteIds.includes(result.athleteId) ||
        !session.metricIds.includes(result.metricId)
      )
        throw new Error("The measurement does not belong to this session.");
      const version = await database.standards.get(session.standardsVersionId);
      const metric = version?.metrics.find(
        (item) => item.id === result.metricId,
      );
      if (
        !metric ||
        result.attempts.length !== metric.attempts ||
        result.attempts.some(
          (value) => value !== null && !Number.isFinite(value),
        ) ||
        bestAttempt(metric, result.attempts) !== result.selectedAttempt ||
        !["valid", "invalid", "excluded"].includes(result.status)
      )
        throw new Error("The attempt list or selected result is invalid.");
      const prior = await database.measurements.get(result.id);
      if (
        prior &&
        (prior.sessionId !== result.sessionId ||
          prior.athleteId !== result.athleteId ||
          prior.metricId !== result.metricId)
      )
        throw new Error("A measurement cannot move between assessments.");
      const existing = await database.measurements
        .where("[sessionId+athleteId+metricId]")
        .equals([result.sessionId, result.athleteId, result.metricId])
        .first();
      if (existing && existing.id !== result.id)
        throw new Error("A result already exists for this athlete and metric.");
      await database.measurements.put(result);
      await database.sessions.update(session.id, {
        updatedAt: new Date().toISOString(),
      });
    },
  );
}

export async function deleteMeasurement(id: string, database = db) {
  await database.transaction(
    "rw",
    [database.sessions, database.measurements],
    async () => {
      const result = await database.measurements.get(id);
      if (!result) return;
      const session = await database.sessions.get(result.sessionId);
      if (!session || session.status === "published")
        throw new Error("Published measurements are locked.");
      await database.measurements.delete(id);
    },
  );
}

export async function reviewSession(id: string, database = db) {
  await database.transaction("rw", database.sessions, async () => {
    const session = await database.sessions.get(id);
    if (session && session.status !== "published")
      await database.sessions.update(id, {
        status: "review",
        updatedAt: new Date().toISOString(),
      });
  });
}

export async function setMeasurementStatus(
  expected: Measurement,
  status: Measurement["status"],
  database = db,
) {
  await database.transaction(
    "rw",
    [database.sessions, database.measurements, database.standards],
    async () => {
      const current = await database.measurements.get(expected.id);
      if (
        !current ||
        current.updatedAt !== expected.updatedAt ||
        current.status !== expected.status ||
        current.selectedAttempt !== expected.selectedAttempt ||
        JSON.stringify(current.attempts) !== JSON.stringify(expected.attempts)
      )
        throw new Error(
          "This result changed in another tab. Review the current value before changing its status.",
        );
      await saveMeasurement(
        { ...current, status, updatedAt: new Date().toISOString() },
        database,
      );
    },
  );
}
