import Papa from "papaparse";
import { Link, useSearchParams } from "react-router-dom";
import { ReportFrame } from "../components/ReportFrame";
import { EmptyState, Notice, PageHeader } from "../components/ui";
import { useBrandSettings } from "../lib/branding";
import { downloadText } from "../lib/csv";
import { latestStandardsVersion } from "../lib/report";
import { useData } from "../lib/useData";
import { useReports } from "../lib/useReports";
import { displayDate, localISODate } from "../lib/utils";

export default function RosterReportPage() {
  const data = useData();
  const index = useReports(data);
  const brand = useBrandSettings();
  const [params, setParams] = useSearchParams();
  const version =
    data.standards.find((item) => item.id === params.get("version")) ??
    latestStandardsVersion(data.standards);
  const group = params.get("group") ?? "";
  const asOf = params.get("asOf") ?? localISODate();
  const selected = params.get("athletes")?.split(",");
  const sessionId = params.get("session") ?? "";
  const session = data.sessions.find(
    (item) =>
      item.id === sessionId &&
      item.status === "published" &&
      item.standardsVersionId === version?.id,
  );
  const roster = data.athletes.filter(
    (athlete) =>
      !athlete.archivedAt &&
      (!group || athlete.group === group) &&
      (!selected || selected.includes(athlete.id)),
  );
  const rows = roster.map((athlete) => {
    const assessment = session
      ? session.athleteIds.includes(athlete.id)
        ? session
        : undefined
      : (index.sessionsByAthlete.get(athlete.id) ?? []).find(
          (item) =>
            item.standardsVersionId === version?.id && item.date <= asOf,
        );
    return {
      athlete,
      report: assessment ? index.reportFor(athlete, assessment.id) : undefined,
    };
  });
  const reports = rows.flatMap((row) => row.report ?? []);
  const scope = `${version?.name} v${version?.version} | ${session ? session.name : `Latest published in this version through ${asOf}`} | ${group || "All groups"}`;
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    if (key === "version") next.delete("session");
    setParams(next, { replace: true });
  }
  async function pdf() {
    const { rosterPdf } = await import("../lib/report-pdf");
    (
      await rosterPdf(
        reports,
        brand,
        scope,
        rows
          .filter((row) => !row.report)
          .map((row) => `${row.athlete.firstName} ${row.athlete.lastName}`),
      )
    ).save("roster-assessment-report.pdf");
  }
  function csv() {
    downloadText(
      "roster-assessment-report.csv",
      Papa.unparse(
        rows.map(({ athlete, report }) => ({
          athlete_id: athlete.id,
          name: `${athlete.firstName} ${athlete.lastName}`,
          assessment: report?.latestSession?.date ?? "",
          standards_version: version?.version,
          status: !report
            ? "No published result in scope"
            : report.complete
              ? "Complete"
              : "Missing required results",
          points: report?.overall ?? "",
          max_points: report?.maxPoints ?? "",
          ...Object.fromEntries(
            version?.metrics.map((metric) => [
              `${metric.name} (${metric.unit}) [${metric.id}]`,
              report?.scores.find((score) => score.metric.id === metric.id)
                ?.value ?? "",
            ]) ?? [],
          ),
        })),
        { escapeFormulae: true },
      ),
    );
  }
  return (
    <div className="page report-page">
      <Link className="back-link" to="/reporting">
        Reporting
      </Link>
      <PageHeader
        eyebrow="Group assessment"
        title="Roster report"
        description="Keep every result within one standards version. Review the scope before exporting."
      />
      <div className="report-controls">
        <label>
          Standards version
          <select
            aria-label="Roster standards version"
            value={version?.id ?? ""}
            onChange={(event) => change("version", event.target.value)}
          >
            {data.standards.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · v{item.version}
              </option>
            ))}
          </select>
        </label>
        <label>
          Assessment scope
          <select
            aria-label="Roster assessment scope"
            value={sessionId}
            onChange={(event) => change("session", event.target.value)}
          >
            <option value="">Latest in this version</option>
            {data.sessions
              .filter(
                (item) =>
                  item.status === "published" &&
                  item.standardsVersionId === version?.id,
              )
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {displayDate(item.date)} · {item.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Through date
          <input
            type="date"
            value={asOf}
            disabled={Boolean(session)}
            onChange={(event) => change("asOf", event.target.value)}
          />
        </label>
        <label>
          Group
          <select
            aria-label="Roster report group"
            value={group}
            onChange={(event) => change("group", event.target.value)}
          >
            <option value="">All groups</option>
            {[...new Set(data.athletes.map((athlete) => athlete.group))]
              .sort()
              .map((value) => (
                <option key={value}>{value}</option>
              ))}
          </select>
        </label>
        {selected && (
          <button
            className="text-button"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.delete("athletes");
              setParams(next);
            }}
          >
            Use full roster
          </button>
        )}
      </div>
      {sessionId && !session ? (
        <Notice tone="warning">
          The selected assessment is unavailable in this standards version.
          Choose another assessment scope.
        </Notice>
      ) : !version || !rows.length ? (
        <EmptyState title="No athletes in scope">
          Select a group or return to the roster to choose athletes.
        </EmptyState>
      ) : (
        <>
          <Notice>
            {reports.length} of {rows.length} athletes have a published result
            in scope. {rows.length - reports.length} are listed without results
            in the report and PDF. CSV includes every athlete in scope.
          </Notice>
          <ReportFrame title="Roster assessment" onPdf={pdf} csv={csv}>
            <section className="report-sheet">
              <header className="report-header">
                <div>
                  <p className="eyebrow">{brand.organizationName}</p>
                  <h1>Roster assessment</h1>
                  <p>{scope}</p>
                </div>
              </header>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Roster assessment results"
              >
                <table>
                  <caption>{rows.length} athletes in scope</caption>
                  <thead>
                    <tr>
                      <th>Athlete</th>
                      <th>Assessment</th>
                      <th>Points</th>
                      {version.metrics.map((metric) => (
                        <th key={metric.id}>
                          {metric.shortName}
                          <small>{metric.unit}</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ athlete, report }) => (
                      <tr key={athlete.id}>
                        <th scope="row">
                          {athlete.firstName} {athlete.lastName}
                          <small>
                            {report?.profile.name ?? "No result in scope"}
                          </small>
                        </th>
                        <td>
                          {report?.latestSession
                            ? displayDate(report.latestSession.date)
                            : "Not assessed"}
                        </td>
                        <td>
                          {report
                            ? report.overall === null
                              ? "Incomplete"
                              : `${report.overall}/${report.maxPoints}`
                            : "—"}
                        </td>
                        {version.metrics.map((metric) => (
                          <td key={metric.id}>
                            {report?.scores.find(
                              (score) => score.metric.id === metric.id,
                            )?.value ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="report-definition">
                Missing results remain missing. Different standards versions are
                excluded from this view. Percentiles and inferred training
                priorities are not substituted for raw measurements.
              </p>
              <footer>
                <span>One standards version</span>
                <span>Generated on this device</span>
              </footer>
            </section>
          </ReportFrame>
        </>
      )}
    </div>
  );
}
