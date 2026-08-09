# Studio handoff package v1

The public starter accepts a coach-authenticated Assessment System Studio export through the local command documented in the README. The importer performs no authentication and makes no network request. Authentication happens when the coach downloads the export from the cohort.

## Envelope

```json
{
  "packageType": "arkitect_studio_handoff",
  "schemaVersion": 1,
  "exportedAt": "ISO 8601 timestamp",
  "project": {},
  "committedManifest": null,
  "workspaceArtifacts": [
    {
      "workspace": "safe_workspace_key",
      "artifactId": "UUID",
      "version": 1,
      "status": "draft",
      "committedAt": null,
      "payload": {}
    },
    {
      "workspace": "safe_workspace_key",
      "artifactId": "UUID",
      "version": 2,
      "status": "committed",
      "committedAt": "ISO 8601 timestamp",
      "payload": {}
    }
  ],
  "decisionEvents": [],
  "studioConversations": [],
  "otherSystems": [],
  "authority": {},
  "dataBoundary": {},
  "manifestSummary": null,
  "coverage": {},
  "selectionReason": "cohort_system",
  "codingAgentPrompt": "Read the complete package before changing behavior.",
  "agentIndexMarkdown": "# Optional exported index"
}
```

`committedManifest` is either `null` or the complete manifest object:

```json
{
    "schemaVersion": 1,
    "manifestType": "assessment_system_manifest",
    "sourcePolicy": "committed_versions_only"
}
```

The exact v1 envelope expectations are:

- `packageType` is exactly `arkitect_studio_handoff`.
- `schemaVersion` is exactly `1`.
- `exportedAt` is an ISO 8601 timestamp.
- `project` and `coverage` are opaque objects. `authority` includes nonempty `committedManifest`, `committedArtifacts`, and `draftsAndConversations` guidance. `dataBoundary` includes `containsAthleteRows: false` and a nonempty description. Additional fields remain opaque.
- `committedManifest` is `null` or a schema v1 `assessment_system_manifest` using `committed_versions_only`.
- `manifestSummary` is `null` or an opaque object. It can describe a stale prior manifest even when `committedManifest` is `null`.
- `workspaceArtifacts` is an array containing every saved version. Each entry has a safe workspace key, UUID artifact ID, positive version, `draft`, `committed`, or `superseded` status, and a payload of any JSON type. Draft `committedAt` is `null`. Committed and superseded versions have an ISO 8601 `committedAt`.
- `decisionEvents` and `studioConversations` are arrays of opaque objects.
- `otherSystems` is an array of opaque project objects and forms the other-system inventory.
- `selectionReason` is `committed_manifest`, `cohort_system`, `primary`, or `most_recent`.
- `codingAgentPrompt` is a nonempty string. `agentIndexMarkdown` is an optional string included by the authenticated download route.

The manifest, artifact payloads, events, conversations, project, summaries, coverage, inventory, guidance, and boundary objects contain coach-authored fields beyond this transfer envelope. The importer intentionally does not parse, normalize, migrate, summarize, or repair them.

## Local output

- `studio-handoff.original.json` preserves the downloaded bytes.
- `assessment-system-manifest.json` preserves the committed manifest when one exists. No file is created when the package contains `null`.
- `artifact-catalog.json` records safe workspace keys, versions, statuses, payload hashes, and exact draft-payload matches without copying payload values or private identifiers.
- `artifacts/001.json` and subsequent numbered files preserve each complete artifact envelope and payload.
- `handoff-metadata.json`, `project-metadata.json`, `manifest-summary.json`, `coverage.json`, `decision-events.json`, `studio-conversations.json`, `other-system-inventory.json`, `authority-guidance.json`, and `data-boundary.json` preserve the structured context.
- `coding-agent-prompt.md` and optional `exported-agent-index.md` preserve the platform-authored agent guidance.
- `INDEX.md` links every artifact and context file. It distinguishes committed authority from unresolved drafts and conversations.

The output directory is `.arkitect/studio-context/` and is ignored by Git. A replacement uses a temporary sibling directory and an atomic rename so a failed import does not leave a partial context package.

Unsupported versions fail closed. Workspace labels never become output paths. Symbolic-link inputs and destinations are rejected.

## Agent readiness

Run `npm run studio:status` after importing. The command validates the preserved package and reports only structural state:

- `ready` means `committedManifest` is present.
- `partial` means no committed manifest is present, but at least one workspace artifact is currently committed.
- `foundation` means no committed manifest and no currently committed workspace artifact are present.

The command never prints artifact payloads, coach-authored free text, private identifiers, or parallel-system names. It lists safe workspace keys and version numbers so an agent can establish authority without guessing.

The extracted context files are the normal review surface. `studio-handoff.original.json` is retained as the byte-preserved archive and is not read into an agent context unless a validation or extraction discrepancy must be investigated. This avoids presenting the same complete package twice.

Initial orientation uses progressive retrieval. The agent reads current authority and materially changed drafts first. Superseded artifacts, decision events, conversations, and parallel-system payloads remain available and must be retrieved when a proposed change depends on their rationale, conflict, or scope. This preserves the complete handoff without charging every first turn for unrelated historical material.
