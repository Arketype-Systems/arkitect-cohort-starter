import { isLocalImage } from "./images";
import { validBrand } from "./branding-validation";
import Dexie, { type EntityTable } from "dexie";
import { SYNTHETIC_ARCHETYPES } from "./archetypes";
import {
  resolveStandardsProfile,
  STARTER_STANDARDS,
  validateStandardsVersion,
} from "./standards";
import {
  SYNTHETIC_ATHLETES,
  SYNTHETIC_MEASUREMENTS,
  SYNTHETIC_SESSIONS,
} from "./seed";
import { bestAttempt, isMetricValueValid, scoreAssessment } from "./scoring";
import {
  isCalendarDate,
  isRecord,
  isText,
  isTextList,
  isTimestamp,
} from "./validation";
import type {
  AppSetting,
  Athlete,
  AssessmentSession,
  ComparisonArchetype,
  ImportRecord,
  Measurement,
  StandardsVersion,
} from "./types";

export class FieldhouseDatabase extends Dexie {
  athletes!: EntityTable<Athlete, "id">;
  sessions!: EntityTable<AssessmentSession, "id">;
  measurements!: EntityTable<Measurement, "id">;
  standards!: EntityTable<StandardsVersion, "id">;
  archetypes!: EntityTable<ComparisonArchetype, "id">;
  imports!: EntityTable<ImportRecord, "id">;
  settings!: EntityTable<AppSetting, "key">;
  constructor(name = "fieldhouse-assessment") {
    super(name);
    this.version(1).stores({
      athletes: "id, lastName, sport, group, &[firstName+lastName]",
      sessions: "id, date, status, *athleteIds",
      measurements:
        "id, sessionId, athleteId, metricId, [sessionId+athleteId+metricId]",
      standards: "id, version",
      imports: "id, importedAt",
      settings: "key",
    });
    this.version(2)
      .stores({
        athletes:
          "id, lastName, sport, group, sex, grade, &[firstName+lastName]",
        sessions: "id, date, status, *athleteIds",
        measurements:
          "id, sessionId, athleteId, metricId, [sessionId+athleteId+metricId]",
        standards: "id, version",
        imports: "id, importedAt",
        settings: "key",
      })
      .upgrade(async (transaction) => {
        await transaction
          .table("athletes")
          .toCollection()
          .modify((athlete: Partial<Athlete>) => {
            athlete.sex ??= "unspecified";
            athlete.dateOfBirth ??= "";
            athlete.grade ??= "";
            athlete.sports = athlete.sports?.length
              ? athlete.sports
              : athlete.sport
                ? [athlete.sport]
                : [];
            athlete.positions = athlete.positions?.length
              ? athlete.positions
              : athlete.position
                ? [athlete.position]
                : [];
          });
        await transaction
          .table("standards")
          .toCollection()
          .modify((version: Partial<StandardsVersion>) => {
            for (const metric of version.metrics ?? []) {
              const ordered = [...metric.bands].sort(
                (a, b) =>
                  (a.min ?? Number.NEGATIVE_INFINITY) -
                  (b.min ?? Number.NEGATIVE_INFINITY),
              );
              ordered.forEach((band, index) => {
                band.points = metric.direction === "higher" ? index : 4 - index;
              });
            }
            if (!version.profiles?.length && version.metrics?.length)
              version.profiles = [
                {
                  id: "profile-general",
                  name: "General migrated profile",
                  priority: 0,
                  audience: {
                    sexes: [],
                    grades: [],
                    sports: [],
                    positions: [],
                  },
                  bandsByMetric: Object.fromEntries(
                    version.metrics.map((metric) => [
                      metric.id,
                      structuredClone(metric.bands),
                    ]),
                  ),
                },
              ];
          });
        await transaction
          .table("standards")
          .put(structuredClone(STARTER_STANDARDS));
        const athletes = (await transaction
          .table("athletes")
          .toArray()) as Athlete[];
        const standards = (await transaction
          .table("standards")
          .toArray()) as StandardsVersion[];
        await transaction
          .table("sessions")
          .toCollection()
          .modify((session: AssessmentSession) => {
            if (session.profileIdsByAthlete) return;
            const version = standards.find(
              (item) => item.id === session.standardsVersionId,
            );
            if (!version) return;
            session.profileIdsByAthlete = Object.fromEntries(
              session.athleteIds.flatMap((id) => {
                const athlete = athletes.find((item) => item.id === id);
                return athlete
                  ? [
                      [
                        id,
                        resolveStandardsProfile(version, athlete, session.date)
                          .id,
                      ],
                    ]
                  : [];
              }),
            );
          });
      });
    this.version(3)
      .stores({
        athletes:
          "id, lastName, sport, group, sex, grade, &[firstName+lastName]",
        sessions: "id, date, status, *athleteIds",
        measurements:
          "id, sessionId, athleteId, metricId, [sessionId+athleteId+metricId]",
        standards: "id, version",
        archetypes: "id, name, active, priority, *sexes, *sports",
        imports: "id, importedAt",
        settings: "key",
      })
      .upgrade(async (transaction) => {
        await transaction
          .table("archetypes")
          .bulkPut(structuredClone(SYNTHETIC_ARCHETYPES));
      });
    // Names are not identities. Transactional commands guard result mappings.
    this.version(4).stores({
      athletes: "id, lastName, sport, group, sex, grade, [firstName+lastName]",
    });
  }
}

