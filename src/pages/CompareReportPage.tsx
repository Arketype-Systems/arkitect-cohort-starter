import { Link, useSearchParams } from "react-router-dom";
import { AssessmentDateControl } from "../components/AssessmentDateControl";
import { ReportFrame } from "../components/ReportFrame";
import { EmptyState, Notice, PageHeader } from "../components/ui";
import { useBrandSettings } from "../lib/branding";
import { comparisonRows } from "../lib/report";
import { useData } from "../lib/useData";
import { useReports } from "../lib/useReports";
import { displayDate } from "../lib/utils";

export default function CompareReportPage() {
  const data = useData();
  const index = useReports(data);
  const brand = useBrandSettings();
  const [params, setParams] = useSearchParams();
  const athletes = data.athletes.filter(
    (athlete) => (index.sessionsByAthlete.get(athlete.id)?.length ?? 0) >= 2,
  );
  const athlete = params.has("athlete")
    ? data.athletes.find((item) => item.id === params.get("athlete"))
    : athletes[0];
  const sessions = index.sessionsByAthlete.get(athlete?.id ?? "") ?? [];
  const afterId = params.get("after") || sessions[0]?.id;
  const beforeId = params.get("before") || sessions[1]?.id;
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    if (key === "athlete") {
      next.delete("before");
      next.delete("after");
    }
    setParams(next);
  }
  const valid =
    sessions.some((session) => session.id === beforeId) &&
    sessions.some((session) => session.id === afterId) &&
    sessions.findIndex((session) => session.id === beforeId) >
      sessions.findIndex((session) => session.id === afterId);
  const before =
    athlete && valid ? index.reportFor(athlete, beforeId) : undefined;
  const after =
    athlete && valid ? index.reportFor(athlete, afterId) : undefined;
  const rows = before && after ? comparisonRows(before, after) : [];
  async function pdf() {
    if (!before || !after) return;
    const { beforeAfterPdf } = await import("../lib/report-pdf");
    (await beforeAfterPdf(before, after, brand)).save("before-and-after.pdf");
  }
  return (
    <div className="page report-page">
      <Link className="back-link" to="/reporting">
        Reporting
      </Link>
      <PageHeader
        eyebrow="Published history"
        title="Before and after"
        description="Compare two observations. Historical grades retain their original standards and profile."
      />
      {!athlete || sessions.length < 2 ? (
        <EmptyState
          title="Two published assessments are needed"
          action={
            athlete && (
              <Link to={`/athletes/${athlete.id}`}>Open athlete history</Link>
            )
          }
        >
          Publish a follow-up assessment before comparing dates. Draft results
          are not used.
        </EmptyState>
      ) : (
        <>
          <div className="report-controls">
            <label>
              Athlete
              <select
                aria-label="Compare athlete"
                value={athlete.id}
                onChange={(event) => change("athlete", event.target.value)}
              >
                {athletes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.firstName} {item.lastName}
                  </option>
                ))}
              </select>
            </label>
            <AssessmentDateControl
              includeLatest={false}
              label="Before assessment"
              sessions={sessions}
              value={beforeId ?? ""}
              onChange={(value) => change("before", value)}
            />
            <AssessmentDateControl
              includeLatest={false}
              label="After assessment"
              sessions={sessions}
              value={afterId ?? ""}
              onChange={(value) => change("after", value)}
            />
          </div>
          {!valid ? (
            <Notice tone="warning">
              Choose two different published assessments, with the baseline
              before the follow-up.
            </Notice>
          ) : (
            before &&
            after && (
              <ReportFrame title="Before and after" onPdf={pdf}>
                <section className="report-sheet">
                  <header className="report-header">
                    <div>
                      <p className="eyebrow">{brand.organizationName}</p>
                      <h1>
                        {athlete.firstName} {athlete.lastName}
                      </h1>
                      <p>
                        {displayDate(before.latestSession?.date)} to{" "}
                        {displayDate(after.latestSession?.date)}
                      </p>
                    </div>
                  </header>
                  <div className="comparison-totals">
                    <div>
                      <span>Before · v{before.version.version}</span>
                      <strong>
                        {before.overall === null
                          ? "Incomplete"
                          : `${before.overall}/${before.maxPoints}`}
                      </strong>
                      <small>{before.profile.name}</small>
                    </div>
                    <div>
                      <span>After · v{after.version.version}</span>
                      <strong>
                        {after.overall === null
                          ? "Incomplete"
                          : `${after.overall}/${after.maxPoints}`}
                      </strong>
                      <small>{after.profile.name}</small>
                    </div>
                  </div>
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Before and after results"
                  >
                    <table>
                      <caption>Raw observations and published grades</caption>
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Before</th>
                          <th>After</th>
                          <th>Observed change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.metric.id}>
                            <th scope="row">
                              {row.metric.name}
                              <small>
                                {row.metric.direction === "lower"
                                  ? "Lower"
                                  : "Higher"}{" "}
                                is better
                              </small>
                            </th>
                            <td>
                              {row.before
                                ? `${row.before.value} ${row.before.metric.unit}`
                                : "No valid result"}
                              <small>
                                {row.before ? `${row.before.points}/4` : ""}
                              </small>
                            </td>
                            <td>
                              {row.after
                                ? `${row.after.value} ${row.after.metric.unit}`
                                : "Not retested"}
                              <small>
                                {row.after ? `${row.after.points}/4` : ""}
                              </small>
                            </td>
                            <td>
                              {row.delta === null
                                ? row.reason
                                : `${row.delta > 0 ? "+" : ""}${row.delta} ${row.metric.unit}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="report-definition">
                    A change is a measured difference, not a claim of meaningful
                    improvement. Deltas require the exact same standards version
                    and collection definition. Changed definitions remain
                    visible without a calculated delta.
                  </p>
                  <footer>
                    <span>Published assessments only</span>
                    <span>Generated on this device</span>
                  </footer>
                </section>
              </ReportFrame>
            )
          )}
        </>
      )}
    </div>
  );
}
