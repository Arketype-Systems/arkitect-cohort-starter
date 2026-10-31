import { FileText, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, PageHeader } from "../components/ui";
import { useData } from "../lib/useData";
import { useReports } from "../lib/useReports";
import { displayDate, initials } from "../lib/utils";

export default function ReportingPage() {
  const data = useData();
  const index = useReports(data);
  const [query, setQuery] = useState("");
  const reports = data.athletes
    .filter(
      (athlete) =>
        !athlete.archivedAt &&
        `${athlete.firstName} ${athlete.lastName}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .map((athlete) => index.reportFor(athlete));
  let recent: string[] = [];
  try {
    const parsed = JSON.parse(
      data.settings.find((row) => row.key === "recent-reports")?.value ?? "[]",
    );
    if (Array.isArray(parsed))
      recent = parsed.filter((id) => typeof id === "string");
  } catch {
    /* Ignore old preferences. */
  }
  const recentAthletes = recent.flatMap(
    (id) => data.athletes.find((athlete) => athlete.id === id) ?? [],
  );
  return (
    <div className="page">
      <PageHeader
        eyebrow="Assessment insight"
        title="Reporting"
        description="Review an individual result, compare two assessments or prepare a roster summary."
      />
      <div className="report-types">
        <Link className="panel" to="#individual">
          <FileText />
          <h2>Individual assessment</h2>
          <p>Published measurements, grades and comparison context.</p>
        </Link>
        <Link className="panel" to="/reports/compare">
          <h2>Before and after</h2>
          <p>Compare observations while retaining each date’s standards.</p>
        </Link>
        <Link className="panel" to="/reports/roster">
          <h2>Roster report</h2>
          <p>Choose an assessment scope and export a group summary.</p>
        </Link>
      </div>
      {recentAthletes.length > 0 && (
        <div className="recent-reports">
          <strong>Recently opened</strong>
          {recentAthletes.map((athlete) => (
            <Link key={athlete.id} to={`/reporting/${athlete.id}`}>
              {athlete.firstName} {athlete.lastName}
            </Link>
          ))}
        </div>
      )}
      <label className="search-field report-search">
        <Search size={18} />
        <input
          aria-label="Search reports"
          placeholder="Find an athlete report"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <section id="individual" className="panel">
        <div className="section-heading">
          <h2>Athlete reports</h2>
          <span>
            {reports.filter((report) => report.latestSession).length} with
            published results
          </span>
        </div>
        {!reports.length ? (
          <EmptyState title="No reports match">
            Add an athlete or adjust your search.
          </EmptyState>
        ) : (
          <div className="report-list">
            {reports.map((report) => (
              <Link
                key={report.athlete.id}
                to={`/reporting/${report.athlete.id}`}
              >
                <span className="avatar small">
                  {initials(report.athlete.firstName, report.athlete.lastName)}
                </span>
                <div>
                  <strong>
                    {report.athlete.firstName} {report.athlete.lastName}
                  </strong>
                  <span>
                    {report.athlete.sports.join(" / ")} · {report.athlete.group}
                  </span>
                </div>
                <div className="report-date">
                  <strong>
                    {!report.latestSession
                      ? "Not assessed"
                      : report.overall === null
                        ? "Required tests missing"
                        : `${report.overall}/${report.maxPoints}`}
                  </strong>
                  <span>
                    {report.latestSession
                      ? displayDate(report.latestSession.date)
                      : "No published assessment"}
                  </span>
                </div>
                <FileText size={18} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
