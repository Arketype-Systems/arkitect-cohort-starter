import { SYNTHETIC_ARCHETYPES } from "./archetypes";
import Papa from "papaparse";
import { afterEach, describe, expect, it } from "vitest";
import {
  createBackup,
  ensureSeeded,
  FieldhouseDatabase,
  restoreBackup,
  startEmptyWorkspace,
  validateBackup,
} from "./db";
import {
  comparisonRows,
  createReportIndex,
  deriveAthleteReport,
  reportToCsv,
} from "./report";
import {
  SYNTHETIC_ATHLETES,
  SYNTHETIC_MEASUREMENTS,
  SYNTHETIC_SESSIONS,
} from "./seed";
import { STARTER_STANDARDS } from "./standards";
import { DEFAULT_BRAND } from "./branding";
import { normalizeView } from "./workspace-views";
import { parseAthleteCsv } from "./csv";
const payload = () => ({
  formatVersion: 3,
  athletes: structuredClone(SYNTHETIC_ATHLETES),
  sessions: structuredClone(SYNTHETIC_SESSIONS),
  measurements: structuredClone(SYNTHETIC_MEASUREMENTS),
  standards: [structuredClone(STARTER_STANDARDS)],
});
const databases: FieldhouseDatabase[] = [];
afterEach(async () => {
  for (const database of databases) await database.delete();
  databases.length = 0;
});
async function database() {
  const db = new FieldhouseDatabase(`quality-${crypto.randomUUID()}`);
  databases.push(db);
  await ensureSeeded(db);
  return db;
}