export const db = new FieldhouseDatabase();

const tables = (database: FieldhouseDatabase) => [
  database.athletes,
  database.sessions,
  database.measurements,
  database.standards,
  database.archetypes,
  database.imports,
  database.settings,
];
async function seed(database: FieldhouseDatabase) {
  await database.standards.put(structuredClone(STARTER_STANDARDS));
  await database.athletes.bulkPut(structuredClone(SYNTHETIC_ATHLETES));
  await database.sessions.bulkPut(structuredClone(SYNTHETIC_SESSIONS));
  await database.measurements.bulkPut(structuredClone(SYNTHETIC_MEASUREMENTS));
  await database.archetypes.bulkPut(structuredClone(SYNTHETIC_ARCHETYPES));
  await database.settings.put({
    key: "workspace-id",
    value: crypto.randomUUID(),
  });
  await database.settings.put({
    key: "initialized",
    value: new Date().toISOString(),
  });
}
export async function ensureSeeded(database = db) {
  await database.transaction("rw", tables(database), async () => {
    if (!(await database.settings.get("initialized"))) await seed(database);
    else if (!(await database.settings.get("workspace-id")))
      await database.settings.put({
        key: "workspace-id",
        value: crypto.randomUUID(),
      });
  });
}
export async function resetDemo(database = db) {
  await database.transaction("rw", tables(database), async () => {
    await Promise.all(tables(database).map((table) => table.clear()));
    await seed(database);
  });
}
export async function startEmptyWorkspace(database = db) {
  await database.transaction("rw", tables(database), async () => {
    await Promise.all([
      database.athletes.clear(),
      database.sessions.clear(),
      database.measurements.clear(),
      database.imports.clear(),
    ]);
    await database.settings.put({
      key: "workspace-id",
      value: crypto.randomUUID(),
    });
    await database.settings.put({
      key: "initialized",
      value: new Date().toISOString(),
    });
  });
}
// Formats 4 and 5 belonged to unpublished experiments; do not misread them.
export type BackupPayload = {
  formatVersion: 6;
  athletes: Athlete[];
  sessions: AssessmentSession[];
  measurements: Measurement[];
  standards: StandardsVersion[];
  archetypes: ComparisonArchetype[];
  imports: ImportRecord[];
  settings: AppSetting[];
};
export async function createBackup(
  database = db,
): Promise<BackupPayload & { exportedAt: string }> {
  return database.transaction("r", tables(database), async () => ({
    formatVersion: 6,
    exportedAt: new Date().toISOString(),
    athletes: await database.athletes.toArray(),
    sessions: await database.sessions.toArray(),
    measurements: await database.measurements.toArray(),
    standards: await database.standards.toArray(),
    archetypes: await database.archetypes.toArray(),
    imports: await database.imports.toArray(),
    settings: await database.settings.toArray(),
  }));
}

