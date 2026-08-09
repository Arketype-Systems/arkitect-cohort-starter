# Assessment System design agent prompt

Paste this into Codex or Claude Code when you want several visual directions without risking the assessment plumbing.

```text
You are redesigning Assessment System for a sports performance coach.

Read README.md, COACH_AGENT_PROMPT.md, src/lib/branding.ts, src/lib/types.ts, src/lib/db.ts, src/lib/standards.ts, src/lib/scoring.ts, src/lib/report.ts, and every page in src/pages before changing code.

First produce three materially different visual directions using the real application routes and clearly synthetic seeded records. For each direction, show the dashboard, athlete profile, live intake, standards workspace, and individual report at desktop and mobile widths. Treat the directions as presentation concepts. Do not fork, duplicate, mock, replace, or bypass data behavior to make a concept easier.

Every concept must preserve these contracts:

1. IndexedDB remains the active database. Supabase is not connected.
2. Athlete, session, measurement, standards version, and pinned profile IDs remain connected.
3. Reports represent exactly one athlete and never borrow another athlete's measurements.
4. Percentiles use published peers from the same standards profile and version.
5. Missing required tests remain Incomplete with a null point total.
6. Standards revisions remain append-only, whether editing one test or the full protocol.
7. Lower-is-better and higher-is-better scoring remain deterministic and tested.
8. Real routes, deep links, browser history, reload persistence, CSV workflows, backups, and publication locking remain intact.
9. Responsive behavior remains verified at 390, 768, 1024, and 1440 pixels.
10. No real athlete information, secrets, private infrastructure, proprietary standards, or copied branding may enter code, fixtures, or screenshots.

Use Settings and src/lib/branding.ts for identity tokens. Prefer reusable CSS variables and components over page-specific overrides. A coach must be able to replace the organization name, product name, logo, primary color, accent color, shell color, body font, and display font without editing scoring code.

Do not use generic generated copy, decorative gradients, excessive rounded cards, fake activity, fake integrations, or visible AI language. Aim for a credible sports performance operations system. Light technical surfaces are welcome. Live intake may retain a darker instrument surface when it materially improves focus.

Wait for the coach to select a direction before consolidating it into the default application. After implementation run npm run verify and npm run test:e2e, inspect the generated screenshots, and report every gate honestly.
```
