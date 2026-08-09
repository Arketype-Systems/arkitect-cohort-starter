# Studio handoff package v1

The public starter accepts a coach-authenticated Assessment System Studio export through the local command documented in the README. The importer performs no authentication and makes no network request. Authentication happens when the coach downloads the export from the cohort.

## Envelope

```json
{
  "packageType": "arkitect_studio_handoff",
  "schemaVersion": 1,
  "exportedAt": "ISO 8601 timestamp",
  "committedManifest": {
    "schemaVersion": 1,
    "manifestType": "assessment_system_manifest",
    "sourcePolicy": "committed_versions_only"
  },
  "workspaceArtifacts": [
    {
      "workspace": "safe_workspace_key",
      "artifactId": "UUID",
      "version": 1,
      "committedAt": "ISO 8601 timestamp",
      "payload": {}
    }
  ]
}
```

The manifest and artifact payloads contain additional coach-authored fields. This abbreviated example documents only the transfer envelope. The importer intentionally does not parse, normalize, migrate, or repair those payloads.

## Local output

- `studio-handoff.original.json` preserves the downloaded bytes.
- `assessment-system-manifest.json` preserves the committed manifest as JSON.
- `artifacts/001.json` and subsequent numbered files preserve each complete artifact envelope and payload.
- `INDEX.md` tells a coding agent how to read the context without substituting its own coaching decisions.

The output directory is `.arkitect/studio-context/` and is ignored by Git. A replacement uses a temporary sibling directory and an atomic rename so a failed import does not leave a partial context package.

Unsupported versions fail closed. Workspace labels never become output paths. Symbolic-link inputs and destinations are rejected.
