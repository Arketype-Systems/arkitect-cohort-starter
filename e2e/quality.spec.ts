import { expect, test } from "@playwright/test";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";

test("fast and delayed writes retain every typed digit across context changes", async ({
  page,
}) => {
  await page.goto("/testing/session-draft/live");
  await expect(
    page.getByLabel("Countermovement Vertical Jump attempt 1"),
  ).toBeVisible();
  await page.evaluate(async () => {
    // Synthetic delayed-storage test only. Dexie.waitFor keeps its transaction alive.
    const module = await import("/src/lib/db.ts");
    const table = module.db.measurements;
    const original = table.put.bind(table);
    table.put = async function (...args: Parameters<typeof original>) {
      await module.FieldhouseDatabase.waitFor(
        new Promise((resolve) => setTimeout(resolve, 90)),
      );
      return original(...args);
    };
  });
  const input = page.getByLabel("Countermovement Vertical Jump attempt 1");
  await input.pressSequentially("24.5", { delay: 0 });
  await expect(input).toHaveValue("24.5");
  await page.getByRole("tab", { name: /Vertical jump/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Broad jump/ })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: /Vertical jump/ })).toBeFocused();
  await page.getByRole("button", { name: /Next athlete/ }).click();
  await page
    .getByLabel("Countermovement Vertical Jump attempt 1")
    .pressSequentially("27.2", { delay: 0 });
  await page.getByRole("button", { name: /Review session/ }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(
    page.getByText("24.5 in", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("27.2 in", { exact: false }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("24.5 in", { exact: false }).first(),
  ).toBeVisible();
});

test("saved views, selection, archive and reactivation preserve history", async ({
  page,
}) => {
  await page.goto("/athletes");
  await page.getByLabel("Search athletes").fill("Jordan");
  await page.getByRole("link", { name: /Jordan Ellis/ }).click();
  await page.locator(".back-link").filter({ hasText: "Athletes" }).click();
  await expect(page.getByLabel("Search athletes")).toHaveValue("Jordan");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByText("Saved roster views", { exact: true }).click();
  await page.getByLabel("View name").fill("Varsity review");
  await page.getByRole("button", { name: "Save current view" }).click();
  await page
    .getByRole("checkbox", { name: "Select Jordan Ellis", exact: true })
    .check();
  await page
    .getByRole("link", { name: "Start assessment", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Jordan Ellis/ })).toHaveClass(
    /selected/,
  );
  await page.goto("/athletes/ath-a");
  await page
    .getByRole("button", { name: "Archive athlete", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reactivate athlete" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /View report/ }).click();
  await expect(
    page.getByRole("heading", { name: "Jordan Ellis", level: 1 }),
  ).toBeVisible();
  await page.goto("/athletes/ath-a");
  await page.getByRole("button", { name: "Reactivate athlete" }).click();
  await expect(
    page.getByRole("button", { name: "Archive athlete" }),
  ).toBeVisible();
});

test("tag typing and dialog focus keep edits intact", async ({ page }) => {
  await page.goto("/comparisons");
  await page.getByRole("button", { name: /New archetype/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Archetype name")).toBeFocused();
  await dialog.getByLabel("Archetype name").fill("Synthetic two-sport group");
  await dialog
    .getByLabel("Archetype sports")
    .pressSequentially("Soccer, Track", { delay: 15 });
  await expect(dialog.getByLabel("Archetype sports")).toHaveValue(
    "Soccer, Track",
  );
  await dialog.getByRole("button", { name: "Save archetype" }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.getByText(/Soccer.*Track/).first()).toBeVisible();
  await page.goto("/athletes");
  await page.getByRole("button", { name: "Add athlete", exact: true }).click();
  const add = page.getByRole("dialog");
  await expect(add.getByLabel("First name")).toBeFocused();
  await add.getByRole("button", { name: "Add athlete", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    add.getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(add).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Add athlete", exact: true }),
  ).toBeFocused();
});

test("historical selection, before-after comparison and all PDF downloads work", async ({
  page,
}, testInfo) => {
  await page.goto("/reporting/ath-a");
  await expect(
    page.getByRole("heading", { name: "Jordan Ellis", level: 1 }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const { db } = await import("/src/lib/db.ts");
    const source = await db.sessions.get("session-complete");
    const later = {
      ...source,
      id: "quality-retest",
      name: "Synthetic follow-up",
      date: "2026-10-20",
    };
    await db.transaction("rw", db.sessions, db.measurements, async () => {
      await db.sessions.put(later);
      const records = await db.measurements
        .where("sessionId")
        .equals("session-complete")
        .toArray();
      await db.measurements.bulkPut(
        records.map(
          (row: {
            id: string;
            metricId: string;
            athleteId: string;
            attempts: Array<number | null>;
            selectedAttempt: number | null;
          }) => ({
            ...row,
            id: `retest-${row.id}`,
            sessionId: later.id,
            attempts:
              row.athleteId === "ath-a" && row.metricId === "vertical-jump"
                ? [28, null, null]
                : row.attempts,
            selectedAttempt:
              row.athleteId === "ath-a" && row.metricId === "vertical-jump"
                ? 28
                : row.selectedAttempt,
          }),
        ),
      );
    });
  });
  await page
    .getByLabel("Assessment", { exact: true })
    .selectOption("session-complete");
  await expect(page.locator(".report-detail-row").first()).toContainText(
    "25.5 in",
  );
  const individual = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const pdf = await individual;
  await pdf.saveAs(testInfo.outputPath("individual.pdf"));
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  await page.goto("/reports/compare?athlete=ath-a");
  await expect(page.getByText("+2.5 in", { exact: true })).toBeVisible();
  const comparison = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  await (await comparison).saveAs(testInfo.outputPath("before-after.pdf"));
  await page.goto("/reports/roster");
  const roster = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  await (await roster).saveAs(testInfo.outputPath("roster.pdf"));
});

test("private context files are denied, including raw and absolute-file URLs", async ({
  request,
}, testInfo) => {
  const directory = resolve(".arkitect");
  const filename = `quality-canary-${testInfo.project.name}.txt`;
  const full = resolve(directory, filename);
  await mkdir(directory, { recursive: true });
  await writeFile(full, "SYNTHETIC_PRIVATE_BOUNDARY_CANARY");
  try {
    for (const path of [
      `/.arkitect/${filename}`,
      `/.arkitect/${filename}?raw`,
      `/@fs${full}`,
      `/@fs${full}?import&raw`,
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(403);
      expect(await response.text()).not.toContain(
        "SYNTHETIC_PRIVATE_BOUNDARY_CANARY",
      );
    }
  } finally {
    await unlink(full);
  }
});

test("browser back waits for saves and does not discard an invalid draft", async ({
  page,
}) => {
  await page.goto("/testing");
  await page
    .locator("article")
    .filter({ hasText: "Synthetic Return Testing" })
    .getByRole("link", { name: /Continue live/ })
    .click();
  const input = page.getByLabel("Countermovement Vertical Jump attempt 1");
  await input.fill("-");
  await page.goBack();
  await expect(page).toHaveURL(/\/live$/);
  await expect(input).toHaveValue("-");
  await expect(
    page.getByText(/Finish entering a number/).first(),
  ).toBeVisible();
  await input.fill("24.5");
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  await page.goBack();
  await expect(page).toHaveURL(/\/testing$/);
});

test("long reports retain Unicode text and paginate without losing the last metric", async ({
  page,
}, testInfo) => {
  await page.goto("/reporting/ath-a");
  await expect(
    page.getByRole("heading", { name: "Jordan Ellis", level: 1 }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const { db } = await import("/src/lib/db.ts");
    const original = await db.standards.toCollection().first();
    const version = structuredClone(original);
    version.id = "quality-long-version";
    version.version = "9.0.0";
    const names: string[] = [];
    for (let index = 0; index < 10; index++) {
      const metric = {
        ...structuredClone(version.metrics[0]),
        id: `synthetic-extension-${index}`,
        name: `Synthetic extended metric ${index + 1}`,
        shortName: `Example ${index + 1}`,
        required: false,
      };
      const meaning =
        "Synthetic interpretation text used solely to verify that long report content remains readable and complete. ".repeat(
          9,
        ) + (index === 9 ? "END_OF_SYNTHETIC_REPORT" : "");
      metric.bands = metric.bands.map((band: { meaning: string }) => ({
        ...band,
        meaning,
      }));
      version.metrics.push(metric);
      names.push(metric.id);
      for (const profile of version.profiles)
        profile.bandsByMetric[metric.id] = structuredClone(metric.bands);
    }
    const athlete = {
      ...(await db.athletes.get("ath-a")),
      id: "quality-unicode",
      firstName: "Zoë",
      lastName: "Łukasz",
    };
    const session = {
      ...(await db.sessions.get("session-complete")),
      id: "quality-long-session",
      name: "Synthetic pagination test",
      athleteIds: [athlete.id],
      metricIds: version.metrics.map((metric: { id: string }) => metric.id),
      standardsVersionId: version.id,
      profileIdsByAthlete: { [athlete.id]: "profile-male" },
    };
    const source = await db.measurements
      .where({ sessionId: "session-complete", athleteId: "ath-a" })
      .toArray();
    await db.transaction(
      "rw",
      db.standards,
      db.athletes,
      db.sessions,
      db.measurements,
      async () => {
        await db.standards.put(version);
        await db.athletes.put(athlete);
        await db.sessions.put(session);
        await db.measurements.bulkPut([
          ...source.map((row: { id: string }) => ({
            ...row,
            id: `unicode-${row.id}`,
            sessionId: session.id,
            athleteId: athlete.id,
          })),
          ...names.map((metricId) => ({
            ...source[0],
            id: `unicode-${metricId}`,
            sessionId: session.id,
            athleteId: athlete.id,
            metricId,
          })),
        ]);
      },
    );
  });
  await page.goto("/reporting/quality-unicode?session=quality-long-session");
  await expect(
    page.getByRole("heading", { name: "Zoë Łukasz", level: 1 }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  await (await download).saveAs(testInfo.outputPath("long-unicode.pdf"));
  if (testInfo.project.name === "desktop-1440") {
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: testInfo.outputPath("browser-print-long.pdf"),
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
    });
  }
});

test("two tabs editing different attempts preserve both values", async ({
  page,
}) => {
  await page.goto("/testing/session-draft/live");
  await expect(
    page.getByLabel("Countermovement Vertical Jump attempt 1"),
  ).toBeVisible();
  const second = await page.context().newPage();
  await second.goto("/testing/session-draft/live");
  await expect(
    second.getByLabel("Countermovement Vertical Jump attempt 2"),
  ).toBeVisible();
  await page.evaluate(async () => {
    const { db, FieldhouseDatabase } = await import("/src/lib/db.ts");
    const original = db.measurements.put.bind(db.measurements);
    db.measurements.put = async function (
      ...args: Parameters<typeof original>
    ) {
      await FieldhouseDatabase.waitFor(
        new Promise((resolve) => setTimeout(resolve, 250)),
      );
      return original(...args);
    };
  });
  await page.getByLabel("Countermovement Vertical Jump attempt 1").fill("24.5");
  await second.getByLabel("Countermovement Vertical Jump attempt 2").fill("27");
  await expect(second.getByRole("status")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await expect(
    page.getByLabel("Countermovement Vertical Jump attempt 1"),
  ).toHaveValue("24.5");
  await expect(
    page.getByLabel("Countermovement Vertical Jump attempt 2"),
  ).toHaveValue("27");
  await second.close();
});

test("a queued write cannot enter a workspace restored in another tab", async ({
  page,
}) => {
  await page.goto("/testing/session-draft/live");
  await expect(
    page.getByLabel("Countermovement Vertical Jump attempt 1"),
  ).toBeVisible();
  const backup = await page.evaluate(async () => {
    const { createBackup } = await import("/src/lib/db.ts");
    return createBackup();
  });
  const second = await page.context().newPage();
  await second.goto("/database");
  await expect(
    second.getByRole("heading", { name: "Data and backup" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const { db } = await import("/src/lib/db.ts");
    const original = db.transaction.bind(db);
    db.transaction = function (mode: string, ...args: unknown[]) {
      if (mode === "rw" && Array.isArray(args[0]) && args[0].length === 3)
        return new Promise((resolve) => setTimeout(resolve, 350)).then(() =>
          original(mode, ...args),
        );
      return original(mode, ...args);
    };
  });
  await page.getByLabel("Countermovement Vertical Jump attempt 1").fill("24.5");
  await second.evaluate(async (value) => {
    const { restoreBackup } = await import("/src/lib/db.ts");
    await restoreBackup(value);
  }, backup);
  await expect(page.getByRole("status")).toContainText("Save failed");
  await expect(
    page.getByText(/workspace was replaced in another tab/).first(),
  ).toBeVisible();
  await expect(
    page.getByLabel("Countermovement Vertical Jump attempt 1"),
  ).toHaveValue("24.5");
  const rows = await second.evaluate(async () => {
    const { db } = await import("/src/lib/db.ts");
    return db.measurements.where("sessionId").equals("session-draft").count();
  });
  expect(rows).toBe(0);
  await second.close();
});
