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
- `artifacts/001.json` and subsequent numbered files preserve each complete artifact envelope and payload.
- `handoff-metadata.json`, `project-metadata.json`, `manifest-summary.json`, `coverage.json`, `decision-events.json`, `studio-conversations.json`, `other-system-inventory.json`, `authority-guidance.json`, and `data-boundary.json` preserve the structured context.
- `coding-agent-prompt.md` and optional `exported-agent-index.md` preserve the platform-authored agent guidance.
- `INDEX.md` links every artifact and context file. It distinguishes committed authority from unresolved drafts and conversations.

The output directory is `.arkitect/studio-context/` and is ignored by Git. A replacement uses a temporary sibling directory and an atomic rename so a failed import does not leave a partial context package.

Unsupported versions fail closed. Workspace labels never become output paths. Symbolic-link inputs and destinations are rejected.
