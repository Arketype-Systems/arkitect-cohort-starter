# Fieldhouse Assessment Starter

Fieldhouse is a polished, local first assessment application for sports performance coaches. It manages multi-sport athlete profiles, captures multiple testing attempts, reviews completeness, publishes versioned point totals, imports and exports CSV files, and creates one athlete report at a time.

The included athletes, sessions, results, and standards are clearly labeled synthetic examples. No real athlete data or proprietary performance standards are included.

## Create the repository you own

You need a GitHub account, Git, Node.js 20 or newer, and a coding agent such as Codex or Claude Code. Follow the complete [Connect Day guide](CONNECT_DAY_GUIDE.md) when setting this up for the first time.

1. Sign in to GitHub and open the [Arkitect Cohort Starter](https://github.com/Arketype-Systems/arkitect-cohort-starter).
2. Select **Use this template**, then select **Create a new repository**.
3. Choose your personal GitHub account as the owner. Give the repository a clear name and set it to **Private**.
4. Create the repository. This produces an independent copy that you own. It does not add you to the Arketype Systems organization.
5. Open **Code** in your new repository and copy its HTTPS address.

Then open a terminal or ask your coding agent to run these commands with the address from your repository:

```bash
git clone YOUR_PRIVATE_REPOSITORY_URL
cd YOUR_REPOSITORY_NAME
npm install
npm run dev
```

Open the local address printed in the terminal, normally `http://localhost:5173`.

## Bring in your Studio work

Download your Studio handoff JSON while signed in to the cohort. Place the downloaded file anywhere on your device, then run this command from the repository:

```bash
npm run studio:import -- ~/Downloads/arkitect-studio-handoff.json
```

The command validates the versioned handoff package and writes private local context to `.arkitect/studio-context/`. That directory is ignored by Git. It contains the original package, every saved artifact version, decision events, Studio conversations, project metadata, other-system inventory, authority guidance, the data boundary, and the committed Assessment System Manifest when one exists. It also contains an `INDEX.md` written for your coding agent.

The importer does not sign in to the cohort, call an Arketype service, invent a missing manifest, or alter your coaching decisions. It only reads the authenticated export you downloaded. Run the command again whenever you download a newer handoff. A successful import replaces the previous local context atomically.

After importing, open this repository with Codex or Claude Code and paste the prompt from [COACH_AGENT_PROMPT.md](COACH_AGENT_PROMPT.md). Your coding agent must read `.arkitect/studio-context/INDEX.md` and every linked file before proposing changes.

Do not commit the downloaded handoff or `.arkitect/studio-context/`. These files can contain private program design, standards decisions, conversations, and unresolved Studio work. A coding agent must treat the current committed manifest and committed artifacts as authority. Drafts, superseded versions, events, conversations, and inventory remain important context but do not become committed decisions automatically.

## Data boundary

All athlete data is stored in IndexedDB inside the current browser profile. The application has no remote database, account system, analytics service, or athlete data API. It does not route data through Arkitect or Arketype infrastructure.

Browser storage belongs to the device and browser profile. Clearing site data can erase it. Use **Local database → Export full backup** regularly. A full backup is a JSON file. Roster interchange uses CSV.

## Everyday workflow

1. Open **Athletes** to review or add the roster.
2. Add sex, date of birth, grade, training group, and every relevant sport and position. These fields can resolve different standards profiles.
3. Open **Testing → New session** to select a roster and tests. The matching standards profile is shown for each athlete and pinned to the session.
4. Use live intake to record attempts. The best valid attempt is selected according to scoring direction and saved automatically.
5. Open review. Publication remains locked until all required results are valid.
6. Publish, then open **Reporting** for individual athlete reports and summed point totals. Dashboard charts update from published results.

## CSV import

Open **Local database** and download the athlete template. Upload the completed file to see interactive field mapping and row validation before importing. Standard and common column names map automatically. Other headers can be assigned with the mapping controls. Valid rows can be imported while invalid rows remain visible. Matching first and last names are treated as duplicates without regard to capitalization.

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

`npm run verify` also runs a tracked-file privacy scan. The importer has no user-interface changes, so importing Studio context does not require an additional browser test.

The browser suite starts the development server and checks desktop, tablet, and mobile layouts. Install Chromium once if Playwright requests it:

```bash
npx playwright install chromium
```

## Backup, export, and reset

- **Full backup:** Local database → Export full backup.
- **Full restore:** Local database → Restore full backup. The entire file and every record relationship are validated before any existing data is replaced.
- **Roster CSV:** Local database → Export roster CSV.
- **One athlete result CSV:** Reporting → open an athlete → CSV.
- **Reset:** Local database → Reset demo data. This removes local changes and restores the synthetic demo.

There is intentionally no silent cloud backup. Treat exported JSON files as sensitive when real athletes are entered.

## Scoring contract

The included `Editable U.S. S&C Starter Battery` uses five synthetic performance bands per metric. It demonstrates inches, seconds, and repetitions commonly used in United States strength and conditioning settings. It is not a validated population norm.

- Each metric awards exactly 0, 1, 2, 3, or 4 points and declares whether higher or lower is better.
- An athlete point total is the sum of the five metric grades. The included battery therefore has a maximum of 20 points.
- Boundaries are half open and deterministic.
- Standards profiles can target sex, age range, grade, sport, and position. Blank fields mean any value. Priority resolves intentional overlaps.
- The resolved profile is pinned per athlete when a session opens. Later roster or standards edits cannot silently change that session's scoring contract.
- Every score names both the standards version and standards profile.
- Every required metric must be valid before an overall score exists.
- Missing or excluded required results return **Incomplete**. Weight is never redistributed.
- Reports filter measurements by both athlete ID and session ID. They never borrow another athlete’s result.

Use **Standards → Create version** to create an append-only scoring revision. Add as many audience profiles as needed, then edit the five metric bands inside each profile. Existing sessions and reports remain attached to their exact original version and pinned athlete profile. The editor rejects weight drift, invalid ranges, band gaps, band overlaps, missing fallback profiles, points outside 0 through 4, and points that are reversed for the declared scoring direction. The bundled default remains in `src/lib/standards.ts`; update the explicit fixtures in `src/lib/scoring.test.ts` if a developer intentionally changes that seed.

Metric-specific valid ranges are part of each standards version. Live intake automatically marks an out-of-range selected attempt invalid. Review allows every captured result to be marked Valid, Invalid, or Excluded. Published sessions are locked against further live-entry changes.

## Repository map

- `src/lib/db.ts`: IndexedDB schema, seeding, and reset
- `src/lib/standards.ts`: synthetic starter standard
- `src/lib/scoring.ts`: deterministic scoring
- `src/lib/csv.ts`: CSV parsing, validation, and export
- `src/lib/report.ts`: one athlete report derivation
- `src/pages`: real application routes
- `scripts/studio-handoff.mjs`: versioned, lossless Studio handoff importer
- `.arkitect/studio-context`: private imported coach context, always ignored by Git
- `e2e`: browser, complete create-to-report workflow, reload persistence, publication locking, result disposition, and overflow checks
- `COACH_AGENT_PROMPT.md`: orientation prompt for a coding agent

## Privacy and production use

Do not commit athlete exports, screenshots with real athlete information, or browser database files. Before using this starter with real people, define your consent, access, retention, backup, incident response, and deletion practices. If you introduce hosting or a remote database, treat that as a new data custody decision and document it before writing integration code.
