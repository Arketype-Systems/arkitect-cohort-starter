# Adversarial review

Review date: 2026-08-09

This review covers the public synthetic starter. It is an engineering review, not validation of the included coaching standards.

## Findings and evidence

| Attack | Result | Evidence or correction |
| --- | --- | --- |
| Cross-athlete score mixing | Pass | Report derivation filters the latest published session by athlete ID, then filters measurements by both session ID and athlete ID. Unit fixtures verify every reported value belongs to the report athlete. |
| Cross-cohort percentile mixing | Pass | Percentile peers must share the exact standards version and pinned standards profile. A unit fixture isolates the athlete when every peer is pinned elsewhere. |
| Incomplete total fabrication | Pass | Missing, invalid, or excluded required metrics return `overall: null`. Rankings exclude incomplete totals. Live review prevents publication until required results are valid. |
| Reversed scoring bands | Pass | Standards validation rejects point ladders that conflict with higher-is-better or lower-is-better direction. Boundary and direction fixtures cover both paths. |
| Stale standards mutation | Pass | Focused and full edits both create a new standards ID and patch version. Published sessions retain their original `standardsVersionId` and athlete-to-profile pin. Same-day revisions sort numerically, including 1.0.10 after 1.0.9. |
| Demographic drift | Pass | Standards profiles can target sex, assessment-date age, grade, sport, and position. A session records the resolved profile ID per athlete so later profile edits do not rewrite history. |
| Persistence disconnection | Pass | Athletes, sessions, selected rosters, metrics, attempts, review disposition, publication state, photos, and branding persist in IndexedDB. Browser tests reload live intake and branding. Backup validation rejects broken references before replacement. |
| CSV corruption and duplicates | Pass | Papa Parse handles CSV syntax. Header mapping, fatal header errors, row errors, valid-row preservation, case-insensitive duplicate detection, and export downloads are tested. |
| Report identity leakage | Pass | The three-page report carries one athlete ID throughout and shows its standards version and comparison archetype on every page. Uploaded athlete photos are tested through profile and report. |
| Ranking distortion | Pass | Point rankings include complete published totals only. Raw metric ranking respects scoring direction. Filters cover profile, sex, assessment-date age group, sport, position, and grade. |
| False cloud claims | Pass | The Database and Settings pages state that Supabase is not connected. The provider interface is only an integration boundary. Users, roles, remote backup, realtime, and selectable themes are explicitly marked unconfigured. |
| Branding breaks scoring | Pass | Branding is stored as a separate setting. Browser coverage changes and reloads the brand, then verifies that the athlete point total is unchanged. |
| One-route fakery | Pass | Thirteen route/component fixtures and deep-link browser coverage exercise the application routes, browser history, and reload behavior. Rankings uses URL-stable tabs. |
| Mobile overflow | Pass | Every required and added route is checked for document overflow at 390, 768, 1024, and 1440 pixels. Desktop and mobile captures were visually inspected for the dashboard, live intake, standards, report, rankings, and settings. |
| Secret or private data exposure | Pass | Seeds and screenshots are synthetic. The staged repository privacy scan checks for secret patterns, private warehouse references, and real athlete indicators. |

## Deliberate boundaries

- Supabase, authentication, users, roles, remote backup, realtime collaboration, and selectable light or dark mode are not implemented. The application says so directly.
- The included scoring bands are editable starter standards, not validated population norms.
- Percentiles are empirical same-profile, same-version context. They require at least two eligible athletes and do not change stored measurements or point grades.
- Browser site-data deletion can remove IndexedDB records. Coaches must use the working JSON backup export until a coach-owned cloud custody design is approved and implemented.

## Verification gate

- TypeScript typecheck: passed
- ESLint: passed with zero warnings
- Unit, route, and importer tests: 45 passed
- Production build: passed
- Privacy scan: passed before staging; rerun on staged files before publication
- Playwright workflows and responsive checks: 44 passed across 1440, 1024, 768, and 390 pixel projects