describe("backup and local workspace safety", () => {
  it.each([
    [
      "non-text name",
      (p: ReturnType<typeof payload>) => {
        p.athletes[0].firstName = {} as string;
      },
    ],
    [
      "calendar date",
      (p: ReturnType<typeof payload>) => {
        p.sessions[0].date = "2026-02-30";
      },
    ],
    [
      "empty published roster",
      (p: ReturnType<typeof payload>) => {
        p.sessions[0].athleteIds = [];
        p.measurements = p.measurements.filter(
          (item) => item.sessionId !== p.sessions[0].id,
        );
      },
    ],
    [
      "missing profile pin",
      (p: ReturnType<typeof payload>) => {
        p.sessions[0].profileIdsByAthlete = {};
      },
    ],
    [
      "forged selected attempt",
      (p: ReturnType<typeof payload>) => {
        p.measurements[0].selectedAttempt = 59.9;
      },
    ],
    [
      "non-finite attempt",
      (p: ReturnType<typeof payload>) => {
        p.measurements[0].attempts[0] = Infinity;
      },
    ],
    [
      "unsupported status",
      (p: ReturnType<typeof payload>) => {
        p.measurements[0].status = "unknown" as "valid";
      },
    ],
  ])("rejects %s before any database replacement", async (_, mutate) => {
    const db = await database();
    const backup = payload();
    mutate(backup);
    await expect(restoreBackup(backup, db)).rejects.toThrow();
    expect(await db.athletes.count()).toBe(6);
    expect(
      (await db.measurements.get(SYNTHETIC_MEASUREMENTS[0].id))
        ?.selectedAttempt,
    ).toBe(25.5);
  });
  it("round trips branding and preferences and retains two people with the same name", async () => {
    const db = await database();
    await db.settings.put({
      key: "brand",
      value: JSON.stringify({
        ...DEFAULT_BRAND,
        organizationName: "Synthetic Coaching Lab",
      }),
    });
    await db.settings.put({
      key: "roster-views",
      value: '[{"id":"v","name":"Varsity","params":"group=Varsity"}]',
    });
    await db.athletes.add({
      ...SYNTHETIC_ATHLETES[0],
      id: "same-name-other-person",
      dateOfBirth: "2010-04-09",
    });
    const backup = await createBackup(db);
    await startEmptyWorkspace(db);
    expect(await db.athletes.count()).toBe(0);
    await restoreBackup(backup, db);
    expect(await db.athletes.count()).toBe(7);
    expect((await db.settings.get("brand"))?.value).toContain(
      "Synthetic Coaching Lab",
    );
    expect(await db.settings.get("roster-views")).toBeDefined();
  });
  it("rejects remote image URLs embedded in backup branding", () => {
    const p = {
      ...payload(),
      formatVersion: 6,
      settings: [
        {
          key: "brand",
          value: JSON.stringify({
            ...DEFAULT_BRAND,
            logoDataUrl: "https://example.com/logo.png",
          }),
        },
      ],
    };
    expect(() => validateBackup(p)).toThrow(/branding/);
  });
});
describe("historical and comparison integrity", () => {
  it("selects a historical session without borrowing newer values or standards", () => {
    const athlete = SYNTHETIC_ATHLETES[0];
    const newer = {
      ...structuredClone(STARTER_STANDARDS),
      id: "v2",
      version: "2.0.0",
    };
    const session = {
      ...SYNTHETIC_SESSIONS[0],
      id: "later",
      date: "2026-09-01",
      standardsVersionId: newer.id,
    };
    const rows = SYNTHETIC_MEASUREMENTS.map((row) => ({
      ...row,
      id: `later-${row.id}`,
      sessionId: session.id,
      selectedAttempt: row.selectedAttempt! + 0.1,
    }));
    const index = createReportIndex(
      [...SYNTHETIC_SESSIONS, session],
      [...SYNTHETIC_MEASUREMENTS, ...rows],
      [STARTER_STANDARDS, newer],
      SYNTHETIC_ATHLETES,
      [],
    );
    const historic = index.reportFor(athlete, "session-complete");
    const latest = index.reportFor(athlete);
    expect(historic.version.id).toBe(STARTER_STANDARDS.id);
    expect(historic.scores[0].value).toBe(25.5);
    expect(latest.version.id).toBe(newer.id);
    expect(
      comparisonRows(historic, latest).every((row) => row.delta === null),
    ).toBe(true);
    expect(() =>
      index.reportFor(SYNTHETIC_ATHLETES[4], "session-complete"),
    ).toThrow(/belong/);
  });
  it("does not manufacture strengths or priorities from equal grades", () => {
    const report = deriveAthleteReport(
      SYNTHETIC_ATHLETES[0],
      SYNTHETIC_SESSIONS,
      SYNTHETIC_MEASUREMENTS,
      STARTER_STANDARDS,
    );
    expect(report.scores.every((score) => score.points === 2)).toBe(true);
    expect(report.strengths).toEqual([]);
    expect(report.priorities).toEqual([]);
    const missing = { ...report, scores: report.scores.slice(1) };
    const comparison = comparisonRows(report, missing);
    expect(comparison[0].delta).toBeNull();
    expect(comparison[0].reason).toContain("Not retested");
  });
  it("escapes embedded quotes and neutralizes spreadsheet formula names", () => {
    const athlete = {
      ...SYNTHETIC_ATHLETES[0],
      firstName: "=1+1",
      lastName: 'Example "Quoted"',
    };
    const report = deriveAthleteReport(
      athlete,
      SYNTHETIC_SESSIONS,
      SYNTHETIC_MEASUREMENTS,
      STARTER_STANDARDS,
    );
    const rows = Papa.parse<Record<string, string>>(reportToCsv(report), {
      header: true,
    }).data;
    expect(rows[0].athlete_name).toBe('\'=1+1 Example "Quoted"');
    expect(rows[0].metric).toBe(STARTER_STANDARDS.metrics[0].name);
  });
  it("never stores the free-text athlete query in a saved view", () =>
    expect(
      normalizeView(
        new URLSearchParams("q=Private+Name&sport=Soccer&sort=date"),
      ),
    ).toBe("sport=Soccer&sort=date"));
  it("validates CSV birth dates and sex and permits a same-name different-birthday athlete", () => {
    expect(
      parseAthleteCsv(
        "first_name,last_name,sport,group,date_of_birth,sex\nA,Example,Soccer,Varsity,2026-02-30,unknown",
      ).rows[0].errors,
    ).toHaveLength(2);
    expect(
      parseAthleteCsv(
        "first_name,last_name,sport,group,date_of_birth\nJordan,Ellis,Soccer,Varsity,2010-02-01",
        SYNTHETIC_ATHLETES,
      ).rows[0].athlete,
    ).toBeDefined();
  });
});

