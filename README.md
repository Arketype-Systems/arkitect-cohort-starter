# Fieldhouse Assessment Starter

Fieldhouse is a polished, local first assessment application for sports performance coaches. It manages athletes, captures multiple testing attempts, reviews completeness, publishes versioned scores, imports and exports CSV files, and creates one athlete report at a time.

The included athletes, sessions, results, and standards are clearly labeled synthetic examples. No real athlete data or proprietary performance standards are included.

## Start here

You need Node.js 20 or newer and Git. A coding agent such as Codex or Claude Code can run these commands for you.

```bash
git clone https://github.com/Arketype-Systems/arkitect-cohort-starter.git
cd arkitect-cohort-starter
npm install
npm run dev
```

Open the local address printed in the terminal, normally `http://localhost:5173`.

## Data boundary

All athlete data is stored in IndexedDB inside the current browser profile. The application has no remote database, account system, analytics service, or athlete data API. It does not route data through Arkitect or Arketype infrastructure.

Browser storage belongs to the device and browser profile. Clearing site data can erase it. Use **Local database → Export full backup** regularly. A full backup is a JSON file. Roster interchange uses CSV.

## Everyday workflow

1. Open **Athletes** to review or add the roster.
2. Open **Testing → New session** to select a roster and tests.
3. Use live intake to record attempts. The best valid attempt is selected according to scoring direction and saved automatically.
4. Open review. Publication remains locked until all required results are valid.
5. Publish, then open **Reporting** for individual athlete reports.

## CSV import

Open **Local database** and download the athlete template. Keep the headers unchanged. Upload the completed file to see header mapping and row validation before importing. Valid rows can be imported while invalid rows remain visible. Matching first and last names are treated as duplicates without regard to capitalization.

## Build, test, and verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Run every nonbrowser check together with:

```bash
npm run verify
```

The browser suite starts the development server and checks desktop, tablet, and mobile layouts. Install Chromium once if Playwright requests it:

```bash
npx playwright install chromium
```

## Backup, export, and reset

- **Full backup:** Local database → Export full backup.
- **Roster CSV:** Local database → Export roster CSV.
- **One athlete result CSV:** Reporting → open an athlete → CSV.
- **Reset:** Local database → Reset demo data. This removes local changes and restores the synthetic demo.

There is intentionally no silent cloud backup. Treat exported JSON files as sensitive when real athletes are entered.

## Scoring contract

The included `Editable U.S. S&C Starter Battery` uses five synthetic performance bands per metric. It demonstrates inches, seconds, and repetitions commonly used in United States strength and conditioning settings. It is not a validated population norm.

- Each metric declares whether higher or lower is better.
- Boundaries are half open and deterministic.
- Every score names standards version `1.0.0`.
- Every required metric must be valid before an overall score exists.
- Missing or excluded required results return **Incomplete**. Weight is never redistributed.
- Reports filter measurements by both athlete ID and session ID. They never borrow another athlete’s result.

Edit and version standards in `src/lib/standards.ts`. Change the version whenever a band, unit, direction, required flag, or weight changes. Update the explicit scoring fixtures in `src/lib/scoring.test.ts` at the same time.

## Repository map

- `src/lib/db.ts`: IndexedDB schema, seeding, and reset
- `src/lib/standards.ts`: synthetic starter standard
- `src/lib/scoring.ts`: deterministic scoring
- `src/lib/csv.ts`: CSV parsing, validation, and export
- `src/lib/report.ts`: one athlete report derivation
- `src/pages`: real application routes
- `e2e`: browser, reload, persistence, and overflow checks
- `COACH_AGENT_PROMPT.md`: orientation prompt for a coding agent

## Privacy and production use

Do not commit athlete exports, screenshots with real athlete information, or browser database files. Before using this starter with real people, define your consent, access, retention, backup, incident response, and deletion practices. If you introduce hosting or a remote database, treat that as a new data custody decision and document it before writing integration code.
