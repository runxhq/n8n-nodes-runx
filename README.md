# @runxhq/n8n-nodes-runx

Community-node package scaffold for using hosted runx from n8n.

This repository is intentionally publish-blocked for now with `"private": true`
in `package.json`. Do not publish it until the hosted runx API, docs, support
page, test account, and review credentials are ready.

## Package Shape

- npm package: `@runxhq/n8n-nodes-runx`
- n8n node display name: `Runx`
- n8n credential: `Runx API`
- package keyword: `n8n-community-node-package`
- runtime dependencies: none
- initial operations:
  - `Run Skill`: `POST /v1/skills/{owner}/{name}/run` or `POST /v1/skills/{skill}/run`
  - `Get Run`: `GET /v1/runs/{id}`
  - `Get Receipt`: `GET /v1/receipts/{id}`

## Auth Scopes

Use a hosted runx bearer token scoped to the smallest set needed by the
workflow:

- `runs:write` for `Run Skill`
- `runs:read` for `Get Run`
- `receipts:read` for `Get Receipt`

Do not use tokens with `receipts:write`, `signals:write`, or admin scope for
public n8n workflows.

## Local Development

```bash
npm install
npm run build
```

The node is wired for the hosted API. For local dogfood before hosted listing,
use the first-party runx skills in the main repository:

```bash
runx skill skills/n8n-handoff --runner preflight --json \
  --input event_id=evt_n8n_demo_001 \
  --input handoff_audience=n8n:workflow:runx-governed-effect \
  --input execution_context='{"caller":"runx-cli","workflow_ref":"self-hosted-n8n-demo"}' \
  --input payload='{"hello":"workflow"}'
```

## Publish Gate

n8n verification currently requires community nodes to follow the n8n package
structure, publish from GitHub Actions with npm provenance, document usage and
auth, avoid runtime dependencies, and avoid filesystem or environment-variable
access in node code.

Before removing `"private": true`:

- hosted runx base URL is production HTTPS
- public docs explain the three operations above
- test account and scoped connector credential are available
- README links to a runx-owned integration landing page
- `npm run build` passes
- `npm run lint` passes or documented n8n lint issues are fixed

Planning docs:

- https://github.com/runxhq/runx/blob/main/oss/docs/orchestrator-integrations.md
- https://github.com/runxhq/runx/blob/main/plans/adoption-strategy.md
