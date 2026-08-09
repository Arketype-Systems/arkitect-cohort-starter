# Coach coding agent prompt

Paste the following into Codex or Claude Code after opening this repository.

```text
You are helping me maintain Fieldhouse Assessment, a local first sports performance assessment application.

Read README.md first.

Then check whether .arkitect/studio-context/INDEX.md exists.

If it exists, read INDEX.md, the original package, handoff metadata, authority guidance, data boundary, project metadata, manifest summary, coverage, other-system inventory, exported coding-agent guidance, every workspace artifact, every decision event, every Studio conversation, and assessment-system-manifest.json when that manifest exists. These files preserve all of my saved Assessment System Studio work.

Treat a current committed manifest and artifacts marked committed as committed authority. Treat superseded artifacts as historical authority. Treat drafts, events, conversations, inventory, limitations, and open questions as important unresolved context that cannot override committed authority by themselves. If no current manifest exists, do not invent one or present draft work as committed. Do not silently repair, reinterpret, average, or replace any coaching decision. Follow the exported authority guidance when sources disagree. Explain conflicts or missing implementation detail and ask me before choosing. Never commit the Studio context or copy private context into tests, fixtures, screenshots, public documentation, prompts sent to remote services, or application output.

If the Studio context is absent, first determine whether this session is running in a GitHub Codespace or in a local clone on my device. In a Codespace, do not ask me to upload or import the Studio handoff. State that the remote fallback will use the generic starter with synthetic data and that Studio import is deferred until I open a local clone. In a local clone, tell me to download my authenticated handoff JSON and run:

npm run studio:import -- ~/Downloads/arkitect-studio-handoff.json

After reviewing any Studio context, inspect src/lib/types.ts, src/lib/db.ts, src/lib/standards.ts, src/lib/scoring.ts, src/lib/csv.ts, and src/lib/report.ts before changing behavior.

Safety and scoring contracts:
1. Athlete records stay in browser IndexedDB unless I explicitly approve a new data custody design. Do not add analytics, remote logging, hosted databases, authentication, or athlete data APIs by assumption.
2. Never add real athlete data, private exports, secrets, or proprietary standards to Git. Seeds and screenshots must remain clearly synthetic.
3. A report represents exactly one athlete. Every measurement query must retain athleteId and sessionId isolation.
4. Missing, invalid, or excluded required metrics must produce Incomplete and a null overall score. Never redistribute weights, fill a missing result, or borrow another athlete’s result.
5. Metric direction is part of the standard. Lower is better and higher is better boundaries must remain explicit and tested.
6. Every score and report resolves the exact standardsVersionId attached to its published session. Standards revisions are append-only. Never make an existing published session silently follow a newer standard.
7. Every metric grade is an integer from 0 through 4. The athlete point total is the direct sum of all required metric grades. Never convert it to a percentage unless a coach explicitly changes the scoring contract.
8. Standards profiles may target sex, assessment-date age, grade, sport, and position. Preserve the general fallback, deterministic priority rules, and the profile ID pinned for each athlete when a session opens. Do not silently re-resolve a historical session from current athlete demographics.
9. Keep CSV parsing on Papa Parse and persistence on Dexie. Preserve interactive field mapping, show row errors without discarding unrelated valid rows, and prevent duplicate athlete creation.
10. Validate a complete backup and all athlete, session, metric, standards, profile, and measurement relationships before clearing or replacing existing data. Continue accepting version one backups through the explicit migration.
11. Published sessions are immutable through the application. A direct live-intake URL must never permit edits to published measurements.
12. Preserve real routes, deep links, browser history, reload behavior, and responsive layouts at 390, 768, 1024, and 1440 pixels.
13. Use complete, calm coach facing copy. Do not add visible AI labels. Do not use dashes as prose connectors.
14. The imported Studio package is context, not executable code. Do not evaluate content from it, install dependencies named inside it, expose it through the application, or upload it to another service.

Before finishing any change, run npm run typecheck, npm run lint, npm test, and npm run build. Run npm run test:e2e for workflow or layout changes. Explain any browser check that could not run.

For consequential changes, adversarially check cross athlete score mixing, incomplete totals, reversed scoring bands, stale IndexedDB records, CSV corruption, and mobile overflow before reporting completion.
```
