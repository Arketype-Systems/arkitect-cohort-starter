import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureSeeded, FieldhouseDatabase } from "./db";
import {
  deleteMeasurement,
  publishSession,
  reviewSession,
  saveMeasurement,
} from "./session-actions";
import { deriveAthleteReport } from "./report";
import { STARTER_STANDARDS } from "./standards";
import { SYNTHETIC_ATHLETES, SYNTHETIC_SESSIONS } from "./seed";

describe("publication boundary", () => {
  let database: FieldhouseDatabase;
  beforeEach(async () => {
    database = new FieldhouseDatabase(`publication-${crypto.randomUUID()}`);
    await ensureSeeded(database);
  });
  afterEach(async () => {
    await database.delete();
  });
  it("rejects publication when a new session has no captures of its own", async () => {
    await database.sessions.add({
      ...SYNTHETIC_SESSIONS[0],
      id: "empty",
      status: "review",
    });
    await expect(publishSession("empty", database)).rejects.toThrow(
      /required/i,
    );
    expect((await database.sessions.get("empty"))?.status).toBe("review");
  });
  it("rejects stale capture and deletion after publication", async () => {
    const original = (await database.measurements
      .where("sessionId")
      .equals("session-complete")
      .first())!;
    await expect(
      saveMeasurement({ ...original, selectedAttempt: 99 }, database),
    ).rejects.toThrow(/published/i);
    await expect(deleteMeasurement(original.id, database)).rejects.toThrow(
      /published/i,
    );
    expect(
      (await database.measurements.get(original.id))?.selectedAttempt,
    ).toBe(original.selectedAttempt);
  });
  it("cannot reopen publication through a stale review transition", async () => {
    await reviewSession("session-complete", database);
    expect((await database.sessions.get("session-complete"))?.status).toBe(
      "published",
    );
  });
  it("refuses an empty roster and duplicate measurement mappings", async () => {
    await database.sessions.add({
      ...SYNTHETIC_SESSIONS[0],
      id: "empty-roster",
      athleteIds: [],
      status: "review",
    });
    await expect(publishSession("empty-roster", database)).rejects.toThrow(
      /roster/i,
    );
    await database.sessions.add({
      ...SYNTHETIC_SESSIONS[0],
      id: "duplicate-session",
      status: "review",
    });
    const original = (await database.measurements
      .where("sessionId")
      .equals("session-complete")
      .first())!;
    const draft = {
      ...original,
      id: "first-result",
      sessionId: "duplicate-session",
    };
    await saveMeasurement(draft, database);
    await expect(
      saveMeasurement({ ...draft, id: "duplicate" }, database),
    ).rejects.toThrow(/already/i);
  });
  it("rechecks exclusions inside publication and preserves a later unpublished retest", async () => {
    const session = {
      ...SYNTHETIC_SESSIONS[0],
      id: "new",
      status: "review" as const,
      date: "2026-09-05",
    };
    await database.sessions.add(session);
    const records = (
      await database.measurements
        .where("sessionId")
        .equals("session-complete")
        .toArray()
    ).map((m) => ({ ...m, id: `new-${m.id}`, sessionId: "new" }));
    await database.measurements.bulkAdd(records);
    const flagged = records[0];
    await saveMeasurement({ ...flagged, status: "excluded" }, database);
    await expect(publishSession("new", database)).rejects.toThrow(
      /required|invalid|excluded/i,
    );
    const report = deriveAthleteReport(
      SYNTHETIC_ATHLETES[0],
      await database.sessions.toArray(),
      await database.measurements.toArray(),
      STARTER_STANDARDS,
    );
    expect(report.latestSession?.id).toBe("session-complete");
    await saveMeasurement(flagged, database);
    await publishSession("new", database);
    expect((await database.sessions.get("new"))?.status).toBe("published");
    await expect(
      saveMeasurement({ ...flagged, status: "excluded" }, database),
    ).rejects.toThrow(/published/i);
  });
});