function normalizeAthlete(athlete: Athlete): Athlete {
  return {
    ...athlete,
    sex: athlete.sex ?? "unspecified",
    dateOfBirth: athlete.dateOfBirth ?? "",
    grade: athlete.grade ?? "",
    sports: athlete.sports?.length
      ? athlete.sports
      : athlete.sport
        ? [athlete.sport]
        : [],
    positions: athlete.positions?.length
      ? athlete.positions
      : athlete.position
        ? [athlete.position]
        : [],
  };
}

function normalizeStandard(version: StandardsVersion): StandardsVersion {
  const normalized = structuredClone(version);
  if (!normalized.profiles?.length) {
    for (const metric of normalized.metrics) {
      const ordered = [...metric.bands].sort(
        (a, b) =>
          (a.min ?? Number.NEGATIVE_INFINITY) -
          (b.min ?? Number.NEGATIVE_INFINITY),
      );
      ordered.forEach((band, index) => {
        band.points = metric.direction === "higher" ? index : 4 - index;
      });
    }
    normalized.profiles = [
      {
        id: "profile-general",
        name: "General migrated profile",
        priority: 0,
        audience: { sexes: [], grades: [], sports: [], positions: [] },
        bandsByMetric: Object.fromEntries(
          normalized.metrics.map((metric) => [
            metric.id,
            structuredClone(metric.bands),
          ]),
        ),
      },
    ];
  }
  return normalized;
}

function uniqueIds(records: Array<{ id: string }>, label: string) {
  const ids = records.map((record) => record.id);
  if (
    ids.some(
      (id) =>
        typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id),
    )
  )
    throw new Error(`Backup validation failed: every ${label} needs an ID.`);
  if (new Set(ids).size !== ids.length)
    throw new Error(`Backup validation failed: duplicate ${label} IDs.`);
  return new Set(ids);
}

function validateArchetype(value: unknown) {
  if (!value || typeof value !== "object") return true;
  const record = value as ComparisonArchetype;
  const arrays = [
    record.sexes,
    record.sports,
    record.positions,
    record.grades,
    record.levels,
  ];
  return (
    typeof record.name !== "string" ||
    !record.name.trim() ||
    typeof record.active !== "boolean" ||
    !Number.isFinite(record.priority) ||
    !arrays.every(Array.isArray) ||
    (Array.isArray(record.sexes) &&
      record.sexes.some(
        (sex) => !["female", "male", "unspecified"].includes(sex),
      )) ||
    (record.ageMin !== undefined &&
      (!Number.isFinite(record.ageMin) || record.ageMin < 0)) ||
    (record.ageMax !== undefined &&
      (!Number.isFinite(record.ageMax) || record.ageMax < 0)) ||
    (record.ageMin !== undefined &&
      record.ageMax !== undefined &&
      record.ageMin > record.ageMax)
  );
}

