# Assessment System 1.1

This release improves the assessment workflow, roster and reports while preserving versioned standards, direct 0 through 4 grading, required-result completeness and local data custody.

## For coaches

- Find athletes in a sortable, paginated table or card view. Save roster views, select a testing group and archive/reactivate athletes without deleting history.
- Open historical assessment reports, compare before/after observations and export a roster summary with an explicit assessment and standards scope.
- Download locally generated PDFs with selectable text, bundled fonts, measured pagination and correct page counts. CSV exports escape quoted text and spreadsheet formulas.
- Capture attempts without database acknowledgments replacing newer typing. Save failures retain the entered text. Separate attempts edited in different tabs preserve both changes.
- Review and publish through transactional checks. A queued write cannot change approved measurements or enter a workspace that another tab has replaced.
- Back up branding and preferences with assessment records. Restore validates shapes, relationships, attempts, profile pins and publication completeness before replacing records.
- Use clearer navigation, readable states, keyboard-accessible dialogs and tabs, a larger standards workspace with a before/after revision summary and visible save status on small screens.

## Verification

The release qualification covers TypeScript, zero-warning lint, unit/route tests, production build, tracked-source privacy checks and Chromium browser cases at 390, 768, 1024 and 1440 widths. Browser tests include automated WCAG A/AA checks, delayed storage, multiple tabs, backup recovery, historical isolation, PDF export, long content and Unicode text. GitHub Actions repeats verification for pull requests and main.

The synthetic default individual, before/after and five-test roster PDFs each fit one Letter page. A long 15-test synthetic report paginates to five pages and retains the final metric text. Physical printer and native system-dialog behavior are not certified by these checks.

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for data custody, supported backup formats, comparison policy, PDF character/accessibility coverage and remaining development-tool advisories.
