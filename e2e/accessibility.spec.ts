import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("core screens have no WCAG A or AA automated violations", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const routes = [
    "/",
    "/athletes",
    "/athletes/ath-a",
    "/testing",
    "/testing/new",
    "/testing/session-draft/live",
    "/testing/session-complete/review",
    "/database",
    "/comparisons",
    "/standards",
    "/reporting",
    "/reporting/ath-a",
    "/reports/compare",
    "/reports/roster",
    "/rankings",
    "/settings",
  ];
  const findings: Array<{ route: string; id: string; nodes: string[] }> = [];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByText("Loading your saved records…")).toHaveCount(0);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    findings.push(
      ...result.violations.map((violation) => ({
        route,
        id: violation.id,
        nodes: violation.nodes.map(
          (node) => `${node.target}: ${node.failureSummary}`,
        ),
      })),
    );
  }
  await page.goto("/testing/session-draft/live");
  await page.getByLabel("Countermovement Vertical Jump attempt 1").fill("24.5");
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  const captured = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  findings.push(
    ...captured.violations.map((violation) => ({
      route: "live-with-result",
      id: violation.id,
      nodes: violation.nodes.map((node) => String(node.target)),
    })),
  );
  expect(findings).toEqual([]);
});
