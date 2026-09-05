# Arch Cursor Plugin

Local Cursor Plugin that wraps the Arch theological review API as a single MCP tool (`arch_review`).

**Domain:** `ReviewRequest` to `ReviewResult`
**Endpoint:** `POST https://arch.tnvolman.com/v1/review`
**Auth:** `X-API-Key` from plugin variable / env `ARCH_API_KEY`

This package is a local scaffold for Cursor IDE. It is **not** published to the Cursor marketplace.

## What it does

- One MCP tool: `arch_review` — submit text, get Arch's ReviewResult.
- Skill `arch-review` — when to use Arch for theological / Scripture content.
- Fail closed: missing `ARCH_API_KEY` or non-2xx responses return an error; the server never invents a ReviewResult.

## What it does not wrap

- `/arch/request-access`
- Billing setup / dashboard
- `POST /api/arch/review`
- Admin APIs
- `api.arch.tnvolman.com`

## Configure ARCH_API_KEY

1. Install this directory as a local Cursor plugin (copy into `~/.cursor/plugins/local/arch`).
2. In Cursor: **Plugins then Arch then Configure**.
3. Set **Arch API Key** (`ARCH_API_KEY`).
4. The value is substituted into `mcp.json` as `${ARCH_API_KEY}` and passed to the stdio server env.

For manual smoke tests outside Cursor:

```bash
export ARCH_API_KEY="your-key"
node ./server/index.mjs
```

## Cost

Arch reviews are billed at about **$2 per review** (see `billing_status` / product billing). Idempotent retries use `idempotency_key` (also sent as `Idempotency-Key` header).

## MCP tool: arch_review

**Request (ReviewRequest)**

| Field | Required | Notes |
| --- | --- | --- |
| `text` | yes | string at most 50000 |
| `max_tokens` | no | number, default 1024 |
| `payment_method_id` | no | legacy |
| `idempotency_key` | no | also sets `Idempotency-Key` header |

**Success (ReviewResult fields)**

`review`, `passed`, `suggestions`, `charge_id`, `billing_status`, `meta` (`approved`, `flagged`, `rejected`, `total`, `chars`, `charged`).

## Layout

```text
arch-cursor-plugin/
├── .cursor-plugin/plugin.json
├── mcp.json
├── package.json
├── server/index.mjs
├── skills/arch-review/SKILL.md
├── README.md
└── VERIFY.md
```

## Local prove

See `VERIFY.md` for parse checks, `node --check`, MCP initialize + tools/list smoke, and local install copy.
