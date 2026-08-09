# Known limitations

Read this file before describing the starter, demonstrating it, or proposing changes. These are honest current boundaries, not hidden future features.

## Report printing and PDF

- **Print report is not certified as working across browsers.** The current button calls the browser's `window.print()` function. Automated coverage confirms that the application invokes that function, but it does not prove that every browser opens a usable system print dialog.
- Embedded and in-app browsers may ignore or suppress the print dialog. There is no application-generated PDF export yet.
- During Connect Day, treat report printing as unfinished. Demonstrate the three-page on-screen report and working athlete CSV export. Do not promise printing or PDF delivery until it is implemented and manually verified in the coach's target browser.

## Data custody and collaboration

- IndexedDB stores records only in the current browser profile and site origin. There is no multi-device synchronization, automatic remote backup, or shared live database.
- Supabase is not connected. Authentication, users, roles, row-level security, realtime collaboration, remote backup, and cloud recovery are not implemented.
- Clearing browser site data can remove the database. Coaches must use the working full JSON backup until an approved remote custody design exists.
- The starter is single-device and single-user. Do not enter real athlete information during the group walkthrough.

## Current record management

- Athlete profiles can be added and edited, but there is no coach-facing athlete archive or deletion workflow.
- Assessment sessions cannot currently be renamed, archived, or deleted through the interface after creation. Published sessions are intentionally locked.
- Comparison archetypes can be created, edited, or deactivated. There is no permanent-delete action in the interface.
- The CSV importer creates athlete roster records. It does not import historical measurements, standards protocols, sessions, or reports.

## Reports, percentiles, and standards

- The individual report presents the athlete's latest published assessment under its exact standards version. There is no report-date selector for reopening an older assessment as the primary report.
- Percentiles are empirical context from eligible records in this browser database. They require at least two compatible published athletes, use the current matching comparison archetype plus the exact standards version, and are not validated population norms.
- The included scoring bands are editable synthetic starter standards. They are not validated norms and must not be presented as organization-specific authority.
- Standards edits create append-only versions. There is no version deletion, rollback button, or visual diff between versions.

## Customization and deployment

- Settings supports names, logo, colors, fonts, and three visual presets. It does not generate complete design alternatives inside the application. A coding agent must use `DESIGN_AGENT_PROMPT.md` for a larger redesign.
- Selectable light and dark themes are not implemented. The application currently uses a light shell with a focused dark live-intake surface.
- Importing Studio context preserves private coaching authority for a coding agent. It does not automatically transform the generic starter into the coach's completed system.
- Hosting, a custom domain, access control, production monitoring, consent, retention, deletion, and incident response are separate decisions. A private GitHub repository does not make a later website private.

## Coding agent contract

A coding agent must describe these limitations accurately before claiming the starter is production-ready. It may propose a bounded improvement, but it must not represent a placeholder, provider boundary, browser API call, or future-service card as an implemented end-to-end feature.