it("builds a shared report index for 500 synthetic athletes without cross-athlete values", () => {
  const athletes = Array.from({ length: 500 }, (_, index) => ({
    ...SYNTHETIC_ATHLETES[0],
    id: `synthetic-${index}`,
    firstName: `Example${index}`,
  }));
  const session = {
    ...SYNTHETIC_SESSIONS[0],
    athleteIds: athletes.map((athlete) => athlete.id),
  };
  const measurements = athletes.flatMap((athlete, index) =>
    SYNTHETIC_MEASUREMENTS.filter((row) => row.athleteId === "ath-a").map(
      (row) => ({
        ...row,
        id: `${athlete.id}-${row.metricId}`,
        athleteId: athlete.id,
        selectedAttempt: row.selectedAttempt! + index / 10000,
      }),
    ),
  );
  const started = performance.now();
  const index = createReportIndex(
    [session],
    measurements,
    [STARTER_STANDARDS],
    athletes,
    SYNTHETIC_ARCHETYPES,
  );
  const reports = athletes.map((athlete) => index.reportFor(athlete));
  console.info(
    `500-athlete synthetic report derivation: ${(performance.now() - started).toFixed(1)} ms; 2500 measurements; one Node test run, not browser latency.`,
  );
  expect(reports[0].scores[0].cohortSize).toBe(500);
  expect(reports).toHaveLength(500);
  expect(reports.every((report) => report.complete)).toBe(true);
  expect(reports[499].scores[0].value).toBe(25.5 + 499 / 10000);
});

it("serializes duplicate roster submissions without rejecting a different birthday", async () => {
  const { saveAthlete } = await import("./athlete-actions");
  const db = await database();
  const example = {
    ...SYNTHETIC_ATHLETES[0],
    id: "new-a",
    firstName: "Synthetic",
    lastName: "Double Submit",
  };
  const outcomes = await Promise.allSettled([
    saveAthlete(example, db),
    saveAthlete({ ...example, id: "new-b" }, db),
  ]);
  expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(
    1,
  );
  await expect(
    saveAthlete(
      { ...example, id: "different-person", dateOfBirth: "2010-07-11" },
      db,
    ),
  ).resolves.toBeUndefined();
});

it("replaces workspace generation on restore and refuses a stale publication approval", async () => {
  const { publishSession } = await import("./session-actions");
  const db = await database();
  const generation = (await db.settings.get("workspace-id"))!.value;
  await restoreBackup(await createBackup(db), db);
  expect((await db.settings.get("workspace-id"))!.value).not.toBe(generation);
  await expect(
    publishSession("session-complete", db, generation),
  ).rejects.toThrow(/workspace changed/);
});

it("upgrades an existing version-three database without losing records or branding", async () => {
  const { default: Dexie } = await import("dexie");
  const name = `upgrade-${crypto.randomUUID()}`;
  const old = new Dexie(name);
  old.version(3).stores({
    athletes: "id, lastName, sport, group, sex, grade, &[firstName+lastName]",
    sessions: "id, date, status, *athleteIds",
    measurements:
      "id, sessionId, athleteId, metricId, [sessionId+athleteId+metricId]",
    standards: "id, version",
    archetypes: "id, name, active, priority, *sexes, *sports",
    imports: "id, importedAt",
    settings: "key",
  });
  await old.table("athletes").bulkPut(structuredClone(SYNTHETIC_ATHLETES));
  await old.table("sessions").bulkPut(structuredClone(SYNTHETIC_SESSIONS));
  await old
    .table("measurements")
    .bulkPut(structuredClone(SYNTHETIC_MEASUREMENTS));
  await old.table("standards").put(structuredClone(STARTER_STANDARDS));
  await old.table("settings").bulkPut([
    { key: "initialized", value: "2026-07-01T00:00:00.000Z" },
    { key: "brand", value: JSON.stringify(DEFAULT_BRAND) },
  ]);
  old.close();
  const upgraded = new FieldhouseDatabase(name);
  databases.push(upgraded);
  await ensureSeeded(upgraded);
  expect(await upgraded.athletes.count()).toBe(6);
  expect(await upgraded.measurements.count()).toBe(20);
  expect((await upgraded.settings.get("brand"))?.value).toBe(
    JSON.stringify(DEFAULT_BRAND),
  );
  expect(await upgraded.settings.get("workspace-id")).toBeDefined();
  await upgraded.athletes.add({
    ...SYNTHETIC_ATHLETES[0],
    id: "different-person",
    dateOfBirth: "2010-01-02",
  });
  expect(await upgraded.athletes.count()).toBe(7);
});

it("summarizes standards revisions from the original version without mutating history", async () => {
  const { standardsChanges } = await import("./standards-diff");
  const before = structuredClone(STARTER_STANDARDS);
  const after = structuredClone(before);
  after.metrics[0].unit = "cm";
  after.profiles[0].bandsByMetric[after.metrics[0].id][2].meaning =
    "Synthetic revised interpretation";
  const rows = standardsChanges(before, after);
  expect(rows.some((row) => row.before === "in" && row.after === "cm")).toBe(
    true,
  );
  expect(
    rows.some((row) => row.after === "Synthetic revised interpretation"),
  ).toBe(true);
  expect(before).toEqual(STARTER_STANDARDS);
});
