import { saveAthlete } from "../lib/athlete-actions";
import { useUnsavedChanges } from "../lib/useUnsavedChanges";
import { isCalendarDate } from "../lib/validation";
import { Search, UserPlus, X, LayoutGrid, List } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, PageHeader, StatusPill } from "../components/ui";
import { db } from "../lib/db";
import { imageFileToDataUrl } from "../lib/images";
import { useData } from "../lib/useData";
import { useReports } from "../lib/useReports";
import { normalizeView, parseSavedViews } from "../lib/workspace-views";
import { displayDate, initials } from "../lib/utils";

export default function AthletesPage() {
  const data = useData();
  const { athletes, sessions, settings } = data;
  const reports = useReports(data);
  const [params, setParams] = useSearchParams();
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const query = params.get("q") ?? "";
  const sport = params.get("sport") ?? "All";
  const group = params.get("group") ?? "All";
  const status = params.get("status") ?? "all";
  const sort = params.get("sort") ?? "name";
  const layout = params.get("layout") ?? "table";
  const archived = params.get("archived") === "yes";
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [viewName, setViewName] = useState("");
  const [viewError, setViewError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  useUnsavedChanges(adding);
  const views = parseSavedViews(
    settings.find((row) => row.key === "roster-views")?.value,
  );
  function change(key: string, value: string) {
    const next = new URLSearchParams(paramsRef.current);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    paramsRef.current = next;
    setParams(next, { replace: true, flushSync: true });
  }
  const sports = [
    ...new Set(athletes.flatMap((athlete) => athlete.sports)),
  ].sort();
  const groups = [...new Set(athletes.map((athlete) => athlete.group))].sort();
  const rows = useMemo(
    () =>
      athletes.map((athlete) => {
        const report = reports.reportFor(athlete);
        const pending = sessions.some(
          (session) =>
            session.status !== "published" &&
            session.athleteIds.includes(athlete.id),
        );
        return {
          athlete,
          report,
          state: pending
            ? "in_progress"
            : !report.latestSession
              ? "no_assessment"
              : report.complete
                ? "published"
                : "incomplete",
        };
      }),
    [athletes, reports, sessions],
  );
  const filtered = rows
    .filter(
      ({ athlete, state }) =>
        Boolean(athlete.archivedAt) === archived &&
        `${athlete.firstName} ${athlete.lastName} ${athlete.sports.join(" ")} ${athlete.positions.join(" ")} ${athlete.grade}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (sport === "All" || athlete.sports.includes(sport)) &&
        (group === "All" || athlete.group === group) &&
        (status === "all" || state === status),
    )
    .sort((a, b) =>
      sort === "date"
        ? (b.report.latestSession?.date ?? "").localeCompare(
            a.report.latestSession?.date ?? "",
          )
        : `${a.athlete.lastName} ${a.athlete.firstName}`.localeCompare(
            `${b.athlete.lastName} ${b.athlete.firstName}`,
          ),
    );
  const pageSize = [25, 50, 100].includes(Number(params.get("size")))
    ? Number(params.get("size"))
    : 50;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(
    pages,
    Math.max(1, Math.floor(Number(params.get("page"))) || 1),
  );
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const toggle = (id: string) =>
    setSelected((prior) =>
      prior.includes(id) ? prior.filter((item) => item !== id) : [...prior, id],
    );
  async function saveView() {
    if (!viewName.trim()) return;
    try {
      await db.settings.put({
        key: "roster-views",
        value: JSON.stringify(
          [
            ...views,
            {
              id: crypto.randomUUID(),
              name: viewName.trim().slice(0, 60),
              params: normalizeView(params),
            },
          ].slice(-30),
        ),
      });
      setViewName("");
      setViewError("");
    } catch (error) {
      setViewError(String(error));
    }
  }
  async function addAthlete(formData: FormData) {
    if (
      formData.get("dateOfBirth") &&
      !isCalendarDate(String(formData.get("dateOfBirth")))
    ) {
      setAddError("Enter a real birth date.");
      return;
    }
    const firstName = String(formData.get("firstName")).trim();
    const lastName = String(formData.get("lastName")).trim();
    if (
      athletes.some(
        (athlete) =>
          athlete.firstName.trim().toLowerCase() === firstName.toLowerCase() &&
          athlete.lastName.trim().toLowerCase() === lastName.toLowerCase() &&
          (!String(formData.get("dateOfBirth")) ||
            athlete.dateOfBirth === String(formData.get("dateOfBirth"))),
      )
    ) {
      setAddError(
        "An athlete with this name already exists. Enter a different birth date to distinguish another person, or review the existing profile.",
      );
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
          : undefined;
      await saveAthlete({
        id: crypto.randomUUID(),
        firstName,
        lastName,
        sex: String(formData.get("sex")) as "female" | "male" | "unspecified",
        dateOfBirth: String(formData.get("dateOfBirth")),
        grade: String(formData.get("grade")).trim(),
        sport,
        position,
        sports: [...new Set([sport, ...additionalSports].filter(Boolean))],
        positions: [
          ...new Set([position, ...additionalPositions].filter(Boolean)),
        ],
        group: String(formData.get("group")).trim(),
        photoDataUrl,
        synthetic: false,
        createdAt: new Date().toISOString(),
      });
      setAdding(false);
      setAddError("");
    } catch (error) {
      setAddError(
        error instanceof Error
          ? error.message
          : "The athlete could not be saved to IndexedDB. Check browser storage access and try again.",
      );
    }
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="Roster"
        title="Athletes"
        description="Find an athlete, review assessment history or prepare your next testing group."
        actions={
          <button className="button primary" onClick={() => setAdding(true)}>
            <UserPlus size={18} />
            Add athlete
          </button>
        }
      />
      <section className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Search athletes"
            placeholder="Search athletes, sports or positions"
            value={query}
            onChange={(event) => change("q", event.target.value)}
          />
        </label>
        <label>
          Sport
          <select
            value={sport}
            onChange={(event) => change("sport", event.target.value)}
          >
            <option>All</option>
            {sports.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Group
          <select
            value={group}
            onChange={(event) => change("group", event.target.value)}
          >
            <option>All</option>
            {groups.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(event) => change("status", event.target.value)}
          >
            <option value="all">All states</option>
            <option value="no_assessment">No published assessment</option>
            <option value="in_progress">In progress</option>
            <option value="published">Published</option>
            <option value="incomplete">Missing required tests</option>
          </select>
        </label>
        <span className="result-count">
          {filtered.length} athlete{filtered.length === 1 ? "" : "s"}
        </span>
      </section>
      <div className="roster-tools">
        <label>
          Sort
          <select
            value={sort}
            onChange={(event) => change("sort", event.target.value)}
          >
            <option value="name">Name</option>
            <option value="date">Last assessment</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={archived}
            onChange={(event) => {
              change("archived", event.target.checked ? "yes" : "");
              setSelected([]);
            }}
          />
          Archived athletes
        </label>
        <div className="view-switch">
          <button
            className="icon-button"
            aria-label="Table view"
            aria-pressed={layout === "table"}
            onClick={() => change("layout", "table")}
          >
            <List size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Card view"
            aria-pressed={layout === "cards"}
            onClick={() => change("layout", "cards")}
          >
            <LayoutGrid size={18} />
          </button>
        </div>
        <button
          className="text-button"
          onClick={() => setParams(new URLSearchParams())}
        >
          Clear filters
        </button>
      </div>
      <details className="saved-views panel">
        <summary>
          Saved roster views{views.length ? ` (${views.length})` : ""}
        </summary>
        <div className="saved-view-controls">
          <label>
            View name
            <input
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              maxLength={60}
            />
          </label>
          <button
            className="button secondary"
            disabled={!viewName.trim()}
            onClick={saveView}
          >
            Save current view
          </button>
        </div>
        {views.map((view) => (
          <div className="saved-view-row" key={view.id}>
            <button
              className="text-button"
              onClick={() => setParams(new URLSearchParams(view.params))}
            >
              {view.name}
            </button>
            <button
              className="text-button"
              aria-label={`Remove saved view ${view.name}`}
              onClick={() =>
                db.settings
                  .put({
                    key: "roster-views",
                    value: JSON.stringify(
                      views.filter((item) => item.id !== view.id),
                    ),
                  })
                  .catch((error) => setViewError(String(error)))
              }
            >
              Remove
            </button>
          </div>
        ))}
        {viewError && <p role="alert">{viewError}</p>}
      </details>
      {selected.length > 0 && (
        <div className="selection-bar">
          <strong>{selected.length} selected</strong>
          {!archived && (
            <Link
              className="button primary"
              to={`/testing/new?athletes=${encodeURIComponent(selected.join(","))}`}
            >
              Start assessment
            </Link>
          )}
          <Link
            className="button secondary"
            to={`/reports/roster?athletes=${encodeURIComponent(selected.join(","))}`}
          >
            Roster report
          </Link>
          <button className="text-button" onClick={() => setSelected([])}>
            Clear selection
          </button>
        </div>
      )}
      {!filtered.length ? (
        <EmptyState
          title={
            athletes.length
              ? "No athletes match this view"
              : "Your roster is ready to begin"
          }
          action={
            <button
              className="button secondary"
              onClick={() => setAdding(true)}
            >
              Add athlete
            </button>
          }
        >
          {athletes.length
            ? "Adjust the filters or clear your search."
            : "Add an athlete or import a roster from Data and backup."}
        </EmptyState>
      ) : layout === "cards" ? (
        <section className="athlete-grid">
          {visibleRows.map(({ athlete, report, state }) => (
            <Link
              className="athlete-card"
              key={athlete.id}
              to={`/athletes/${athlete.id}`}
              state={{ rosterSearch: params.toString() }}
            >
              <div className="avatar">
                {athlete.photoDataUrl ? (
                  <img src={athlete.photoDataUrl} alt="" />
                ) : (
                  initials(athlete.firstName, athlete.lastName)
                )}
              </div>
              <div className="athlete-card-copy">
                <h3>
                  {athlete.firstName} {athlete.lastName}
                </h3>
                <p>
                  {athlete.sports.join(" / ")} · {athlete.group}
                </p>
                <small>
                  {report.latestSession
                    ? displayDate(report.latestSession.date)
                    : "No published assessment"}
                </small>
              </div>
              <div className="athlete-card-score">
                <strong>{report.overall ?? "—"}</strong>
                <span>
                  {report.overall === null
                    ? state.replaceAll("_", " ")
                    : `of ${report.maxPoints} pts`}
                </span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="panel roster-table">
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Athlete roster"
          >
            <table>
              <caption className="visually-hidden">
                Filtered athlete roster
              </caption>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all visible athletes"
                      checked={visibleRows.every((row) =>
                        selected.includes(row.athlete.id),
                      )}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [
                                ...new Set([
                                  ...selected,
                                  ...visibleRows.map((row) => row.athlete.id),
                                ]),
                              ]
                            : selected.filter(
                                (id) =>
                                  !visibleRows.some(
                                    (row) => row.athlete.id === id,
                                  ),
                              ),
                        )
                      }
                    />
                  </th>
                  <th>Athlete</th>
                  <th>Sport / group</th>
                  <th>Last assessment</th>
                  <th>Status</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ athlete, report, state }) => (
                  <tr key={athlete.id}>
                    <td>
                      <input
                        aria-label={`Select ${athlete.firstName} ${athlete.lastName}`}
                        type="checkbox"
                        checked={selected.includes(athlete.id)}
                        onChange={() => toggle(athlete.id)}
                      />
                    </td>
                    <td>
                      <Link
                        to={`/athletes/${athlete.id}`}
                        state={{ rosterSearch: params.toString() }}
                      >
                        <span className="avatar small">
                          {athlete.photoDataUrl ? (
                            <img src={athlete.photoDataUrl} alt="" />
                          ) : (
                            initials(athlete.firstName, athlete.lastName)
                          )}
                        </span>
                        <strong>
                          {athlete.firstName} {athlete.lastName}
                        </strong>
                      </Link>
                      <small>{athlete.position || "Position not set"}</small>
                    </td>
                    <td>
                      {athlete.sports.join(" / ")}
                      <small>{athlete.group}</small>
                    </td>
                    <td>
                      {report.latestSession
                        ? displayDate(report.latestSession.date)
                        : "Not assessed"}
                    </td>
                    <td>
                      <StatusPill
                        tone={state === "published" ? "good" : "neutral"}
                      >
                        {state === "no_assessment"
                          ? "No published assessment"
                          : state.replaceAll("_", " ")}
                      </StatusPill>
                    </td>
                    <td>
                      {report.overall === null
                        ? "—"
                        : `${report.overall}/${report.maxPoints}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {filtered.length > 0 && (
        <div className="pagination">
          <span>
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <label>
            Per page
            <select
              aria-label="Athletes per page"
              value={pageSize}
              onChange={(event) => change("size", event.target.value)}
            >
              {[25, 50, 100].map((size) => (
                <option key={size}>{size}</option>
              ))}
            </select>
          </label>
          <button
            className="button secondary"
            disabled={page <= 1}
            onClick={() => change("page", String(page - 1))}
          >
            Previous
          </button>
          <span>
            {page} / {pages}
          </span>
          <button
            className="button secondary"
            disabled={page >= pages}
            onClick={() => change("page", String(page + 1))}
          >
            Next
          </button>
        </div>
      )}
      {adding && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal athlete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Roster record</p>
                <h2 id="add-title">Add athlete</h2>
                <p>
                  Build the profile used for roster filters and standards
                  matching.
                </p>
              </div>
              <button
                className="icon-button"
                aria-label="Close"
                onClick={() => {
                  setAdding(false);
                  setAddError("");
                }}
              >
                <X />
              </button>
            </div>
            <form action={addAthlete}>
              {addError && (
                <p className="validation-error" role="alert">
                  {addError}
                </p>
              )}
              <section className="form-section">
                <div className="form-section-title">
                  <span>01</span>
                  <div>
                    <strong>Identity</strong>
                    <small>Required roster and demographic fields</small>
                  </div>
                </div>
                <div className="form-grid">
                  <label>
                    First name
                    <input name="firstName" required />
                  </label>
                  <label>
                    Last name
                    <input name="lastName" required />
                  </label>
                  <label>
                    Sex
                    <select name="sex" defaultValue="unspecified">
                      <option value="unspecified">Not specified</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                  </label>
                  <label>
                    Date of birth
                    <input name="dateOfBirth" type="date" />
                  </label>
                  <label>
                    Grade
                    <input name="grade" placeholder="Example: 10" />
                  </label>
                  <label>
                    Training group
                    <input
                      name="group"
                      required
                      placeholder="Example: Varsity"
                    />
                  </label>
                  <label className="wide">
                    Athlete photo
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
                    <input name="sport" required />
                  </label>
                  <label>
                    Primary position
                    <input name="position" />
                  </label>
                  <label>
                    Additional sports
                    <input
                      name="additionalSports"
                      placeholder="Track, Basketball"
                    />
                  </label>
                  <label>
                    Additional positions
                    <input
                      name="additionalPositions"
                      placeholder="Sprinter, Forward"
                    />
                  </label>
                </div>
                <p className="field-help">
                  Separate additional sports and positions with commas. Every
                  value becomes available to standards matching.
                </p>
              </section>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setAdding(false);
                    setAddError("");
                  }}
                >
                  Cancel
                </button>
                <button className="button primary">Add athlete</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
