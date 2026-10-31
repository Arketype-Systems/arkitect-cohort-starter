import { useEffect, useRef, useState } from "react";
import { db } from "./db";
import { bestAttempt, isMetricValueValid } from "./scoring";
import type { Measurement, MetricStandard } from "./types";

// Adapted from TripleFApp/triple-f-app ac2f244: IntakeField local text and
// per-cell save acknowledgment. Persistence here is local Dexie, not TF RPC.
export function useAttemptDrafts(
  sessionId: string,
  versionId: string,
  workspaceId: string,
) {
  const drafts = useRef(new Map<string, string[]>());
  const failures = useRef(new Map<string, string>());
  const pending = useRef(0);
  const revisions = useRef(0);
  const dirty = useRef(
    new Map<string, Map<number, { text: string; revision: number }>>(),
  );
  const acknowledged = useRef(new Map<string, string>());
  const tail = useRef(Promise.resolve());
  const [, render] = useState(0);
  const update = () => render((value) => value + 1);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (pending.current || failures.current.size) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const linkGuard = (event: MouseEvent) => {
      if (!pending.current && !failures.current.size) return;
      const anchor = (event.target as Element).closest("a[href]");
      if (!anchor) return;
      event.preventDefault();
      event.stopPropagation();
      if (failures.current.size)
        window.alert(
          "A result has not been saved. Correct it or retry before leaving this assessment.",
        );
      else
        void tail.current.then(() => {
          if (!failures.current.size)
            window.location.assign(anchor.getAttribute("href")!);
        });
    };
    window.addEventListener("beforeunload", guard);
    document.addEventListener("click", linkGuard, true);
    return () => {
      window.removeEventListener("beforeunload", guard);
      document.removeEventListener("click", linkGuard, true);
    };
  }, []);
  function keyFor(athleteId: string, metricId: string) {
    return JSON.stringify([athleteId, metricId]);
  }
  function values(
    athleteId: string,
    metric: MetricStandard,
    result?: Measurement,
  ) {
    return (
      drafts.current.get(keyFor(athleteId, metric.id)) ??
      Array.from(
        { length: metric.attempts },
        (_, index) => result?.attempts[index]?.toString() ?? "",
      )
    );
  }
  function save(
    athleteId: string,
    metric: MetricStandard,
    raw: string[],
    editedIndex?: number,
  ) {
    const key = keyFor(athleteId, metric.id);
    drafts.current.set(key, raw);
    const patches =
      dirty.current.get(key) ??
      new Map<number, { text: string; revision: number }>();
    raw.forEach((text, index) => {
      if (editedIndex === undefined || editedIndex === index)
        patches.set(index, { text, revision: ++revisions.current });
    });
    dirty.current.set(key, patches);
    const patch = new Map(patches);
    const parsed = raw.map((value) =>
      value.trim() === "" ? null : Number(value),
    );
    if (parsed.some((value) => value !== null && !Number.isFinite(value))) {
      failures.current.set(key, "Finish entering a number before reviewing.");
      update();
      return;
    }
    failures.current.delete(key);
    pending.current++;
    update();
    tail.current = tail.current
      .catch(() => undefined)
      .then(async () => {
        let stamp = "";
        await db.transaction(
          "rw",
          [db.sessions, db.measurements, db.settings],
          async () => {
            const generation = await db.settings.get("workspace-id");
            if (workspaceId && generation?.value !== workspaceId)
              throw new Error(
                "This workspace was replaced in another tab. Your draft was not applied. Export your draft values before reloading.",
              );
            const session = await db.sessions.get(sessionId);
            if (session && session.standardsVersionId !== versionId)
              throw new Error(
                "The assessment definition changed. Your draft was not applied.",
              );
            if (!session || session.status === "published")
              throw new Error(
                "This assessment is published and locked. Your draft was not applied.",
              );
            if (
              !session.athleteIds.includes(athleteId) ||
              !session.metricIds.includes(metric.id)
            )
              throw new Error(
                "This result is outside the assessment roster or battery.",
              );
            const rows = await db.measurements
              .where("[sessionId+athleteId+metricId]")
              .equals([sessionId, athleteId, metric.id])
              .toArray();
            if (rows.length > 1)
              throw new Error(
                "Duplicate results need resolution before this cell can be edited.",
              );
            const attempts = rows[0]?.attempts
              ? [...rows[0].attempts]
              : Array<number | null>(metric.attempts).fill(null);
            for (const [index, value] of patch)
              attempts[index] =
                value.text.trim() === "" ? null : Number(value.text);
            const selectedAttempt = bestAttempt(metric, attempts);
            stamp = new Date().toISOString();
            if (selectedAttempt === null) {
              if (rows[0]) await db.measurements.delete(rows[0].id);
              await db.sessions.update(sessionId, {
                updatedAt: new Date().toISOString(),
                synthetic: false,
              });
              return;
            }
            await db.measurements.put({
              ...rows[0],
              id: rows[0]?.id ?? crypto.randomUUID(),
              sessionId,
              athleteId,
              metricId: metric.id,
              attempts,
              selectedAttempt,
              status:
                rows[0]?.status === "excluded"
                  ? "excluded"
                  : selectedAttempt === null ||
                      isMetricValueValid(metric, selectedAttempt)
                    ? "valid"
                    : "invalid",
              updatedAt: stamp,
            });
            await db.sessions.update(sessionId, {
              updatedAt: new Date().toISOString(),
              synthetic: false,
            });
          },
        );
        for (const [index, value] of patch)
          if (dirty.current.get(key)?.get(index)?.revision === value.revision)
            dirty.current.get(key)?.delete(index);
        if (!dirty.current.get(key)?.size) {
          failures.current.delete(key);
          acknowledged.current.set(key, stamp);
        }
      })
      .catch((error) => {
        failures.current.set(
          key,
          error instanceof Error
            ? error.message
            : "The result could not be saved. Retry before leaving.",
        );
      })
      .finally(() => {
        pending.current--;
        update();
      });
  }
  function reconcile(results: Measurement[]) {
    if (pending.current) return;
    const focused = document.activeElement
      ?.closest("[data-cell]")
      ?.getAttribute("data-cell");
    let changed = false;
    for (const [key, stamp] of acknowledged.current) {
      if (
        key === focused ||
        failures.current.has(key) ||
        dirty.current.get(key)?.size
      )
        continue;
      const [athleteId, metricId] = JSON.parse(key) as [string, string];
      const row = results.find(
        (result) =>
          result.sessionId === sessionId &&
          result.athleteId === athleteId &&
          result.metricId === metricId,
      );
      const empty = drafts.current
        .get(key)
        ?.every((value) => value.trim() === "");
      if ((row && row.updatedAt >= stamp) || (!row && empty)) {
        drafts.current.delete(key);
        acknowledged.current.delete(key);
        changed = true;
      }
    }
    if (changed) update();
  }
  async function flush() {
    await tail.current;
    if (failures.current.size)
      throw new Error([...failures.current.values()][0]);
  }
  const failedKey = failures.current.keys().next().value;
  const failedCell = failedKey
    ? (JSON.parse(failedKey) as [string, string])
    : undefined;
  return {
    values,
    save,
    flush,
    reconcile,
    failedCell,
    pending: pending.current,
    error: [...failures.current.values()][0] ?? "",
    hasUnsaved: pending.current > 0 || failures.current.size > 0,
  };
}
