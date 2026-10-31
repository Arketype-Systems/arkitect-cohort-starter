import { ArrowRight, ClipboardCheck, Clock3, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, PageHeader, Progress, StatusPill } from "../components/ui";
import { useData } from "../lib/useData";
import { useReports } from "../lib/useReports";
import { displayDate } from "../lib/utils";

export default function DashboardPage() {
  const data = useData();
  const { athletes, sessions, measurements, standards } = data;
  const index = useReports(data);
  const active = athletes.filter((athlete) => !athlete.archivedAt);
  const incomplete = sessions
    .filter((session) => session.status !== "published")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const recent = [...sessions]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
    )
    .slice(0, 6);
  const ready = active.filter(
    (athlete) => index.reportFor(athlete).complete,
  ).length;
  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow="Your workspace"
        title="Assessment command center"
        description="Continue testing, review results and prepare the next conversation with an athlete."
        actions={
          <Link className="button primary" to="/testing/new">
            New assessment
          </Link>
        }
      />
      <section className="stat-grid">
        <div className="stat-card">
          <Users />
          <span>Active roster</span>
          <strong>{active.length}</strong>
          <small>Current athletes</small>
        </div>
        <div className="stat-card">
          <ClipboardCheck />
          <span>Published sessions</span>
          <strong>
            {
              sessions.filter((session) => session.status === "published")
                .length
            }
          </strong>
          <small>Approved assessments</small>
        </div>
        <div className="stat-card">
          <Clock3 />
          <span>Needs attention</span>
          <strong>{incomplete.length}</strong>
          <small>Draft, testing or review</small>
        </div>
        <Link className="stat-card" to="/reporting">
          <ClipboardCheck />
          <span>Reports available</span>
          <strong>{ready}</strong>
          <small>Athletes with complete results</small>
        </Link>
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Continue working</p>
              <h2>Incomplete assessments</h2>
            </div>
            <Link to="/testing">View all</Link>
          </div>
          {incomplete.length ? (
            <div className="work-list">
              {incomplete.map((session) => {
                const captured = measurements.filter(
                  (item) =>
                    item.sessionId === session.id &&
                    item.selectedAttempt !== null &&
                    item.status === "valid",
                ).length;
                const total =
                  session.athleteIds.length * session.metricIds.length;
                return (
                  <div className="work-item" key={session.id}>
                    <div className="work-icon">
                      <Clock3 size={20} />
                    </div>
                    <div className="work-copy">
                      <strong>{session.name}</strong>
                      <span>
                        {displayDate(session.date)} ·{" "}
                        {session.athleteIds.length} athletes
                      </span>
                      <Progress value={captured} max={total} />
                    </div>
                    <div className="work-status">
                      <span>
                        {captured} of {total}
                      </span>
                      <Link
                        className="icon-link"
                        aria-label={`Continue ${session.name}`}
                        to={`/testing/${session.id}/${session.status === "review" ? "review" : "live"}`}
                      >
                        <ArrowRight />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No unfinished assessments">
              Start a new assessment when you are ready to test.
            </EmptyState>
          )}
        </section>
        <aside className="panel quick-start">
          <p className="eyebrow">Next actions</p>
          <h2>Prepare and share</h2>
          <Link to="/athletes">
            <Users size={18} />
            <div>
              <strong>Review your roster</strong>
              <small>Find athletes and open their history.</small>
            </div>
            <ArrowRight size={18} />
          </Link>
          <Link to="/reporting">
            <ClipboardCheck size={18} />
            <div>
              <strong>Open a report</strong>
              <small>Individual, before/after or roster.</small>
            </div>
            <ArrowRight size={18} />
          </Link>
          <Link to="/database">
            <ClipboardCheck size={18} />
            <div>
              <strong>Keep a backup</strong>
              <small>Save another copy of this workspace.</small>
            </div>
            <ArrowRight size={18} />
          </Link>
        </aside>
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Assessment log</p>
            <h2>Recent sessions</h2>
          </div>
        </div>
        {recent.length ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Recent assessment sessions"
          >
            <table>
              <caption className="visually-hidden">Recent assessments</caption>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Date</th>
                  <th>Roster</th>
                  <th>Standard</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <strong>{session.name}</strong>
                    </td>
                    <td>{displayDate(session.date)}</td>
                    <td>{session.athleteIds.length} athletes</td>
                    <td>
                      v
                      {standards.find(
                        (item) => item.id === session.standardsVersionId,
                      )?.version ?? "Unavailable"}
                    </td>
                    <td>
                      <StatusPill
                        tone={
                          session.status === "published" ? "good" : "warning"
                        }
                      >
                        {session.status.replace("_", " ")}
                      </StatusPill>
                    </td>
                    <td>
                      <Link
                        to={`/testing/${session.id}/${session.status === "published" || session.status === "review" ? "review" : "live"}`}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>
            No assessments yet. Your first published session will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