export function validateBackup(payload: unknown): BackupPayload {
  if (!payload || typeof payload !== "object")
    throw new Error("Backup validation failed: expected a JSON object.");
  const candidate = payload as Omit<Partial<BackupPayload>, "formatVersion"> & {
    formatVersion?: number;
  };
  if (
    candidate.formatVersion !== 1 &&
    candidate.formatVersion !== 2 &&
    candidate.formatVersion !== 3 &&
    candidate.formatVersion !== 6
  )
    throw new Error("Backup validation failed: unsupported format version.");
  if (
    ![
      candidate.athletes,
      candidate.sessions,
      candidate.measurements,
      candidate.standards,
    ].every(Array.isArray)
  )
    throw new Error(
      "Backup validation failed: required record arrays are missing.",
    );
  validateRecordShapes(candidate, candidate.formatVersion!);
  const athletes = candidate.athletes!.map(normalizeAthlete);
  const measurements = candidate.measurements!;
  const standards = candidate.standards!.map(normalizeStandard);
  const archetypes = Array.isArray(candidate.archetypes)
    ? candidate.archetypes
    : structuredClone(SYNTHETIC_ARCHETYPES);
  const imports = Array.isArray(candidate.imports) ? candidate.imports : [];
  const sessions = candidate.sessions!.map((session) => {
    if (session.profileIdsByAthlete || candidate.formatVersion !== 1)
      return session;
    const version = standards.find(
      (item) => item.id === session.standardsVersionId,
    );
    if (!version) return session;
    return {
      ...session,
      profileIdsByAthlete: Object.fromEntries(
        session.athleteIds.flatMap((id) => {
          const athlete = athletes.find((item) => item.id === id);
          return athlete
            ? [[id, resolveStandardsProfile(version, athlete, session.date).id]]
            : [];
        }),
      ),
    };
  });
  const athleteIds = uniqueIds(athletes, "athlete");
  const sessionIds = uniqueIds(sessions, "session");
  uniqueIds(measurements, "measurement");
  const standardIds = uniqueIds(standards, "standard");
  if (imports.length) uniqueIds(imports, "import record");
  if (
    sessions.some((session) => {
      const version = standards.find(
        (item) => item.id === session.standardsVersionId,
      );
      const versionMetricIds = new Set(
        version?.metrics.map((metric) => metric.id) ?? [],
      );
      const versionProfileIds = new Set(
        version?.profiles.map((profile) => profile.id) ?? [],
      );
      const pinned = Object.entries(session.profileIdsByAthlete ?? {});
      return (
        session.athleteIds.some(
          (id) =>
            !Object.hasOwn(session.profileIdsByAthlete ?? {}, id) ||
            !isText(session.profileIdsByAthlete?.[id], true),
        ) ||
        !standardIds.has(session.standardsVersionId) ||
        !Array.isArray(session.athleteIds) ||
        session.athleteIds.some((id) => !athleteIds.has(id)) ||
        !Array.isArray(session.metricIds) ||
        session.metricIds.some((id) => !versionMetricIds.has(id)) ||
        pinned.some(
          ([athleteId, profileId]) =>
            !session.athleteIds.includes(athleteId) ||
            !versionProfileIds.has(profileId),
        )
      );
    })
  )
    throw new Error(
      "Backup validation failed: a session references a missing athlete, metric, standards version, or pinned profile.",
    );
  const measurementKeys = measurements.map(
    (measurement) =>
      `${measurement.sessionId}::${measurement.athleteId}::${measurement.metricId}`,
  );
  if (new Set(measurementKeys).size !== measurementKeys.length)
    throw new Error(
      "Backup validation failed: duplicate session, athlete, and metric measurement mapping.",
    );
  if (
    measurements.some((measurement) => {
      const session = sessions.find(
        (item) => item.id === measurement.sessionId,
      );
      return (
        !sessionIds.has(measurement.sessionId) ||
        !athleteIds.has(measurement.athleteId) ||
        !Array.isArray(measurement.attempts) ||
        !session?.athleteIds.includes(measurement.athleteId) ||
        !session.metricIds.includes(measurement.metricId)
      );
    })
  )
    throw new Error(
      "Backup validation failed: a measurement references a missing or unrelated session, athlete, metric, or attempts list.",
    );
  for (const version of standards) {
    const errors = validateStandardsVersion(version);
    if (errors.length)
      throw new Error(`Backup validation failed: ${errors.join(" ")}`);
  }
  uniqueIds(archetypes, "archetype");
  if (archetypes.some(validateArchetype))
    throw new Error(
      "Backup validation failed: an archetype has invalid comparison rules.",
    );
  const settings = candidate.formatVersion === 6 ? candidate.settings! : [];
  validateMeasurements(sessions, measurements, standards, athletes);
  return {
    formatVersion: 6,
    athletes,
    sessions,
    measurements,
    standards,
    archetypes,
    imports,
    settings,
  };
}

