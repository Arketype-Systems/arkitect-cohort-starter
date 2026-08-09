# Connect Day Setup

This guide creates a private GitHub repository that you control, starts the assessment application on your device, imports your complete Assessment System Studio work, and gives that context to your coding agent.

The starter stores athlete records only in the current browser profile. Importing Studio context does not send athlete records or Studio work to Arketype. Do not enter real athlete information during the setup walkthrough.

## What you need

Confirm that you have all four items before the walkthrough begins:

1. A personal GitHub account that you can access.
2. Git and Node.js 20 or newer on your device.
3. Codex or Claude Code installed and signed in.
4. Access to the Arketype cohort if you completed work in Assessment System Studio.

## 1. Create your private repository

1. Open the [Arkitect Cohort Starter](https://github.com/Arketype-Systems/arkitect-cohort-starter) while signed in to GitHub.
2. Select **Use this template**.
3. Select **Create a new repository**.
4. Choose your personal GitHub account as the owner.
5. Enter a clear repository name, such as `my-assessment-system`.
6. Set the repository visibility to **Private**.
7. Select **Create repository**.

The new repository is independent from the public starter and lives under your account. You control its access and history. The starter's [MIT License](LICENSE) permits you to use, modify, distribute, and commercialize the included source. Arketype Systems retains its copyright in the original starter. You keep any rights you already hold in your original additions, while copied, employer-owned, or third-party material keeps its existing terms. You are not joining the Arketype Systems organization or using an organization seat.

## 2. Open your repository on your device

Open **Code** in your new GitHub repository and copy the HTTPS address. In a terminal, run:

```bash
git clone YOUR_PRIVATE_REPOSITORY_URL
cd YOUR_REPOSITORY_NAME
npm install
```

You can also ask Codex or Claude Code to clone the repository and install its dependencies for you.

### Browser fallback when local setup is not ready

Use this fallback only when Git or Node.js cannot be made ready during the walkthrough:

1. Open **Code** in your new private repository.
2. Open **Codespaces**.
3. Select **Create codespace on main**.
4. Wait for the browser workspace to open.
5. Run `npm install` in its terminal.

The codespace opens the same private repository. It does not create a second application or move repository control away from your GitHub account. A codespace runs on GitHub's remote infrastructure rather than on your device. During Connect Day, use it only to inspect the generic starter with synthetic data. Do not upload your Studio handoff to the codespace. Import that file later from a local clone on your device. GitHub may count the session against your personal Codespaces allowance.

## 3. Download your complete Studio handoff

Skip this section if you did not complete Studio work.

1. Sign in to the Arketype cohort.
2. Open any Assessment System Studio workspace.
3. Open the workspace download menu.
4. Select **Complete handoff for a coding agent**.
5. Keep the downloaded JSON file private. It can include your drafts, decisions, conversations, parallel systems, and committed assessment contract.

The handoff contains no structured athlete rows. Coach entered notes and conversations are preserved exactly, so review the file before sharing it with any external service.

## 4. Import Studio into your private local context

Complete this step only from a local clone on your device. If you are using the Codespaces fallback, skip the import during Connect Day. From your local repository directory, run:

```bash
npm run studio:import -- ~/Downloads/arkitect-studio-handoff.json
npm run studio:status
```

Use the actual downloaded filename if your browser changed it. A successful import prints the number of artifact versions and points to:

```text
.arkitect/studio-context/INDEX.md
```

That directory is private, local, and ignored by Git. The importer preserves every active Studio system and every saved version without treating drafts as committed decisions.

The status command reports one of three states. **Ready** means a current committed manifest exists. **Partial** means committed workspace decisions exist without a complete cross-workspace manifest. **Foundation** means no workspace version is currently committed. Partial and Foundation packages remain useful context, but the coding agent must ask before unfinished scoring, reporting, or workflow decisions become application behavior.

Importing makes no network request. Asking Codex or Claude Code to read selected files is a separate disclosure to that provider under your account and its terms. Review the export first. Structured athlete rows are excluded, but coach-entered free text may still be sensitive.

## 5. Give the repository to your coding agent

Open the repository in Codex or Claude Code. Then paste the prompt from [COACH_AGENT_PROMPT.md](COACH_AGENT_PROMPT.md). Codex is the path demonstrated in the August 9 handoff rehearsal. If this is the Codespaces fallback, tell the coding agent that it must use the generic starter with synthetic data and must not request or import the Studio handoff.

For the first turn, ask the coding agent to orient before editing:

```text
Read COACH_AGENT_PROMPT.md and follow it. Read .arkitect/studio-context/INDEX.md when it exists. Before changing source, summarize the application features that already work, my current committed assessment authority, unresolved drafts and decisions, and parallel systems. Then propose the smallest useful first improvement and wait for my approval.
```

The current committed manifest is authoritative when one exists. Drafts, conversations, decision history, and parallel systems remain important context, but they do not silently replace committed scoring rules.

## 6. Start and inspect the application

Run:

```bash
npm run dev
```

Open the local address printed in the terminal, normally `http://localhost:5173`. Walk through the application with synthetic data:

1. Review the athlete roster.
2. Create a testing session.
3. Record and review synthetic results.
4. Publish the session.
5. Open an athlete report.
6. Review standards and local backup controls.

## 7. Save a coding agent change

After approving a change, ask the coding agent to run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The coding agent should explain the changed files and verification results, then commit and push the reviewed change to your private GitHub repository.

## What happens after Connect Day

The application works locally before it is hosted. Hosting, a custom domain, authentication, and a remote database are separate decisions. A private GitHub repository does not make a deployed website private. A standard deployment can be publicly reachable until access controls are configured. Do not connect real athlete data to a hosted service until you understand who controls the database, access, retention, backup, and deletion.

## Fast troubleshooting

- If GitHub does not show **Use this template**, confirm that you opened the public Arketype Systems starter rather than another coach's copy.
- If `node` is not found, install the current Node.js long term support release, then reopen the terminal.
- If the Studio import cannot find the file, drag the downloaded JSON into the terminal after `npm run studio:import -- ` to insert its exact path.
- If the importer rejects the package, keep the JSON private and continue with the generic starter. Do not bypass validation by asking an agent to inspect the raw package directly during the group call.
- If the coding agent cannot see Studio context, confirm that `.arkitect/studio-context/INDEX.md` exists and ask it to read that file first.
- If the local page does not open, keep the terminal running and use the exact address printed after `npm run dev`.
