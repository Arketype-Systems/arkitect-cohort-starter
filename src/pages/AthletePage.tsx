import { saveAthlete } from "../lib/athlete-actions";
import { useUnsavedChanges } from "../lib/useUnsavedChanges";
import { isCalendarDate } from "../lib/validation";
import { Activity, ArrowLeft, FileText, Pencil, X } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  EmptyState,
  PageHeader,
  ScoreBadge,
  StatusPill,
} from "../components/ui";
import { db } from "../lib/db";
import { imageFileToDataUrl } from "../lib/images";
import { useReports } from "../lib/useReports";
import { MetricHistory } from "../components/MetricHistory";
import { athleteAgeOn } from "../lib/standards";
import { useData } from "../lib/useData";
import { displayDate, initials } from "../lib/utils";

export default function AthletePage() {
  const { athleteId } = useParams();
  const location = useLocation();
  const data = useData();
  const { athletes, standards } = data;
  const index = useReports(data);
  const athlete = athletes.find((item) => item.id === athleteId);
  const report = athlete ? index.reportFor(athlete) : undefined;
  const version = report?.version;

  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState("");
  useUnsavedChanges(editing);
  if (!athlete || !version || !report)
    return (
      <div className="page">
        <EmptyState title="Athlete not found">
          This athlete is not in the local database.
        </EmptyState>
      </div>
    );
  const age = athleteAgeOn(
    athlete.dateOfBirth,
    new Date().toISOString().slice(0, 10),
  );
  async function saveProfile(formData: FormData) {
    if (
      formData.get("dateOfBirth") &&
      !isCalendarDate(String(formData.get("dateOfBirth")))
    ) {
      setSaveError("Enter a real birth date.");
      return;
    }
    const sport = String(formData.get("sport")).trim();
    const position = String(formData.get("position")).trim();
    const additionalSports = String(formData.get("additionalSports"))
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const additionalPositions = String(formData.get("additionalPositions"))
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    try {
      const photo = formData.get("photo");
      const photoDataUrl =
        photo instanceof File && photo.size
          ? await imageFileToDataUrl(photo)
          : athlete!.photoDataUrl;
      await saveAthlete({
        ...athlete!,
        synthetic: false,
        firstName: String(formData.get("firstName")).trim(),
        lastName: String(formData.get("lastName")).trim(),
        sex: String(formData.get("sex")) as "female" | "male" | "unspecified",
        dateOfBirth: String(formData.get("dateOfBirth")),
        grade: String(formData.get("grade")).trim(),
        group: String(formData.get("group")).trim(),
        sport,
        position,
        sports: [...new Set([sport, ...additionalSports].filter(Boolean))],
        positions: [
          ...new Set([position, ...additionalPositions].filter(Boolean)),
        ],
        photoDataUrl,
      });
      setEditing(false);
      setSaveError("");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "The athlete profile could not be saved to IndexedDB. Check browser storage access and try again.",
      );
    }
  }
  return (
    <div className="page">
      <Link
        className="back-link"
        to={`/athletes${location.state?.rosterSearch ? `?${location.state.rosterSearch}` : ""}`}
      >
        <ArrowLeft size={16} />
        Athletes
      </Link>
      <PageHeader
        title={`${athlete.firstName} ${athlete.lastName}`}
        description={`${athlete.sport} · ${athlete.position || "Position not set"} · Grade ${athlete.grade || "not set"} · ${athlete.group}`}
        actions={
          <>
            <button
              className="button secondary"
              onClick={() => setEditing(true)}
            >
              <Pencil size={17} />
              Edit profile
            </button>
            <Link className="button primary" to={`/reporting/${athlete.id}`}>
              <FileText size={18} />
              View report
            </Link>
          </>
        }
      />
      <section className="profile-summary panel">
        <div className="avatar xl">
          {athlete.photoDataUrl ? (
            <img
              src={athlete.photoDataUrl}
              alt={`${athlete.firstName} ${athlete.lastName}`}
            />
          ) : (
            initials(athlete.firstName, athlete.lastName)
          )}
        </div>
        <div className="identity">
          <p className="eyebrow">Athlete profile</p>
          <h2>Athlete information</h2>
          <div className="identity-facts">
            <span>
              {athlete.sex === "unspecified"
                ? "Sex not specified"
                : athlete.sex}
            </span>
            <span>{age === null ? "Age not available" : `Age ${age}`}</span>
            <span>
              {athlete.dateOfBirth
                ? `Born ${displayDate(athlete.dateOfBirth)}`
                : "Birth date not set"}
            </span>
            <span>Grade {athlete.grade || "not set"}</span>
          </div>
          <div className="profile-tags">
            {athlete.sports.map((sport) => (
              <span key={sport}>{sport}</span>
            ))}
            {athlete.positions.map((position) => (
              <span key={position}>{position}</span>
            ))}
          </div>
        </div>
        <ScoreBadge
          score={report.overall}
          maxPoints={report.maxPoints}
          label={`Point total · v${version.version}`}
        />
      </section>
      <section className="profile-contract">
        <div>
          <span>Scoring profile</span>
          <strong>{report.profile.name}</strong>
          <small>Controls the 0 through 4 testing grades.</small>
        </div>
        <div>
          <span>Comparison archetype</span>
          <strong>{report.archetype?.name ?? "Not matched"}</strong>
          <small>Controls percentile peers from database tags.</small>
        </div>
        <div>
          <span>Primary sport</span>
          <strong>{athlete.sport}</strong>
          <small>
            {athlete.sports.length} sport
            {athlete.sports.length === 1 ? "" : "s"} on profile
          </small>
        </div>
        <div>
          <span>Training group</span>
          <strong>{athlete.group}</strong>
          <small>Available as an optional level filter.</small>
        </div>
      </section>
      <div className="profile-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Latest assessment</p>
              <h2>Metric grades</h2>
            </div>
            {report.latestSession && (
              <span>{displayDate(report.latestSession.date)}</span>
            )}
          </div>
          {report.scores.length ? (
            <div className="metric-list">
              {report.scores.map((score) => (
                <div className="metric-row" key={score.metric.id}>
                  <div>
                    <strong>{score.metric.name}</strong>
                    <span>
                      {score.value} {score.metric.unit}
                    </span>
                  </div>
                  <div className="mini-bar">
                    <span
                      style={{
                        width: `${(score.points / 4) * 100}%`,
                        background: score.band.color,
                      }}
                    />
                  </div>
                  <StatusPill
                    tone={
                      score.points >= 3
                        ? "good"
                        : score.points >= 2
                          ? "ready"
                          : "warning"
                    }
                  >
                    {score.points}/4 · {score.band.label}
                  </StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No published results">
              Publish a complete assessment to create metric grades.
            </EmptyState>
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">History</p>
              <h2>Assessment sessions</h2>
            </div>
          </div>
          {report.sessions.length ? (
            <div className="timeline">
              {report.sessions.map((session) => {
                const sessionVersion = standards.find(
                  (item) => item.id === session.standardsVersionId,
                );
                return (
                  <div key={session.id}>
                    <span className="timeline-dot">
                      <Activity size={14} />
                    </span>
                    <div>
                      <strong>{session.name}</strong>
                      <p>
                        {displayDate(session.date)} ·{" "}
                        {sessionVersion
                          ? `Standard v${sessionVersion.version}`
                          : "Standard unavailable"}
                      </p>
                    </div>
                    <Link to={`/reporting/${athlete.id}?session=${session.id}`}>
                      Open assessment
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No history yet">
              This athlete has no published assessment sessions.
            </EmptyState>
          )}
        </section>
      </div>
      <MetricHistory report={report} data={data} />
      {saveError && !editing && (
        <p className="validation-error" role="alert">
          {saveError}
        </p>
      )}
      <section className="panel archive-panel">
        <div>
          <h2>
            {athlete.archivedAt ? "Archived athlete" : "Roster management"}
          </h2>
          <p>
            {athlete.archivedAt
              ? "Assessment history is preserved. Reactivate to include this athlete in new sessions."
              : "Archiving removes an athlete from the active roster while preserving published history."}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            db.athletes
              .update(athlete.id, {
                archivedAt: athlete.archivedAt
                  ? undefined
                  : new Date().toISOString(),
              })
              .catch((error) => setSaveError(String(error)))
          }
        >
          {athlete.archivedAt ? "Reactivate athlete" : "Archive athlete"}
        </button>
      </section>

      {editing && (
        <div className="modal-backdrop">
          <div
            className="modal athlete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-athlete-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Roster record</p>
                <h2 id="edit-athlete-title">Edit athlete profile</h2>
                <p>
                  Changes affect future standards matching. Published sessions
                  keep their pinned scoring profile.
                </p>
              </div>
              <button
                className="icon-button"
                aria-label="Close athlete editor"
                onClick={() => {
                  setEditing(false);
                  setSaveError("");
                }}
              >
                <X />
              </button>
            </div>
            <form action={saveProfile}>
              {saveError && (
                <p className="validation-error" role="alert">
                  {saveError}
                </p>
              )}
              <section className="form-section">
                <div className="form-section-title">
                  <span>01</span>
                  <div>
                    <strong>Identity</strong>
                    <small>Roster and demographic fields</small>
                  </div>
                </div>
                <div className="form-grid">
                  <label>
                    First name
                    <input
                      name="firstName"
                      required
                      defaultValue={athlete.firstName}
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      name="lastName"
                      required
                      defaultValue={athlete.lastName}
                    />
                  </label>
                  <label>
                    Sex
                    <select name="sex" defaultValue={athlete.sex}>
                      <option value="unspecified">Not specified</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                  </label>
                  <label>
                    Date of birth
                    <input
                      name="dateOfBirth"
                      type="date"
                      defaultValue={athlete.dateOfBirth}
                    />
                  </label>
                  <label>
                    Grade
                    <input name="grade" defaultValue={athlete.grade} />
                  </label>
                  <label>
                    Training group
                    <input name="group" required defaultValue={athlete.group} />
                  </label>
                  <label className="wide">
                    Replace athlete photo
                    <input name="photo" type="file" accept="image/*" />
                  </label>
                </div>
              </section>
              <section className="form-section">
                <div className="form-section-title">
                  <span>02</span>
                  <div>
                    <strong>Sport profile</strong>
                    <small>Primary and secondary roles</small>
                  </div>
                </div>
                <div className="form-grid">
                  <label>
                    Primary sport
                    <input name="sport" required defaultValue={athlete.sport} />
                  </label>
                  <label>
                    Primary position
                    <input name="position" defaultValue={athlete.position} />
                  </label>
                  <label>
                    Additional sports
                    <input
                      name="additionalSports"
                      defaultValue={athlete.sports
                        .filter((sport) => sport !== athlete.sport)
                        .join(", ")}
                    />
                  </label>
                  <label>
                    Additional positions
                    <input
                      name="additionalPositions"
                      defaultValue={athlete.positions
                        .filter((position) => position !== athlete.position)
                        .join(", ")}
                    />
                  </label>
                </div>
              </section>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setEditing(false);
                    setSaveError("");
                  }}
                >
                  Cancel
                </button>
                <button className="button primary">Save profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
