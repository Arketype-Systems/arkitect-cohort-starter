import type { AssessmentSession } from "../lib/types";
import { displayDate } from "../lib/utils";
// Presentation adapted from TF ReportAsOfControl ac2f244. AMS session IDs are
// explicit, including multiple published assessments on the same date.
export function AssessmentDateControl({
  sessions,
  value,
  onChange,
  label = "Assessment",
  includeLatest = true,
}: {
  sessions: AssessmentSession[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  includeLatest?: boolean;
}) {
  return (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {includeLatest && <option value="">Latest published assessment</option>}
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {displayDate(session.date)} · {session.name}
          </option>
        ))}
      </select>
    </label>
  );
}
