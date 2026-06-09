# n8n-nodes-runx

Planned n8n community node package for runx.

Clean package name:

```text
@runxhq/n8n-nodes-runx
```

Clean node display name:

```text
Runx
```

This repository intentionally does not publish an npm package yet. A real n8n
Cloud-usable node needs the hosted runx API first:

- `POST /skills/{ref}/run`
- receipt lookup
- scoped, rotatable auth
- non-pausing v1 action behavior

Until that exists, self-hosted n8n can use local runx CLI/MCP dogfood paths, but
that is not the public n8n listing path.

Relevant planning docs:

- https://github.com/runxhq/runx/blob/main/oss/docs/orchestrator-integrations.md
- https://github.com/runxhq/runx/blob/main/plans/adoption-strategy.md