export async function restoreBackup(payload: unknown, database = db) {
  const backup = validateBackup(payload);
  await database.transaction(
    "rw",
    [
      database.athletes,
      database.sessions,
      database.measurements,
      database.standards,
      database.archetypes,
      database.imports,
      database.settings,
    ],
    async () => {
      await Promise.all([
        database.athletes.clear(),
        database.sessions.clear(),
        database.measurements.clear(),
        database.standards.clear(),
        database.archetypes.clear(),
        database.imports.clear(),
        database.settings.clear(),
      ]);
      await database.settings.bulkPut(backup.settings);
      await database.settings.put({
        key: "workspace-id",
        value: crypto.randomUUID(),
      });
      await database.athletes.bulkPut(backup.athletes);
      await database.sessions.bulkPut(backup.sessions);
      await database.measurements.bulkPut(backup.measurements);
      await database.standards.bulkPut(backup.standards);
      await database.archetypes.bulkPut(backup.archetypes);
      await database.imports.bulkPut(backup.imports ?? []);
      await database.settings.put({
        key: "initialized",
        value: new Date().toISOString(),
      });
    },
  );
  return {
    athletes: backup.athletes.length,
    sessions: backup.sessions.length,
    measurements: backup.measurements.length,
    standards: backup.standards.length,
    archetypes: backup.archetypes.length,
  };
}

