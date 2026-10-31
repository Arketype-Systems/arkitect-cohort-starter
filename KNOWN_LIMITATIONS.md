# Known limitations

Read this file before demonstrating or customizing the starter. Implemented behavior is described in README.md. These boundaries remain deliberate.

## Local data and access

Records belong to this browser profile and site origin. There is no multi-device synchronization, remote athlete database, account system, role management, remote backup or athlete data API. A hosted copy serves the application; it does not upload the browser database. Switching addresses or browsers opens a different local database. Export a full backup before moving records.

Clearing site data can remove records. Full JSON backup includes athletes, assessments, measurements, standards, comparison definitions, import history, branding and saved preferences. Formats 1 through 3 migrate explicitly; legacy backups did not contain branding or preferences. Current backups use format 6. Formats 4 and 5 belonged to unpublished experiments and are rejected rather than misread.

Use synthetic examples during the group walkthrough. Hosting, source access and athlete-data custody are different concerns. A private repository does not make a deployed site private. Any future remote data service needs a separate, coach-approved custody and access design.

## Reports and comparison

Individual reports can select any published assessment belonging to that athlete. Before/after reports retain both dates' original grades. A raw delta is shown only for the exact same standards version and collection definition. Different versions remain visible without a calculated change. There is no coach override declaring different versions comparable and no automatic meaningful-change threshold or training prescription.

Percentiles require at least two eligible observations. They use current athlete tags and current comparison definitions, with the latest compatible published result through the report's assessment date. They are not frozen historical peer snapshots or validated population norms. Archive preserves published observations and does not erase historical peer data.

Roster reports use one explicit standards version, with either a selected assessment or the latest published result in that version through a chosen date. Dates are displayed. Different testing dates are not represented as simultaneous observations. Missing results and athletes without results remain explicit. The PDF repeats identity columns when a battery spans multiple column groups.

## PDF and printing

Application-generated PDF download uses selectable text, bundled local fonts, measured pagination and actual page counts. Individual, before/after, roster and long-content exports are covered by Chromium browser tests and rendered-page inspection. These PDFs do not duplicate every on-screen photograph or chart, and they are not tagged accessible PDFs. Noto Sans covers Latin, Greek and Cyrillic. Unsupported characters produce an explicit export error with the browser-print alternative.

Native Print report uses the browser print API. System print dialogs, physical printers, Safari and Firefox are not certified by Chromium automation. Embedded browsers can suppress print dialogs. Use Download PDF when the native dialog is unavailable.

## Record management

Athletes can be added, edited, archived and reactivated. Archiving keeps assessment history. There is no general permanent-delete interface for an individual athlete. Starting an empty workspace removes roster/assessment/import records while keeping configuration. Reset demo replaces the workspace with examples. Export a backup before either action.

Same-name people can have distinct birth dates and IDs. The interface and importer flag ambiguous or exact identity matches for review; they do not automatically merge people. The CSV importer creates roster records only. It does not import historical measurements, sessions or standards.

Assessment sessions cannot be renamed, archived or deleted after creation through the normal interface. Published sessions remain locked. Direct developer access to IndexedDB is not an authentication or tamper-proof security boundary.

## Standards and customization

Starter bands are editable synthetic examples, not validated norms. Standards revisions are append-only and historical sessions keep their original profile/version. The editor shows audience impact and provides a larger protocol workspace. The revision summary compares edited fields and profile bands before saving. A version rollback is not implemented.

Branding supports organization/product names, local logos, colors, fonts and three presets. Selectable light/dark themes are not implemented; testing uses a focused dark surface. Arbitrary custom brand colors still need visual and contrast review. Automated accessibility checks do not replace a complete human accessibility assessment.

Importing Studio context preserves coaching authority for a coding agent. It does not automatically turn a generic starter into a completed personalized system. Private context stays inside the ignored .arkitect directory and must never be shipped with the app.

## Dependency review

The release upgrades the vulnerable test-worker chain and applies compatible dependency fixes. The production-only npm audit reports no advisories at the release check. Development tooling still has moderate minimatch-related advisories without a compatible upstream fix. Do not describe the full development dependency tree as advisory-free or use a forced cross-major override without qualification.
