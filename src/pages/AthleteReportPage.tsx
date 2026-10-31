import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { RadarChart } from "../components/RadarChart";
import { AssessmentDateControl } from "../components/AssessmentDateControl";
import { ReportFrame } from "../components/ReportFrame";
import { EmptyState, Notice, ScoreBadge } from "../components/ui";
import { useBrandSettings } from "../lib/branding";
import { downloadText } from "../lib/csv";
import { reportToCsv } from "../lib/report";
import { useData } from "../lib/useData";
import { useReports } from "../lib/useReports";
import { rememberReport } from "../lib/workspace-views";
import { displayDate, initials } from "../lib/utils";

export default function AthleteReportPage() {
  const { athleteId } = useParams();
  const [params, setParams] = useSearchParams();
  const data = useData();
  const index = useReports(data);
  const brand = useBrandSettings();
  const athlete = data.athletes.find((item) => item.id === athleteId);
  const sessions = index.sessionsByAthlete.get(athleteId ?? "") ?? [];
  const selected = params.get("session") ?? "";
  useEffect(() => {
    if (athleteId) void rememberReport(athleteId).catch(() => undefined);
  }, [athleteId]);
  if (!athlete)
    return (
      <div className="page">
        <EmptyState title="Report not found">
          The athlete is not in this browser database.
        </EmptyState>
      </div>
    );
  if (selected && !sessions.some((session) => session.id === selected))
    return (
      <div className="page">
        <EmptyState
          title="Assessment unavailable"
          action={
            <Link to={`/reporting/${athlete.id}`}>Open latest report</Link>
          }
        >
          Choose a published assessment belonging to this athlete.
        </EmptyState>
      </div>
    );
  const report = index.reportFor(athlete, selected || undefined);
  const identity = `${athlete.firstName} ${athlete.lastName}`;
  async function pdf() {
    const { individualPdf } = await import("../lib/report-pdf");
    (await individualPdf(report, brand)).save(`${identity}-assessment.pdf`);
  }
  return (
    <div className="page report-page">
      <Link className="back-link" to="/reporting">
        <ArrowLeft size={16} />
        Reporting
      </Link>
      <div className="report-controls">
        <AssessmentDateControl
          sessions={sessions}
          value={selected}
          onChange={(value) => setParams(value ? { session: value } : {})}
        />
        <Link
          className="button secondary"
          to={`/reports/compare?athlete=${athlete.id}`}
        >
          Compare assessments
        </Link>
        <Link className="text-button" to={`/athletes/${athlete.id}`}>
          Athlete history
        </Link>
      </div>
      <ReportFrame
        title="Individual assessment"
        onPdf={pdf}
        csv={() =>
          downloadText(
            `${athlete.firstName}-${athlete.lastName}-report.csv`,
            reportToCsv(report),
          )
        }
      >
        <section className="report-sheet">
          <header className="report-header">
            <div className="report-heading">
              <div className="report-brand-lockup">
                {brand.logoDataUrl && <img src={brand.logoDataUrl} alt="" />}
                <div>
                  <strong>{brand.organizationName}</strong>
                  <small>{brand.productName} report</small>
                </div>
              </div>
              <h1>{identity}</h1>
              <p>
                {athlete.sports.join(" / ")} ·{" "}
                {athlete.positions.join(" / ") || "Position not set"} ·{" "}
                {athlete.group}
              </p>
            </div>
            <dl className="report-meta">
              <div>
                <dt>Assessment</dt>
                <dd>{displayDate(report.latestSession?.date)}</dd>
              </div>
              <div>
                <dt>Battery</dt>
                <dd>
                  {report.version.name} · v{report.version.version}
                </dd>
              </div>
              <div>
                <dt>Scoring profile</dt>
                <dd>{report.profile.name}</dd>
              </div>
            </dl>
          </header>
          {!report.latestSession && (
            <Notice>
              No published assessment is available. Enter and publish results
              before sharing this report.
            </Notice>
          )}
          {!report.complete && report.latestSession && (
            <Notice tone="warning">
              <strong>Incomplete assessment.</strong> Missing required tests:{" "}
              {report.missing.join(", ")}. A point total is unavailable.
            </Notice>
          )}
          <div className="report-overview">
            <div className="report-athlete-summary">
              <div className="report-avatar">
                {athlete.photoDataUrl ? (
                  <img src={athlete.photoDataUrl} alt="" />
                ) : (
                  initials(athlete.firstName, athlete.lastName)
                )}
              </div>
              <div>
                <p className="eyebrow">Published result</p>
                <h2>
                  {report.complete
                    ? `${report.overall} of ${report.maxPoints} points`
                    : report.latestSession
                      ? "Required results missing"
                      : "Not assessed"}
                </h2>
                <p>Each required test contributes 0 through 4 points.</p>
              </div>
            </div>
            <ScoreBadge score={report.overall} maxPoints={report.maxPoints} />
          </div>
          <div className="report-section-heading">
            <div>
              <p className="eyebrow">Assessment results</p>
              <h2>Measurements and grades</h2>
            </div>
            <span>{report.scores.length} tests reported</span>
          </div>
          <div className="report-detail-table">
            <div className="report-detail-head">
              <span>Test</span>
              <span>Result</span>
              <span>Grade</span>
              <span>Percentile</span>
              <span>Interpretation</span>
            </div>
            {report.version.metrics.map((metric) => {
              const score = report.scores.find(
                (item) => item.metric.id === metric.id,
              );
              return (
                <div className="report-detail-row" key={metric.id}>
                  <div>
                    <strong>{metric.name}</strong>
                    <small>
                      {metric.direction === "higher"
                        ? "Higher is better"
                        : "Lower is better"}
                    </small>
                  </div>
                  <b>{score ? `${score.value} ${metric.unit}` : "No result"}</b>
                  <div className="report-grade">
                    <strong>{score ? `${score.points}/4` : "—"}</strong>
                    <span>
                      {score?.band.label ??
                        (metric.required ? "Required" : "Optional")}
                    </span>
                  </div>
                  <div className="report-percentile">
                    <strong>
                      {score?.percentile === undefined
                        ? "—"
                        : `${score.percentile}th`}
                    </strong>
                    <span>{score?.cohortSize ?? 0} athletes</span>
                  </div>
                  <p>
                    {score?.band.meaning ?? "No valid published observation."}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="report-definition">
            <strong>Two different comparisons</strong>
            <p>
              Grades use the pinned standards profile. Percentiles use current
              roster tags and published results from the exact version through{" "}
              {displayDate(report.latestSession?.date)}. This database sample is
              not a population norm. Comparison group:{" "}
              {report.archetype?.name ?? "Not matched"}.
            </p>
          </div>
        </section>
        <section className="report-sheet report-context">
          <div className="report-section-heading">
            <div>
              <p className="eyebrow">Interpretation</p>
              <h2>Put the results in context</h2>
            </div>
          </div>
          <div className="report-context-grid">
            <div>
              <h3>Observed grade groups</h3>
              {report.strengths.length ? (
                <>
                  <p>
                    <strong>Higher grades:</strong>{" "}
                    {report.strengths
                      .map(
                        (score) => `${score.metric.name} (${score.points}/4)`,
                      )
                      .join(", ")}
                    .
                  </p>
                  <p>
                    <strong>Lower grades:</strong>{" "}
                    {report.priorities
                      .map(
                        (score) => `${score.metric.name} (${score.points}/4)`,
                      )
                      .join(", ")}
                    .
                  </p>
                </>
              ) : (
                <p>
                  {report.complete
                    ? "The grades are tied. No tests have been arbitrarily separated into strengths or priorities."
                    : "Complete the required assessment before comparing grade groups."}
                </p>
              )}
              <p className="muted">
                These are assessment observations. The coach determines their
                relevance to training.
              </p>
              <h3>Assessment history</h3>
              <div className="report-history">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    to={`/reporting/${athlete.id}?session=${session.id}`}
                  >
                    {displayDate(session.date)} · {session.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="report-radar-panel">
              <h3>Percentile profile</h3>
              <RadarChart
                scores={report.scores}
                label={report.archetype?.name ?? "the comparison group"}
              />
            </div>
          </div>
          <footer>
            <span>
              Athlete ID {athlete.id} · Standards v{report.version.version}
            </span>
            <span>Generated on this device</span>
          </footer>
        </section>
      </ReportFrame>
    </div>
  );
}
