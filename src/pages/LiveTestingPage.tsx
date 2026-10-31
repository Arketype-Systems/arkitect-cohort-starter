import { navigateTabs } from "../lib/tab-navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useBlocker } from "react-router-dom";
import { Notice, Progress, StatusPill } from "../components/ui";
import { useAttemptDrafts } from "../lib/attempt-drafts";
import { reviewSession } from "../lib/session-actions";
import { isMetricValueValid, scoreMetric } from "../lib/scoring";
import { bandsForMetric, resolveStandardsProfile } from "../lib/standards";
import { useData } from "../lib/useData";
import { initials } from "../lib/utils";

export default function LiveTestingPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { athletes, sessions, measurements, standards, settings } = useData();
  const session = sessions.find((s) => s.id === sessionId);
  const version = standards.find((s) => s.id === session?.standardsVersionId);
  const roster = useMemo(
    () => athletes.filter((a) => session?.athleteIds.includes(a.id)),
    [athletes, session],
  );
  const metrics = useMemo(
    () =>
      version?.metrics.filter((m) => session?.metricIds.includes(m.id)) ?? [],
    [version, session],
  );
  const [queueQuery, setQueueQuery] = useState("");
  const [athleteId, setAthleteId] = useState("");
  const [metricId, setMetricId] = useState("");
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    if (!athleteId && roster[0]) setAthleteId(roster[0].id);
    if (!metricId && metrics[0]) setMetricId(metrics[0].id);
  }, [athleteId, metricId, roster, metrics]);
  const athlete = roster.find((a) => a.id === athleteId);
  const metric = metrics.find((m) => m.id === metricId);
  const current = measurements.find(
    (m) =>
      m.sessionId === sessionId &&
      m.athleteId === athleteId &&
      m.metricId === metricId,
  );
  const profile =
    athlete && version
      ? (version.profiles.find(
          (item) => item.id === session?.profileIdsByAthlete?.[athlete.id],
        ) ??
        resolveStandardsProfile(
          version,
          athlete,
          session?.date ?? new Date().toISOString().slice(0, 10),
        ))
      : undefined;
  const captured = measurements.filter(
    (m) =>
      m.sessionId === sessionId &&
      m.selectedAttempt !== null &&
      m.status === "valid",
  ).length;
  const total = roster.length * metrics.length;
  const athleteCompletion = (id: string) =>
    measurements.filter(
      (m) =>
        m.sessionId === sessionId &&
        m.athleteId === id &&
        m.selectedAttempt !== null &&
        m.status === "valid",
    ).length;
  const liveScores = useMemo(
    () =>
      metrics.flatMap((m) => {
        const result = measurements.find(
          (x) =>
            x.sessionId === sessionId &&
            x.athleteId === athleteId &&
            x.metricId === m.id &&
            x.selectedAttempt !== null &&
            x.status === "valid",
        );
        return result?.selectedAttempt === null ||
          result?.selectedAttempt === undefined
          ? []
          : [
              scoreMetric(
                m,
                result.selectedAttempt,
                profile ? bandsForMetric(profile, m.id, m.bands) : m.bands,
              ),
            ];
      }),
    [metrics, measurements, sessionId, athleteId, profile],
  );
  const drafts = useAttemptDrafts(
    sessionId ?? "",
    version?.id ?? "",
    settings.find((row) => row.key === "workspace-id")?.value ?? "",
  );
  const reconcileRef = useRef(drafts.reconcile);
  reconcileRef.current = drafts.reconcile;
  useEffect(() => {
    reconcileRef.current(measurements);
  }, [measurements, drafts.pending, athleteId, metricId]);
  const flushRef = useRef(drafts.flush);
  flushRef.current = drafts.flush;
  const blocker = useBlocker(drafts.hasUnsaved);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    let active = true;
    void flushRef
      .current()
      .then(() => {
        if (active) blocker.proceed();
      })
      .catch((error) => {
        if (active) {
          setSaveError(String(error));
          blocker.reset();
        }
      });
    return () => {
      active = false;
    };
  }, [blocker]);
  const saveState = drafts.pending
    ? "Saving"
    : drafts.error
      ? "Save failed"
      : "Saved on this device";
  if (!session || !version)
    return (
      <div className="page">
        <Notice tone="warning">
          This session is not available in the local database.
        </Notice>
      </div>
    );
  if (session.status === "published")
    return (
      <div className="page">
        <Notice tone="warning">
          <strong>This session is published and locked.</strong> Published
          measurements cannot be changed from live intake.
        </Notice>
        <Link className="button primary" to={`/testing/${session.id}/review`}>
          Open published review
        </Link>
      </div>
    );
  function saveAttempt(index: number, value: string) {
    if (!metric || !athleteId) return;
    setSaveError("");
    const raw = [...drafts.values(athleteId, metric, current)];
    raw[index] = value;
    drafts.save(athleteId, metric, raw, index);
  }
  async function clearResult() {
    if (metric) drafts.save(athleteId, metric, Array(metric.attempts).fill(""));
  }
  async function openReview() {
    try {
      await drafts.flush();
      await reviewSession(session!.id);
      navigate(`/testing/${session!.id}/review`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Finish saving before reviewing.",
      );
    }
  }
  function nextAthlete() {
    const index = roster.findIndex((a) => a.id === athleteId);
    setAthleteId(roster[(index + 1) % roster.length]?.id ?? "");
  }
  const invalid =
    current?.selectedAttempt !== null &&
    current?.selectedAttempt !== undefined &&
    metric
      ? !isMetricValueValid(metric, current.selectedAttempt)
      : false;
  return (
    <div className="live-page">
      <header className="live-header">
        <div>
          <Link className="back-link" to="/testing">
            <ArrowLeft size={16} />
            Testing
          </Link>
          <h1>{session.name}</h1>
          <p>
            {roster.length} athletes · {metrics.length} tests · Standard v
            {version.version}
          </p>
        </div>
        <div className="live-progress">
          <div>
            <span>
              {captured} of {total} results
            </span>
            <strong>
              {Math.round((captured / Math.max(total, 1)) * 100)}%
            </strong>
          </div>
          <Progress value={captured} max={total} />
        </div>
        <div className="autosave" role="status" aria-live="polite">
          <Cloud size={17} />
          <span>{saveState}</span>
          <small>Local storage</small>
        </div>
        <button
          className="button primary"
          disabled={saveState === "Saving" || saveState === "Save failed"}
          onClick={openReview}
        >
          Review session
          <ChevronRight size={17} />
        </button>
      </header>
      <div className="live-layout">
        <aside className="queue-panel">
          <div className="queue-heading">
            <div>
              <p className="eyebrow">Athlete queue</p>
              <h2>Roster</h2>
            </div>
            <span>
              {
                roster.filter((a) => athleteCompletion(a.id) === metrics.length)
                  .length
              }{" "}
              complete
            </span>
          </div>
          <input
            aria-label="Search testing roster"
            placeholder="Find an athlete"
            value={queueQuery}
            onChange={(event) => setQueueQuery(event.target.value)}
          />
          <div className="queue-list">
            {roster
              .filter((person) =>
                `${person.firstName} ${person.lastName}`
                  .toLowerCase()
                  .includes(queueQuery.toLowerCase()),
              )
              .map((person, index) => {
                const count = athleteCompletion(person.id);
                return (
                  <button
                    key={person.id}
                    onClick={() => setAthleteId(person.id)}
                    className={person.id === athleteId ? "active" : ""}
                  >
                    <span className="queue-order">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="avatar small">
                      {initials(person.firstName, person.lastName)}
                    </span>
                    <span className="queue-name">
                      <strong>
                        {person.firstName} {person.lastName}
                      </strong>
                      <small>
                        {person.position} · {person.group}
                      </small>
                    </span>
                    <span
                      className={`completion-dot ${count === metrics.length ? "complete" : ""}`}
                    >
                      {count === metrics.length ? (
                        <Check size={13} />
                      ) : (
                        `${count}/${metrics.length}`
                      )}
                    </span>
                  </button>
                );
              })}
          </div>
        </aside>
        <section className="capture-panel" aria-label="Result capture">
          <div className="capture-athlete">
            <div className="avatar">
              {athlete && initials(athlete.firstName, athlete.lastName)}
            </div>
            <div>
              <p className="eyebrow">Now testing</p>
              <h2>
                {athlete?.firstName} {athlete?.lastName}
              </h2>
              <span>
                {athlete?.sport} · {athlete?.position}
              </span>
            </div>
            <button className="button secondary" onClick={nextAthlete}>
              Next athlete
              <ChevronRight size={17} />
            </button>
          </div>
          <div
            className="metric-tabs"
            role="tablist"
            onKeyDown={navigateTabs}
            aria-label="Assessment metrics"
          >
            {metrics.map((item) => {
              const result = measurements.find(
                (m) =>
                  m.sessionId === session.id &&
                  m.athleteId === athleteId &&
                  m.metricId === item.id,
              );
              return (
                <button
                  role="tab"
                  id={`capture-tab-${item.id}`}
                  aria-controls="capture-panel"
                  tabIndex={item.id === metricId ? 0 : -1}
                  aria-selected={item.id === metricId}
                  key={item.id}
                  className={item.id === metricId ? "active" : ""}
                  onClick={() => setMetricId(item.id)}
                >
                  {result?.selectedAttempt !== null &&
                  result?.selectedAttempt !== undefined ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <span className="empty-circle" />
                  )}
                  {item.shortName}
                </button>
              );
            })}
          </div>
          {metric && (
            <section
              className="capture-card"
              role="tabpanel"
              id="capture-panel"
              aria-labelledby={`capture-tab-${metric.id}`}
            >
              <div className="capture-card-head">
                <div>
                  <p className="eyebrow">
                    {metric.direction === "higher"
                      ? "Higher is better"
                      : "Lower is better"}
                  </p>
                  <h2>{metric.name}</h2>
                  <p>
                    Record {metric.attempts} attempt
                    {metric.attempts === 1 ? "" : "s"}. The best valid attempt
                    is selected automatically.
                  </p>
                </div>
                <span className="unit-badge">{metric.unit}</span>
              </div>
              {(saveError || drafts.error) && (
                <Notice tone="warning">
                  <strong>Save failed.</strong> {saveError || drafts.error}
                  <button
                    className="text-button"
                    onClick={() =>
                      metric &&
                      drafts.save(athleteId, metric, [
                        ...drafts.values(athleteId, metric, current),
                      ])
                    }
                  >
                    Retry current result
                  </button>
                  {drafts.failedCell && (
                    <button
                      className="text-button"
                      onClick={() => {
                        setAthleteId(drafts.failedCell![0]);
                        setMetricId(drafts.failedCell![1]);
                      }}
                    >
                      Open unsaved result
                    </button>
                  )}
                </Notice>
              )}
              <div
                className="attempt-grid"
                data-cell={JSON.stringify([athleteId, metric.id])}
              >
                {Array.from({ length: metric.attempts }, (_, index) => (
                  <label key={index}>
                    <span>Attempt {index + 1}</span>
                    <div className="attempt-input">
                      <input
                        aria-label={`${metric.name} attempt ${index + 1}`}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={drafts.values(athleteId, metric, current)[index]}
                        onChange={(e) => saveAttempt(index, e.target.value)}
                        onBlur={() => drafts.reconcile(measurements)}
                      />
                      <small>{metric.unit}</small>
                    </div>
                  </label>
                ))}
              </div>
              {invalid ? (
                <Notice tone="warning">
                  <strong>Check this value.</strong> {metric.name} must be
                  between {metric.validMin} and {metric.validMax} {metric.unit}.
                  This result is saved as invalid until corrected or excluded in
                  review.
                </Notice>
              ) : current?.selectedAttempt !== null &&
                current?.selectedAttempt !== undefined ? (
                (() => {
                  const grade = scoreMetric(
                    metric,
                    current.selectedAttempt,
                    profile
                      ? bandsForMetric(profile, metric.id, metric.bands)
                      : metric.bands,
                  );
                  return (
                    <div className="live-feedback">
                      <div>
                        <span>Selected result</span>
                        <strong>
                          {current.selectedAttempt} {metric.unit}
                        </strong>
                      </div>
                      <div>
                        <span>Live grade</span>
                        <strong>{grade.points} / 4</strong>
                      </div>
                      <StatusPill
                        tone={
                          grade.points >= 3
                            ? "good"
                            : grade.points >= 2
                              ? "ready"
                              : "warning"
                        }
                      >
                        {grade.band.label}
                      </StatusPill>
                      <small>{profile?.name ?? "General profile"}</small>
                    </div>
                  );
                })()
              ) : (
                <Notice>
                  Enter the first attempt to see immediate grading feedback.
                  Valid range: {metric.validMin} to {metric.validMax}{" "}
                  {metric.unit}.
                </Notice>
              )}
              <div className="capture-actions">
                <button
                  className="button secondary"
                  onClick={() => {
                    const missing = metrics.find(
                      (item) =>
                        !measurements.some(
                          (result) =>
                            result.sessionId === session.id &&
                            result.athleteId === athleteId &&
                            result.metricId === item.id &&
                            result.status === "valid" &&
                            result.selectedAttempt !== null,
                        ),
                    );
                    if (missing) setMetricId(missing.id);
                  }}
                >
                  Next missing test
                </button>
                <button className="button secondary" onClick={clearResult}>
                  <RotateCcw size={16} />
                  Clear result
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    const idx = metrics.findIndex((m) => m.id === metricId);
                    setMetricId(metrics[(idx + 1) % metrics.length]?.id ?? "");
                  }}
                >
                  Next metric
                  <ChevronRight size={17} />
                </button>
              </div>
            </section>
          )}
        </section>
        <aside className="results-rail">
          <div className="queue-heading">
            <div>
              <p className="eyebrow">Live grades</p>
              <h2>{athlete?.firstName}</h2>
            </div>
            <strong>
              {liveScores.reduce((sum, score) => sum + score.points, 0)} pts
            </strong>
          </div>
          {liveScores.length ? (
            <div className="live-score-list">
              {liveScores.map((score) => (
                <button
                  key={score.metric.id}
                  onClick={() => setMetricId(score.metric.id)}
                >
                  <div>
                    <strong>{score.metric.shortName}</strong>
                    <span>
                      {score.value} {score.metric.unit}
                    </span>
                  </div>
                  <strong>{score.points}/4</strong>
                </button>
              ))}
            </div>
          ) : (
            <div className="rail-empty">
              <AlertTriangle size={20} />
              <p>Grades appear here as valid results are saved.</p>
            </div>
          )}
          <div className="rail-note">
            <strong>
              {profile?.name ?? "General profile"} · v{version.version}
            </strong>
            <span>Editable starter bands. Not validated population norms.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