function invalid(detail: string): never {
  throw new Error(`Backup validation failed: ${detail}.`);
}
function validateRecordShapes(
  candidate: Record<string, unknown>,
  format: number,
) {
  for (const name of ["athletes", "sessions", "measurements", "standards"]) {
    if (
      !Array.isArray(candidate[name]) ||
      !(candidate[name] as unknown[]).every(isRecord)
    )
      invalid(`${name} must contain objects`);
  }
  for (const list of ["athletes", "sessions", "standards", "archetypes"])
    for (const item of (candidate[list] ?? []) as Record<string, unknown>[])
      if (item.synthetic !== undefined && typeof item.synthetic !== "boolean")
        invalid("invalid synthetic marker");
  for (const item of candidate.athletes as Record<string, unknown>[]) {
    if (
      !["id", "firstName", "lastName", "sport", "group"].every((key) =>
        isText(item[key], true),
      ) ||
      !isTimestamp(item.createdAt)
    )
      invalid("invalid athlete identity or creation date");
    for (const key of ["position", "grade"])
      if (item[key] !== undefined && !isText(item[key]))
        invalid(`invalid athlete ${key}`);
    if (
      item.dateOfBirth !== undefined &&
      item.dateOfBirth !== "" &&
      !isCalendarDate(item.dateOfBirth)
    )
      invalid("invalid athlete birth date");
    if (
      item.sex !== undefined &&
      !["male", "female", "unspecified"].includes(String(item.sex))
    )
      invalid("invalid athlete sex");
    for (const key of ["sports", "positions"])
      if (item[key] !== undefined && !isTextList(item[key]))
        invalid(`invalid athlete ${key}`);
    if (item.archivedAt !== undefined && !isTimestamp(item.archivedAt))
      invalid("invalid archive date");
    if (item.photoDataUrl !== undefined && !isLocalImage(item.photoDataUrl))
      invalid("invalid athlete photo");
  }
  for (const item of candidate.sessions as Record<string, unknown>[]) {
    if (
      !isText(item.id, true) ||
      !isText(item.name, true) ||
      !isCalendarDate(item.date) ||
      !isTimestamp(item.createdAt) ||
      !isTimestamp(item.updatedAt) ||
      !isTextList(item.athleteIds) ||
      !isTextList(item.metricIds) ||
      !["draft", "in_progress", "review", "published"].includes(
        String(item.status),
      )
    )
      invalid("invalid session fields");
    if (item.publishedAt !== undefined && !isTimestamp(item.publishedAt))
      invalid("invalid publication date");
    if (format !== 1 && !isRecord(item.profileIdsByAthlete))
      invalid("missing pinned profile");
  }
  for (const item of candidate.measurements as Record<string, unknown>[]) {
    if (
      !["id", "sessionId", "athleteId", "metricId"].every((key) =>
        isText(item[key], true),
      ) ||
      !Array.isArray(item.attempts) ||
      !item.attempts.every(
        (value) =>
          value === null ||
          (typeof value === "number" && Number.isFinite(value)),
      ) ||
      !(
        item.selectedAttempt === null ||
        (typeof item.selectedAttempt === "number" &&
          Number.isFinite(item.selectedAttempt))
      ) ||
      !["valid", "invalid", "excluded"].includes(String(item.status)) ||
      !isTimestamp(item.updatedAt) ||
      (item.note !== undefined && !isText(item.note))
    )
      invalid("invalid measurement fields");
  }
  for (const item of candidate.standards as Record<string, unknown>[]) {
    if (
      !isText(item.id, true) ||
      !isText(item.name, true) ||
      !isText(item.version, true) ||
      !isCalendarDate(item.effectiveDate) ||
      !Array.isArray(item.metrics) ||
      !item.metrics.every(
        (metric) =>
          isRecord(metric) &&
          Array.isArray(metric.bands) &&
          metric.bands.every(isRecord),
      ) ||
      (format !== 1 && !Array.isArray(item.profiles))
    )
      invalid("invalid standards fields");
  }
  for (const field of ["archetypes", "imports"])
    if (
      candidate[field] !== undefined &&
      (!Array.isArray(candidate[field]) ||
        !(candidate[field] as unknown[]).every(isRecord))
    )
      invalid(`invalid ${field}`);
  for (const item of (candidate.archetypes ?? []) as Record<
    string,
    unknown
  >[]) {
    if (
      !["sports", "sexes", "positions", "grades", "levels"].every((key) =>
        isTextList(item[key]),
      ) ||
      !isTimestamp(item.createdAt)
    )
      invalid("an archetype has invalid comparison rules");
  }
  for (const item of (candidate.imports ?? []) as Record<string, unknown>[]) {
    if (
      !isText(item.id, true) ||
      !isText(item.fileName, true) ||
      !isTimestamp(item.importedAt) ||
      !["totalRows", "added", "skipped", "errors"].every(
        (key) => Number.isInteger(item[key]) && Number(item[key]) >= 0,
      ) ||
      Number(item.added) + Number(item.skipped) !== item.totalRows ||
      Number(item.errors) > Number(item.totalRows)
    )
      invalid("invalid import history");
  }
  if (format === 6) {
    if (
      !Array.isArray(candidate.settings) ||
      !candidate.settings.every(
        (item) =>
          isRecord(item) && isText(item.key, true) && isText(item.value),
      ) ||
      new Set(candidate.settings.map((item) => item.key)).size !==
        candidate.settings.length
    )
      invalid("invalid settings");
    const brand = candidate.settings.find((item) => item.key === "brand");
    if (brand) {
      try {
        if (!validBrand(JSON.parse(brand.value)))
          invalid("invalid branding settings");
      } catch {
        invalid("invalid branding settings");
      }
    }
  }
}
function validateMeasurements(
  sessions: AssessmentSession[],
  measurements: Measurement[],
  standards: StandardsVersion[],
  athletes: Athlete[],
) {
  for (const measurement of measurements) {
    const session = sessions.find((item) => item.id === measurement.sessionId)!;
    const metric = standards
      .find((item) => item.id === session.standardsVersionId)
      ?.metrics.find((item) => item.id === measurement.metricId);
    if (
      !metric ||
      measurement.attempts.length !== metric.attempts ||
      bestAttempt(metric, measurement.attempts) !==
        measurement.selectedAttempt ||
      (measurement.status === "valid" &&
        measurement.selectedAttempt !== null &&
        !isMetricValueValid(metric, measurement.selectedAttempt))
    )
      invalid("measurement attempts and selected result disagree");
  }
  for (const session of sessions.filter(
    (item) => item.status === "published",
  )) {
    const version = standards.find(
      (item) => item.id === session.standardsVersionId,
    )!;
    for (const id of session.athleteIds) {
      const athlete = athletes.find((item) => item.id === id)!;
      const profile = version.profiles.find(
        (item) => item.id === session.profileIdsByAthlete?.[id],
      );
      if (
        !scoreAssessment(
          version,
          measurements.filter((item) => item.sessionId === session.id),
          id,
          athlete,
          session.date,
          profile,
        ).complete
      )
        invalid("published assessment is missing required results");
    }
  }
}
