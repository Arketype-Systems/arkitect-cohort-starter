import { Link } from "react-router-dom";
import type { AthleteReport } from "../lib/types";
import type { useData } from "../lib/useData";
import { displayDate } from "../lib/utils";
export function MetricHistory({
  report,
  data,
}: {
  report: AthleteReport;
  data: ReturnType<typeof useData>;
}) {
  const sessions = [...report.sessions].reverse();
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Longitudinal results</p>
          <h2>Metric history</h2>
        </div>
        <Link to={`/reports/compare?athlete=${report.athlete.id}`}>
          Compare assessments
        </Link>
      </div>
      <div className="history-grid">
        {report.version.metrics.map((metric) => {
          const observations = sessions.flatMap((session) => {
            const version = data.standards.find(
              (item) => item.id === session.standardsVersionId,
            );
            const definition = version?.metrics.find(
              (item) => item.id === metric.id,
            );
            const value = data.measurements.find(
              (item) =>
                item.sessionId === session.id &&
                item.athleteId === report.athlete.id &&
                item.metricId === metric.id &&
                item.status === "valid" &&
                item.selectedAttempt !== null,
            );
            return value && definition
              ? [
                  {
                    session,
                    value: value.selectedAttempt!,
                    metric: definition,
                    version,
                  },
                ]
              : [];
          });
          const compatible = observations.filter(
            (row) => row.version?.id === report.version.id,
          );
          const low = Math.min(...compatible.map((row) => row.value));
          const high = Math.max(...compatible.map((row) => row.value));
          const start = Date.parse(compatible[0]?.session.date ?? "");
          const end = Date.parse(compatible.at(-1)?.session.date ?? "");
          const coordinates = compatible.map((row, index) => ({
            x:
              end > start
                ? 18 +
                  ((Date.parse(row.session.date) - start) / (end - start)) * 264
                : 18 + (index / Math.max(compatible.length - 1, 1)) * 264,
            y: high > low ? 90 - ((row.value - low) / (high - low)) * 60 : 60,
          }));
          return (
            <article className="history-card" key={metric.id}>
              <h3>{metric.name}</h3>
              <p className="muted">
                {metric.unit} · v{report.version.version}
              </p>
              {compatible.length >= 2 && (
                <svg
                  viewBox="0 0 300 120"
                  role="img"
                  aria-label={`${metric.name} history under standards ${report.version.version}`}
                >
                  <polyline
                    points={coordinates
                      .map((point) => `${point.x},${point.y}`)
                      .join(" ")}
                    fill="none"
                    stroke="var(--brand-text, #086773)"
                    strokeWidth="2"
                  />
                  {coordinates.map((point, index) => (
                    <g key={compatible[index].session.id}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill="var(--brand-text, #086773)"
                      />
                      <text x={point.x} y={point.y - 10} textAnchor="middle">
                        {compatible[index].value}
                      </text>
                    </g>
                  ))}
                  <text x="18" y="115">
                    {compatible[0].session.date}
                  </text>
                  <text x="282" y="115" textAnchor="end">
                    {compatible.at(-1)?.session.date}
                  </text>
                </svg>
              )}
              <div className="metric-observations">
                {observations.length ? (
                  observations.map((row) => (
                    <Link
                      key={row.session.id}
                      to={`/reporting/${report.athlete.id}?session=${row.session.id}`}
                    >
                      <span>
                        {displayDate(row.session.date)}
                        <small>v{row.version?.version}</small>
                      </span>
                      <strong>
                        {row.value} {row.metric.unit}
                      </strong>
                    </Link>
                  ))
                ) : (
                  <p>No valid published observations.</p>
                )}
              </div>
              {observations.some(
                (row) => row.version?.id !== report.version.id,
              ) && (
                <small>
                  Changed versions remain listed separately from the chart.
                </small>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
